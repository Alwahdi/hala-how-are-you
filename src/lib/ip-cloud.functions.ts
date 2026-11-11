import { createServerFn } from '@tanstack/react-start';
import { z } from 'zod';
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware';
import { API_USER, newApiPassword, normalizeCloudAddress } from './ip-cloud';
import { candidatePorts, checkOne, encrypt } from './ip-cloud-probe';
import { normalizeCloudHost } from './ip-cloud';
import { hashToken, newToken } from './router-script';

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
    return { ok: true as const, id: row.id, token, password };
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
      cloud_host: null, direct_port: null, direct_tls: null, last_check_error: null,
    }).eq('id', data.id).select('id').maybeSingle();
    if (error || !row) return { ok: false as const };
    return { ok: true as const, token, password };
  });

/** Saves the host and tests the connection right away. */
export const connectIpCloudRouter = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ id: z.string().uuid(), host: z.string().max(260), port: z.union([z.number(), z.string().max(5)]).optional() }).parse(i))
  .handler(async ({ data, context }) => {
    const addr = normalizeCloudAddress(data.host, data.port);
    const host = addr ? normalizeCloudHost(addr.split(':')[0] ?? '') : null;
    if (!addr || !host) return { ok: false as const, error: 'invalid_host' as const };
    const manual = addr.includes(':') ? Number(addr.split(':')[1]) : null;
    const { data: r } = await context.supabase.from('routers').select('last_status').eq('id', data.id).maybeSingle();
    return checkOne(context.supabase, data.id, host, candidatePorts(r?.last_status as Record<string, string> | null, manual));
  });

/** Refreshes all IP Cloud routers of the signed-in owner (called while their page is open). */
export const refreshIpCloudRouters = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data } = await context.supabase.from('routers').select('id, cloud_host').not('cloud_host', 'is', null);
    await Promise.all((data ?? []).map((r) => checkOne(context.supabase, r.id, r.cloud_host!)));
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
