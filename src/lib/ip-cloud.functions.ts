import { createServerFn } from '@tanstack/react-start';
import { z } from 'zod';
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware';
import { API_USER, newApiPassword, normalizeCloudHost } from './ip-cloud';
import { checkOne, encrypt } from './ip-cloud-probe';
import { directAccessState, hashToken, newToken, shouldTryDirect } from './router-script';
import { newSetupCode, sealSetup, setupCodeHash, SETUP_TTL_MS } from './setup-code';

/** Stores a sealed one-hour setup for the short command; returns the code (null if saving failed, the full command still works). */
async function issueSetup(routerId: string, token: string, password: string): Promise<string | null> {
  const { supabaseAdmin } = await import('@/integrations/supabase/client.server');
  const code = newSetupCode();
  await supabaseAdmin.from('router_setups').delete().eq('router_id', routerId);
  const { error } = await supabaseAdmin.from('router_setups').insert({ code_hash: await setupCodeHash(code), router_id: routerId, sealed: await sealSetup(code, { token, password }), expires_at: new Date(Date.now() + SETUP_TTL_MS).toISOString() });
  return error ? null : code;
}

/** Creates a router for the paste command: report token plus an encrypted read-only API password (used later for direct IP Cloud access on v7). */
export const createPushRouter = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ name: z.string().trim().min(1).max(60) }).parse(i))
  .handler(async ({ data, context }) => {
    const key = process.env['ROUTER_SECRET_KEY'];
    if (!key) return { ok: false as const };
    const token = newToken(); const password = newApiPassword();
    const { data: row, error } = await context.supabase.from('routers').insert({
      owner_id: context.userId, name: data.name, connection_method: 'push', token_hash: await hashToken(token), api_user: API_USER, api_secret_encrypted: await encrypt(key, password),
    }).select('id').single();
    if (error || !row) return { ok: false as const };
    return { ok: true as const, id: row.id, token, password, code: await issueSetup(row.id, token, password) };
  });

/** Issues a fresh token and API password for an existing router (Reconnect). RLS limits it to the owner. */
export const rotatePushRouter = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ id: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    const key = process.env['ROUTER_SECRET_KEY'];
    if (!key) return { ok: false as const };
    const token = newToken(); const password = newApiPassword();
    const { data: row, error } = await context.supabase.from('routers').update({
      token_hash: await hashToken(token), api_user: API_USER, api_secret_encrypted: await encrypt(key, password),
      cloud_host: null, direct_port: null, direct_tls: null, direct_checked_at: null, last_check_error: null,
    }).eq('id', data.id).select('id').maybeSingle();
    if (error || !row) return { ok: false as const };
    return { ok: true as const, token, password, code: await issueSetup(row.id, token, password) };
  });

/** Refreshes direct links of the signed-in owner while their page is open, with the same automatic rules as the router reports. */
export const refreshIpCloudRouters = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ id: z.string().uuid().optional() }).optional().parse(i))
  .handler(async ({ data: input, context }) => {
    const { data } = await context.supabase.from('routers').select('id, cloud_host, direct_port, last_check_error, direct_checked_at, cards_synced_at, last_status');
    const now = Date.now();
    await Promise.all((data ?? []).map((r) => {
      const s = (r.last_status ?? {}) as { cloudName?: string; behindNat?: string; apiDisabled?: string; apiSslDisabled?: string; apiUser?: number };
      const host = normalizeCloudHost(s.cloudName ?? '') ?? r.cloud_host;
      // "Try now" (id given) skips the wait after a failure, but never runs when the router reports the user is missing.
      const forced = input?.id === r.id && directAccessState(s) === 'ready' && s.apiUser !== 0;
      if (!host || !(forced || shouldTryDirect(r, s, now))) return null;
      return checkOne(context.supabase, r.id, host);
    }));
    return { ok: true };
  });

/** Saves the router's role (load balancing / distribution / general). */
export const setRouterRole = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ id: z.string().uuid(), role: z.enum(['general', 'balancer', 'distribution']) }).parse(i))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from('routers').update({ role: data.role }).eq('id', data.id);
    return { ok: !error };
  });
