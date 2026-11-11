import { createServerFn } from '@tanstack/react-start';
import { z } from 'zod';
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware';
import { b64u, vapidKeys } from './web-push';
import { cardsToClean } from './watch-rules';

/** Public VAPID key the browser needs to subscribe. */
export const getPushKey = createServerFn({ method: 'GET' }).handler(async () => {
  const seed = process.env['VAPID_SEED'];
  if (!seed) return { key: null };
  return { key: b64u((await vapidKeys(seed)).publicKey) };
});

const B64U = z.string().regex(/^[A-Za-z0-9_-]+$/).max(200);
export const savePushSubscription = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ endpoint: z.string().url().max(800).startsWith('https://'), p256dh: B64U, auth: B64U, userAgent: z.string().max(200).optional() }).parse(i))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import('@/integrations/supabase/client.server');
    const { error } = await supabaseAdmin.from('push_subscriptions').upsert({ endpoint: data.endpoint, owner_id: context.userId, p256dh: data.p256dh, auth: data.auth, user_agent: data.userAgent ?? null });
    await supabaseAdmin.from('alert_prefs').upsert({ owner_id: context.userId }, { onConflict: 'owner_id', ignoreDuplicates: true });
    return { ok: !error };
  });

/** Phone check: is this device's subscription the one we push to? */
export const checkPushSubscription = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ endpoint: z.string().url().max(800) }).parse(i))
  .handler(async ({ data, context }) => {
    const { data: rows } = await context.supabase.from('push_subscriptions').select('endpoint').eq('owner_id', context.userId);
    return { known: (rows ?? []).some((r) => r.endpoint === data.endpoint), devices: rows?.length ?? 0 };
  });

export const sendTestAlert = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ ar: z.boolean() }).parse(i))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import('@/integrations/supabase/client.server');
    const { notify } = await import('./notify.server');
    const r = await notify(supabaseAdmin, { owner: context.userId, kind: 'test', key: `test:${Date.now()}`, title: data.ar ? 'التنبيهات شغالة ✓' : 'Alerts are working ✓', body: data.ar ? 'هكذا يصلك أي تنبيه مهم عن شبكتك.' : 'This is how important network alerts reach you.', severity: 'ok' });
    return { sent: r.sent };
  });

/** Queues a restart. The router picks it up on its next report (within 30 seconds). Never automatic. */
export const requestReboot = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ id: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    const { data: r } = await context.supabase.from('routers').select('id').eq('id', data.id).maybeSingle();
    if (!r) return { ok: false as const };
    const { supabaseAdmin } = await import('@/integrations/supabase/client.server');
    const { data: open } = await supabaseAdmin.from('router_jobs').select('id').eq('router_id', data.id).eq('kind', 'reboot').in('status', ['pending', 'sent']).gte('requested_at', new Date(Date.now() - 10 * 60_000).toISOString()).limit(1).maybeSingle();
    if (open) return { ok: true as const };
    await supabaseAdmin.from('router_jobs').insert({ router_id: data.id, owner_id: context.userId, kind: 'reboot' });
    await supabaseAdmin.from('router_events').insert({ router_id: data.id, owner_id: context.userId, kind: 'reboot_requested' });
    return { ok: true as const };
  });

/** Queues removal of every used-up Hotspot card on a router (batches of 40). The router re-checks each card first. */
export const requestRemoveFinished = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ id: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    const { data: cards } = await context.supabase.from('router_cards').select('name, source, finished_at').eq('router_id', data.id).not('finished_at', 'is', null).limit(2000);
    const names = cardsToClean(cards ?? [], 0);
    if (!names.length) return { ok: true as const, queued: 0 };
    const { supabaseAdmin } = await import('@/integrations/supabase/client.server');
    const rows = Array.from({ length: Math.ceil(names.length / 40) }, (_, i) => ({ router_id: data.id, owner_id: context.userId, kind: 'remove_cards', payload: { names: names.slice(i * 40, i * 40 + 40) } }));
    await supabaseAdmin.from('router_jobs').insert(rows);
    return { ok: true as const, queued: names.length };
  });
