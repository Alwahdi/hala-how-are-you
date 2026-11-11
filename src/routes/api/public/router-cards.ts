import { createFileRoute } from '@tanstack/react-router';
import { z } from 'zod';
import { hashToken } from '@/lib/router-script';
import { cardFromRow, mapSessionRow, profileFromRow, storeCards, storeProfilesFor, storeSessionsFor, type CardIn, type ProfileIn, type SessionIn } from '@/lib/router-sync';

const SOURCES = ['hotspot', 'usermanager', 'hotspot-profiles', 'usermanager-profiles', 'hotspot-sessions', 'usermanager-sessions', 'usermanager-links'] as const;
const Body = z.object({ source: z.enum(SOURCES), page: z.number().int().min(0).max(2000), done: z.boolean(), rows: z.array(z.array(z.string().max(300)).max(12)).max(60) });

// Card batches pushed by the router's mikro-cards / mikro-um scripts (routers behind NAT).
export const Route = createFileRoute('/api/public/router-cards')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const token = request.headers.get('x-mikro-token') ?? '';
        if (!/^[a-f0-9]{48}$/.test(token)) return new Response('unauthorized', { status: 401 });
        const raw = await request.text();
        if (raw.length > 40000) return new Response('too large', { status: 413 });
        let parsed;
        try { parsed = Body.safeParse(JSON.parse(raw)); } catch { return new Response('bad json', { status: 400 }); }
        if (!parsed.success) return new Response('bad body', { status: 400 });
        const { supabaseAdmin } = await import('@/integrations/supabase/client.server');
        const { data: router } = await supabaseAdmin.from('routers').select('id').eq('token_hash', await hashToken(token)).maybeSingle();
        if (!router) return new Response('unauthorized', { status: 401 });
        const { source: kind, rows, done } = parsed.data;
        // A full run takes seconds and repeats every 5 minutes, so rows untouched for 2 minutes at the end of a run are gone on the router.
        const cutoff = done ? new Date(Date.now() - 120_000).toISOString() : undefined;
        if (kind === 'hotspot-profiles' || kind === 'usermanager-profiles') {
          const src = kind === 'hotspot-profiles' ? 'hotspot' as const : 'usermanager' as const;
          await storeProfilesFor(supabaseAdmin, router.id, src, rows.map((r) => profileFromRow(src, r)).filter((p): p is ProfileIn => !!p));
          return new Response('ok');
        }
        if (kind === 'hotspot-sessions' || kind === 'usermanager-sessions') {
          const src = kind === 'hotspot-sessions' ? 'hotspot' as const : 'usermanager' as const;
          await storeSessionsFor(supabaseAdmin, router.id, src, rows.map((r) => mapSessionRow(src, r)).filter((s): s is SessionIn => !!s), cutoff);
          return new Response('ok');
        }
        if (kind === 'usermanager-links') {
          // v7: user,profile,state. A card can have several; the running one wins, then waiting, then used.
          const rank = (st: string) => (st.startsWith('running') ? 3 : st === 'waiting' ? 2 : 1);
          const best = new Map<string, { profile: string; state: string }>();
          for (const r of rows) { if (!r[0]) continue; const cur = best.get(r[0]); if (!cur || rank(r[2] ?? '') > rank(cur.state)) best.set(r[0], { profile: r[1] ?? '', state: r[2] ?? '' }); }
          for (const [name, v] of best) await supabaseAdmin.from('router_cards').update({ profile: v.profile || null, um_state: v.state || null }).eq('router_id', router.id).eq('source', 'usermanager').eq('name', name);
          return new Response('ok');
        }
        const cards = rows.map((r) => cardFromRow(kind, r)).filter((c): c is CardIn => !!c);
        await storeCards(supabaseAdmin, router.id, kind, cards, cutoff);
        if (done) await supabaseAdmin.from('routers').update({ cards_synced_at: new Date().toISOString() }).eq('id', router.id);
        return new Response('ok');
      },
    },
  },
});
