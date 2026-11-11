import { createFileRoute } from '@tanstack/react-router';
import { z } from 'zod';
import { hashToken } from '@/lib/router-script';
import { ROUTER_RESULTS } from '@/lib/card-actions';

const Body = z.object({ job: z.string().uuid(), removed: z.number().int().min(0).max(1000).optional(), result: z.enum(ROUTER_RESULTS).optional() });

// Result of a task run by the router script: "remove used-up cards" or one card action.
export const Route = createFileRoute('/api/public/router-job')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const token = request.headers.get('x-mikro-token') ?? '';
        if (!/^[a-f0-9]{48}$/.test(token)) return new Response('unauthorized', { status: 401 });
        const raw = await request.text();
        if (raw.length > 500) return new Response('too large', { status: 413 });
        let parsed;
        try { parsed = Body.safeParse(JSON.parse(raw)); } catch { return new Response('bad json', { status: 400 }); }
        if (!parsed.success) return new Response('bad body', { status: 400 });
        const { supabaseAdmin } = await import('@/integrations/supabase/client.server');
        const { data: router } = await supabaseAdmin.from('routers').select('id, owner_id').eq('token_hash', await hashToken(token)).maybeSingle();
        if (!router) return new Response('unauthorized', { status: 401 });
        const doneAt = new Date().toISOString();

        if (parsed.data.result) {
          const ok = parsed.data.result === 'ok';
          const { data: job } = await supabaseAdmin.from('router_jobs').update({ status: ok ? 'done' : 'failed', done_at: doneAt, result: parsed.data.result }).eq('id', parsed.data.job).eq('router_id', router.id).eq('kind', 'card_action').eq('status', 'sent').select('id, payload').maybeSingle();
          if (job) {
            const p = (job.payload ?? {}) as { source?: string; action?: string; name?: string; value?: string | null };
            await supabaseAdmin.from('router_events').insert({ router_id: router.id, owner_id: router.owner_id, kind: 'card_action', detail: { action: p.action, source: p.source, name: p.name, result: parsed.data.result } });
            if (ok && p.source && p.name) {
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              const where = (q: any) => q.eq('router_id', router.id).eq('source', p.source!).eq('name', p.name!);
              const card = supabaseAdmin.from('router_cards');
              // Keep our copy in step right away; the next card run confirms it.
              if (p.action === 'off') await where(card.update({ disabled: true }));
              if (p.action === 'on') await where(card.update({ disabled: false }));
              if (p.action === 'pw') await where(card.update({ pw_mode: 'other' }));
              if (p.action === 'name' && p.value) await where(card.update({ name: p.value }));
              if (p.action === 'del') await where(card.delete());
              if (p.action === 'kick' || p.action === 'off' || p.action === 'del') await supabaseAdmin.from('router_sessions').delete().eq('router_id', router.id).eq('username', p.name);
            }
          }
          return new Response('ok');
        }

        const removed = parsed.data.removed ?? 0;
        const { data: job } = await supabaseAdmin.from('router_jobs').update({ status: 'done', done_at: doneAt, result: `removed:${removed}` }).eq('id', parsed.data.job).eq('router_id', router.id).eq('status', 'sent').select('id, payload, auto').maybeSingle();
        if (job) {
          await supabaseAdmin.from('router_events').insert({ router_id: router.id, owner_id: router.owner_id, kind: 'cards_removed', detail: { removed, asked: ((job.payload as { names?: string[] })?.names ?? []).length, auto: job.auto } });
          const names = ((job.payload as { names?: string[] })?.names ?? []);
          if (names.length) await supabaseAdmin.from('router_cards').delete().eq('router_id', router.id).eq('source', 'hotspot').in('name', names).not('finished_at', 'is', null);
        }
        return new Response('ok');
      },
    },
  },
});
