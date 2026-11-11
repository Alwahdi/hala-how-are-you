import { createFileRoute } from '@tanstack/react-router';
import { buildSetupScript } from '@/lib/router-script';
import { normalizeSetupCode, openSetup, setupCodeHash } from '@/lib/setup-code';

const MAX_FETCHES = 10;
// RouterOS shows this text if the code is wrong or old; it is a comment, so /import does nothing harmful.
const fail = (msg: string) => new Response(`# Mikro: ${msg}\r\n:put "Mikro: ${msg}"\r\n`, { status: 200, headers: { 'content-type': 'text/plain; charset=utf-8', 'cache-control': 'no-store' } });

/** The router downloads its full setup here with the short command. The code is the only key; it expires in an hour. */
export const Route = createFileRoute('/api/public/s/$code')({
  server: {
    handlers: {
      GET: async ({ params }) => {
        const code = normalizeSetupCode(params.code);
        if (!code) return fail('wrong code - copy the command again from the app');
        const { supabaseAdmin } = await import('@/integrations/supabase/client.server');
        const hash = await setupCodeHash(code);
        const { data: row } = await supabaseAdmin.from('router_setups').select('router_id, sealed, expires_at, fetch_count').eq('code_hash', hash).maybeSingle();
        if (!row || new Date(row.expires_at).getTime() < Date.now() || row.fetch_count >= MAX_FETCHES) return fail('this command expired - press Reconnect in the app for a new one');
        const p = await openSetup(code, row.sealed);
        if (!p) return fail('wrong code - copy the command again from the app');
        await supabaseAdmin.from('router_setups').update({ fetch_count: row.fetch_count + 1 }).eq('code_hash', hash);
        return new Response(buildSetupScript(p.token, p.password), { headers: { 'content-type': 'text/plain; charset=utf-8', 'cache-control': 'no-store' } });
      },
    },
  },
});
