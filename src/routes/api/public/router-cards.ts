import { createFileRoute } from '@tanstack/react-router';
import { z } from 'zod';
import { hashToken } from '@/lib/router-script';
import { cardFromRow, mapSessionRow, profileFromRow, storeCards, storeProfilesFor, storeSessionsFor, type CardIn, type ProfileIn, type SessionIn } from '@/lib/router-sync';
import { parseRosDate, tzSeconds } from '@/lib/ros-date';
import { nextRun, type CardRuns } from '@/lib/card-runs';

const SOURCES = ['hotspot', 'usermanager', 'hotspot-profiles', 'usermanager-profiles', 'hotspot-sessions', 'usermanager-sessions', 'usermanager-links'] as const;
const Body = z.object({ source: z.enum(SOURCES), page: z.number().int().min(0).max(2000), done: z.boolean(), rows: z.array(z.array(z.string().max(300)).max(12)).max(120) });

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
        const { data: router } = await supabaseAdmin.from('routers').select('id, last_status, card_runs').eq('token_hash', await hashToken(token)).maybeSingle();
        if (!router) return new Response('unauthorized', { status: 401 });
        const { source: kind, rows, done, page } = parsed.data;
        const tz = tzSeconds((router.last_status as { tz?: string } | null)?.tz);
        if (kind === 'hotspot-profiles' || kind === 'usermanager-profiles') {
          const src = kind === 'hotspot-profiles' ? 'hotspot' as const : 'usermanager' as const;
          await storeProfilesFor(supabaseAdmin, router.id, src, rows.map((r) => profileFromRow(src, r)).filter((p): p is ProfileIn => !!p));
          return new Response('ok');
        }
        if (kind === 'hotspot-sessions' || kind === 'usermanager-sessions') {
          const src = kind === 'hotspot-sessions' ? 'hotspot' as const : 'usermanager' as const;
          const sessions = rows.map((r) => mapSessionRow(src, r)).filter((s): s is SessionIn => !!s);
          // The online list is a few quick batches, so rows untouched for 2 minutes at its end are gone.
          await storeSessionsFor(supabaseAdmin, router.id, src, sessions, done ? new Date(Date.now() - 120_000).toISOString() : undefined);
          const names = [...new Set(sessions.map((s) => s.username))];
          // User Manager cards log in through Hotspot too, so the online mark goes to the card whatever its kind.
          if (names.length) await supabaseAdmin.from('router_cards').update({ last_online_at: new Date().toISOString() }).eq('router_id', router.id).in('name', names);
          return new Response('ok');
        }
        if (kind === 'usermanager-links') {
          // v7: user,profile,state,end-time. A card can have several; the running one wins, then waiting, then used.
          const rank = (st: string) => (st.startsWith('running') ? 3 : st === 'waiting' ? 2 : 1);
          const best = new Map<string, { profile: string; state: string; end: string }>();
          for (const r of rows) { if (!r[0]) continue; const cur = best.get(r[0]); if (!cur || rank(r[2] ?? '') > rank(cur.state)) best.set(r[0], { profile: r[1] ?? '', state: r[2] ?? '', end: r[3] ?? '' }); }
          for (const [name, v] of best) await supabaseAdmin.from('router_cards').update({ profile: v.profile || null, um_state: v.state || null, expires_at: parseRosDate(v.end, tz) }).eq('router_id', router.id).eq('source', 'usermanager').eq('name', name);
          return new Response('ok');
        }
        // Cards: a run is many batches over several minutes. Vanished cards are removed only after a complete run,
        // counting from the moment its first batch arrived (a slow run never wipes cards it already sent).
        const { runs, complete } = nextRun((router.card_runs ?? {}) as CardRuns, kind, page, done, new Date().toISOString());
        await supabaseAdmin.from('routers').update({ card_runs: runs }).eq('id', router.id);
        const cards = rows.map((r) => cardFromRow(kind, r, tz)).filter((c): c is CardIn => !!c);
        await storeCards(supabaseAdmin, router.id, kind, cards, complete ?? undefined);
        if (done) await supabaseAdmin.from('routers').update({ cards_synced_at: new Date().toISOString() }).eq('id', router.id);
        return new Response('ok');
      },
    },
  },
});
