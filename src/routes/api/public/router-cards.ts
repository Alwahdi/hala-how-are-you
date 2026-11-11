import { createFileRoute } from '@tanstack/react-router';
import { z } from 'zod';
import { hashToken } from '@/lib/router-script';
import { mapHotspotUser, mapUmUser, storeCards, storeProfilesFor, type CardIn } from '@/lib/router-sync';

const Body = z.object({ source: z.enum(['hotspot', 'usermanager', 'hotspot-profiles', 'usermanager-profiles']), page: z.number().int().min(0).max(2000), done: z.boolean(), rows: z.array(z.array(z.string().max(200)).max(12)).max(60) });

// Card batches pushed by the router's mikro-cards / mikro-um scripts (routers behind NAT).
export const Route = createFileRoute('/api/public/router-cards')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const token = request.headers.get('x-mikro-token') ?? '';
        if (!/^[a-f0-9]{48}$/.test(token)) return new Response('unauthorized', { status: 401 });
        const raw = await request.text();
        if (raw.length > 32000) return new Response('too large', { status: 413 });
        let parsed;
        try { parsed = Body.safeParse(JSON.parse(raw)); } catch { return new Response('bad json', { status: 400 }); }
        if (!parsed.success) return new Response('bad body', { status: 400 });
        const { supabaseAdmin } = await import('@/integrations/supabase/client.server');
        const { data: router } = await supabaseAdmin.from('routers').select('id').eq('token_hash', await hashToken(token)).maybeSingle();
        if (!router) return new Response('unauthorized', { status: 401 });
        const { source: kind, rows, done } = parsed.data;
        if (kind === 'hotspot-profiles' || kind === 'usermanager-profiles') {
          const src = kind === 'hotspot-profiles' ? 'hotspot' as const : 'usermanager' as const;
          await storeProfilesFor(supabaseAdmin, router.id, src, rows.map((r) => src === 'hotspot'
            ? { source: src, name: r[0] ?? '', rate_limit: r[1] || null, shared_users: r[2] || null, validity: r[3] || null }
            : { source: src, name: r[0] ?? '', rate_limit: null, shared_users: null, validity: r[2] || null, price: r[3] || null }).filter((p) => p.name));
          return new Response('ok');
        }
        const source = kind;
        const cards = rows.map((r) => source === 'hotspot'
          ? mapHotspotUser({ name: r[0] ?? '', profile: r[1] ?? '', uptime: r[2] ?? '', 'bytes-in': r[3] ?? '', 'bytes-out': r[4] ?? '', 'limit-uptime': r[5] ?? '', 'limit-bytes-total': r[6] ?? '', disabled: r[7] ?? '', comment: r[8] ?? '', pw: r[9] ?? '' })
          : mapUmUser({ name: r[0] ?? '', group: r[1] ?? '', disabled: r[2] ?? '', comment: r[3] ?? '', pw: r[4] ?? '' })).filter((c): c is CardIn => !!c);
        // A full run takes seconds and repeats every 5 minutes, so rows untouched for 2 minutes at the end of a run were removed on the router.
        await storeCards(supabaseAdmin, router.id, source, cards, done ? new Date(Date.now() - 120_000).toISOString() : undefined);
        if (done) await supabaseAdmin.from('routers').update({ cards_synced_at: new Date().toISOString() }).eq('id', router.id);
        return new Response('ok');
      },
    },
  },
});
