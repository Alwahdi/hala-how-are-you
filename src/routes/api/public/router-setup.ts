import { createFileRoute } from '@tanstack/react-router';
import { buildSetupFile, hashToken } from '@/lib/router-script';

// Serves the setup .rsc for a router that already holds its own token. Unknown tokens get 404.
export const Route = createFileRoute('/api/public/router-setup')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const token = new URL(request.url).searchParams.get('t') ?? '';
        if (!/^[a-f0-9]{48}$/.test(token)) return new Response('not found', { status: 404 });
        const { supabaseAdmin } = await import('@/integrations/supabase/client.server');
        const { data } = await supabaseAdmin.from('routers').select('id').eq('token_hash', await hashToken(token)).maybeSingle();
        if (!data) return new Response('not found', { status: 404 });
        return new Response(buildSetupFile(token), { headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' } });
      },
    },
  },
});
