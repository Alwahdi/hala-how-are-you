import { createFileRoute } from '@tanstack/react-router';
import { z } from 'zod';
import { hashToken } from '@/lib/router-script';
import { ROUTER_RESULTS } from '@/lib/card-actions';
import { packageProfileRow, type PkgInput } from '@/lib/packages';

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
          const count = parsed.data.removed;
          const { data: job } = await supabaseAdmin.from('router_jobs').update({ status: ok ? 'done' : 'failed', done_at: doneAt, result: count != null ? `${parsed.data.result}:${count}` : parsed.data.result }).eq('id', parsed.data.job).eq('router_id', router.id).in('kind', ['card_action', 'card_bulk', 'package']).eq('status', 'sent').select('id, kind, payload').maybeSingle();
          if (!job) return new Response('ok');
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const sb = supabaseAdmin as any;
          if (job.kind === 'package') {
            const p = (job.payload ?? {}) as PkgInput;
            await supabaseAdmin.from('router_events').insert({ router_id: router.id, owner_id: router.owner_id, kind: 'package', detail: { action: p.action, source: p.source, name: p.name, result: parsed.data.result } });
            // Keep our copy in step right away; the next card run confirms it.
            if (ok && p.action === 'del') await supabaseAdmin.from('router_profiles').delete().eq('router_id', router.id).eq('source', p.source).eq('name', p.name);
            else if (ok) await sb.from('router_profiles').upsert({ ...packageProfileRow(p), router_id: router.id, synced_at: doneAt }, { onConflict: 'router_id,source,name' });
            return new Response('ok');
          }
          if (job.kind === 'card_bulk') {
            const p = (job.payload ?? {}) as { source?: string; action?: string; names?: string[] };
            await supabaseAdmin.from('router_events').insert({ router_id: router.id, owner_id: router.owner_id, kind: 'card_bulk', detail: { action: p.action, source: p.source, asked: (p.names ?? []).length, done: count ?? 0 } });
            const names = p.names ?? [];
            if (names.length && p.source) {
              const cards = () => supabaseAdmin.from('router_cards');
              if (p.action === 'off') await cards().update({ disabled: true }).eq('router_id', router.id).eq('source', p.source).in('name', names);
              if (p.action === 'on') await cards().update({ disabled: false }).eq('router_id', router.id).eq('source', p.source).in('name', names);
              if (p.action === 'del') await cards().delete().eq('router_id', router.id).eq('source', p.source).in('name', names);
              if (p.action !== 'on') await supabaseAdmin.from('router_sessions').delete().eq('router_id', router.id).in('username', names);
            }
            return new Response('ok');
          }
          {
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
              if (p.action === 'renew') await where(card.update({ uptime_s: 0, bytes: 0, disabled: false, expires_at: null, finished_at: null, first_used_at: null, ...(p.source === 'usermanager' ? { um_state: 'waiting' } : {}) }));
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
