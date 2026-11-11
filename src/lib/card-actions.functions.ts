import { createServerFn } from '@tanstack/react-start';
import { z } from 'zod';
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware';
import { CARD_ACTIONS, checkCardAction } from './card-actions';
import { isOnline } from './router-script';

/**
 * Queues one fixed action on one card. The router's own script runs it on its next report (about 30 seconds).
 * Refused when the router is offline, so nothing changes hours later by surprise.
 */
export const requestCardAction = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ routerId: z.string().uuid(), source: z.enum(['hotspot', 'usermanager']), name: z.string().max(64), action: z.enum(CARD_ACTIONS), value: z.string().max(64).optional() }).parse(i))
  .handler(async ({ data, context }) => {
    const bad = checkCardAction(data);
    if (bad) return { ok: false as const, error: bad };
    const { data: r } = await context.supabase.from('routers').select('id, last_seen_at').eq('id', data.routerId).maybeSingle();
    if (!r) return { ok: false as const, error: 'no_router' as const };
    if (!isOnline(r.last_seen_at)) return { ok: false as const, error: 'offline' as const };
    const { data: card } = await context.supabase.from('router_cards').select('name').eq('router_id', data.routerId).eq('source', data.source).eq('name', data.name).maybeSingle();
    if (!card) return { ok: false as const, error: 'missing' as const };
    if (data.action === 'name') {
      const { data: taken } = await context.supabase.from('router_cards').select('name').eq('router_id', data.routerId).eq('source', data.source).eq('name', data.value!).maybeSingle();
      if (taken) return { ok: false as const, error: 'exists' as const };
    }
    const { supabaseAdmin } = await import('@/integrations/supabase/client.server');
    const since = new Date(Date.now() - 5 * 60_000).toISOString();
    const { data: open } = await supabaseAdmin.from('router_jobs').select('id, payload').eq('router_id', data.routerId).eq('kind', 'card_action').in('status', ['pending', 'sent']).gte('requested_at', since);
    if ((open ?? []).some((j) => (j.payload as { name?: string })?.name === data.name)) return { ok: false as const, error: 'busy' as const };
    const payload = { source: data.source, action: data.action, name: data.name, ...(data.value ? { value: data.value } : {}) };
    const { data: job, error } = await supabaseAdmin.from('router_jobs').insert({ router_id: data.routerId, owner_id: context.userId, kind: 'card_action', payload }).select('id').single();
    if (error || !job) return { ok: false as const, error: 'error' as const };
    return { ok: true as const, id: job.id };
  });
