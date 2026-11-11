import { createFileRoute } from '@tanstack/react-router';
import { z } from 'zod';
import { hashToken, majorVersion } from '@/lib/router-script';

const num = z.coerce.number().finite().nonnegative().max(1e15);
const str = z.string().max(120);
const Report = z.object({
  identity: str, board: str, version: str, uptime: str,
  cpu: num, freeMemory: num, totalMemory: num, freeHdd: num, totalHdd: num,
  hotspotActive: num, temperature: str.optional().default(''),
  cloudName: str.optional().default(''), sslPort: z.string().max(5).optional().default(''), sslDisabled: z.string().max(5).optional().default(''),
});

const LOG_EVERY_MS = 5 * 60_000;
const MIN_GAP_MS = 10_000;

export const Route = createFileRoute('/api/public/router-report')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const token = request.headers.get('x-mikro-token') ?? '';
        if (!/^[a-f0-9]{48}$/.test(token)) return new Response('unauthorized', { status: 401 });
        const raw = await request.text();
        if (raw.length > 4000) return new Response('too large', { status: 413 });
        let parsed;
        try { parsed = Report.safeParse(JSON.parse(raw)); } catch { return new Response('bad json', { status: 400 }); }
        if (!parsed.success) return new Response('bad report', { status: 400 });

        const { supabaseAdmin } = await import('@/integrations/supabase/client.server');
        const hash = await hashToken(token);
        const { data: router } = await supabaseAdmin.from('routers').select('id, last_seen_at').eq('token_hash', hash).maybeSingle();
        if (!router) return new Response('unauthorized', { status: 401 });

        const now = Date.now();
        if (router.last_seen_at && now - new Date(router.last_seen_at).getTime() < MIN_GAP_MS) return new Response('ok');

        const status = parsed.data;
        await supabaseAdmin.from('routers').update({ last_seen_at: new Date(now).toISOString(), last_status: status, ...(majorVersion(status.version) ? { ros_version: majorVersion(status.version)! } : {}) }).eq('id', router.id);
        const { data: last } = await supabaseAdmin.from('router_status_log').select('created_at').eq('router_id', router.id).order('created_at', { ascending: false }).limit(1).maybeSingle();
        if (!last || now - new Date(last.created_at).getTime() >= LOG_EVERY_MS) {
          await supabaseAdmin.from('router_status_log').insert({ router_id: router.id, status });
        }
        return new Response('ok');
      },
    },
  },
});
