import { createServerFn } from '@tanstack/react-start';
import { z } from 'zod';
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware';
import { BULK_ACTIONS, BULK_MAX, CARD_ACTIONS, SAFE_VALUE, checkCardAction } from './card-actions';
import { checkPackage, PKG_NAME } from './packages';
import { isOnline } from './router-script';

/**
 * Queues one fixed action on one card. The router's own script runs it on its next report (about 30 seconds).
 * Refused when the router is offline, so nothing changes hours later by surprise.
 */
export const requestCardAction = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ routerId: z.string().uuid(), source: z.enum(['hotspot', 'usermanager']), name: z.string().max(64), action: z.enum(CARD_ACTIONS), value: z.string().max(64).optional() }).parse(i))
  .handler(async ({ data, context }) => {
    const { data: r } = await context.supabase.from('routers').select('id, last_seen_at').eq('id', data.routerId).maybeSingle();
    if (!r) return { ok: false as const, error: 'no_router' as const };
    if (!isOnline(r.last_seen_at)) return { ok: false as const, error: 'offline' as const };
    const { data: card } = await context.supabase.from('router_cards').select('name, profile').eq('router_id', data.routerId).eq('source', data.source).eq('name', data.name).maybeSingle();
    if (!card) return { ok: false as const, error: 'missing' as const };
    // Renew sends the card's package as we know it; the router uses its own record first.
    const value = data.action === 'renew' ? (card.profile && SAFE_VALUE.test(card.profile) ? card.profile : '-') : data.value;
    if (data.action === 'renew' && data.source === 'usermanager' && value === '-') return { ok: false as const, error: 'no_package' as const };
    const bad = checkCardAction({ ...data, value });
    if (bad) return { ok: false as const, error: bad };
    if (data.action === 'name') {
      const { data: taken } = await context.supabase.from('router_cards').select('name').eq('router_id', data.routerId).eq('source', data.source).eq('name', data.value!).maybeSingle();
      if (taken) return { ok: false as const, error: 'exists' as const };
    }
    const { supabaseAdmin } = await import('@/integrations/supabase/client.server');
    const since = new Date(Date.now() - 5 * 60_000).toISOString();
    const { data: open } = await supabaseAdmin.from('router_jobs').select('id, payload').eq('router_id', data.routerId).in('kind', ['card_action', 'card_bulk']).in('status', ['pending', 'sent']).gte('requested_at', since);
    if ((open ?? []).some((j) => { const p = j.payload as { name?: string; names?: string[] }; return p?.name === data.name || p?.names?.includes(data.name); })) return { ok: false as const, error: 'busy' as const };
    const payload = { source: data.source, action: data.action, name: data.name, ...(value ? { value } : {}) };
    const { data: job, error } = await supabaseAdmin.from('router_jobs').insert({ router_id: data.routerId, owner_id: context.userId, kind: 'card_action', payload }).select('id').single();
    if (error || !job) return { ok: false as const, error: 'error' as const };
    return { ok: true as const, id: job.id };
  });

/** Turns off, turns on or removes several cards of one router in one task (at most 40, safe names only). */
export const requestBulkAction = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ routerId: z.string().uuid(), source: z.enum(['hotspot', 'usermanager']), action: z.enum(BULK_ACTIONS), names: z.array(z.string().max(64)).min(1).max(BULK_MAX) }).parse(i))
  .handler(async ({ data, context }) => {
    const { data: r } = await context.supabase.from('routers').select('id, last_seen_at').eq('id', data.routerId).maybeSingle();
    if (!r) return { ok: false as const, error: 'no_router' as const };
    if (!isOnline(r.last_seen_at)) return { ok: false as const, error: 'offline' as const };
    const names = [...new Set(data.names.filter((n) => SAFE_VALUE.test(n)))];
    if (!names.length) return { ok: false as const, error: 'bad_name' as const };
    const { supabaseAdmin } = await import('@/integrations/supabase/client.server');
    const { data: job, error } = await supabaseAdmin.from('router_jobs').insert({ router_id: data.routerId, owner_id: context.userId, kind: 'card_bulk', payload: { source: data.source, action: data.action, names } }).select('id').single();
    if (error || !job) return { ok: false as const, error: 'error' as const };
    return { ok: true as const, id: job.id, sent: names.length, skipped: data.names.length - names.length };
  });

const Pkg = z.object({
  routerId: z.string().uuid(), source: z.enum(['hotspot', 'usermanager']), action: z.enum(['add', 'edit', 'del']), name: z.string().max(32),
  price: z.number().int().optional(), sell: z.number().int().optional(), devices: z.number().int().optional(),
  downKbps: z.number().int().optional(), upKbps: z.number().int().optional(),
  validityS: z.number().int().optional(), uptimeS: z.number().int().optional(), dataMB: z.number().int().optional(),
});

/** Adds, edits or removes one package on one router. A package that still has cards is never removed. */
export const requestPackage = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => Pkg.parse(i))
  .handler(async ({ data, context }) => {
    const { routerId, ...p } = data;
    const bad = checkPackage(p);
    if (bad) return { ok: false as const, error: bad };
    const { data: r } = await context.supabase.from('routers').select('id, last_seen_at, ros_version, last_status').eq('id', routerId).maybeSingle();
    if (!r) return { ok: false as const, error: 'no_router' as const };
    if (!isOnline(r.last_seen_at)) return { ok: false as const, error: 'offline' as const };
    if (p.source === 'usermanager' && (r.last_status as { umi?: string } | null)?.umi?.split(',')[0] !== 'pkg') return { ok: false as const, error: 'no_um' as const };
    const { data: existing } = await context.supabase.from('router_profiles').select('name').eq('router_id', routerId).eq('source', p.source).eq('name', p.name).maybeSingle();
    if (p.action === 'add' && existing) return { ok: false as const, error: 'exists' as const };
    if (p.action !== 'add' && !existing) return { ok: false as const, error: 'missing' as const };
    if (p.action === 'del') {
      const { count } = await context.supabase.from('router_cards').select('name', { count: 'exact', head: true }).eq('router_id', routerId).eq('source', p.source).eq('profile', p.name);
      if (count) return { ok: false as const, error: 'in_use' as const, count };
    }
    if (!PKG_NAME.test(p.name)) return { ok: false as const, error: 'bad_name' as const };
    const { supabaseAdmin } = await import('@/integrations/supabase/client.server');
    const since = new Date(Date.now() - 5 * 60_000).toISOString();
    const { data: open } = await supabaseAdmin.from('router_jobs').select('id').eq('router_id', routerId).eq('kind', 'package').in('status', ['pending', 'sent']).gte('requested_at', since);
    if ((open ?? []).length) return { ok: false as const, error: 'busy' as const };
    const { data: job, error } = await supabaseAdmin.from('router_jobs').insert({ router_id: routerId, owner_id: context.userId, kind: 'package', payload: p }).select('id').single();
    if (error || !job) return { ok: false as const, error: 'error' as const };
    return { ok: true as const, id: job.id };
  });
