import { createFileRoute } from '@tanstack/react-router';
import { z } from 'zod';
import { hashToken } from '@/lib/router-script';

const Body = z.object({ job: z.string().uuid(), removed: z.number().int().min(0).max(1000) });

// Result of a "remove used-up cards" task, reported by the router script.
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
        const { data: job } = await supabaseAdmin.from('router_jobs').update({ status: 'done', done_at: new Date().toISOString(), result: `removed:${parsed.data.removed}` }).eq('id', parsed.data.job).eq('router_id', router.id).eq('status', 'sent').select('id, payload, auto').maybeSingle();
        if (job) {
          await supabaseAdmin.from('router_events').insert({ router_id: router.id, owner_id: router.owner_id, kind: 'cards_removed', detail: { removed: parsed.data.removed, asked: ((job.payload as { names?: string[] })?.names ?? []).length, auto: job.auto } });
          const names = ((job.payload as { names?: string[] })?.names ?? []);
          if (names.length) await supabaseAdmin.from('router_cards').delete().eq('router_id', router.id).eq('source', 'hotspot').in('name', names).not('finished_at', 'is', null);
        }
        return new Response('ok');
      },
    },
  },
});
