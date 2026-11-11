import { createServerFn } from '@tanstack/react-start';
import { z } from 'zod';
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware';
import { API_USER, mapResource, newApiPassword, normalizeCloudAddress } from './ip-cloud';
import { hashToken, newToken } from './router-script';

async function aesKey(secret: string) {
  const raw = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(secret));
  return crypto.subtle.importKey('raw', raw, 'AES-GCM', false, ['encrypt', 'decrypt']);
}
const b64 = (u: Uint8Array) => btoa(String.fromCharCode(...u));
const unb64 = (s: string) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
async function encrypt(secret: string, text: string) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, await aesKey(secret), new TextEncoder().encode(text)));
  return `${b64(iv)}.${b64(ct)}`;
}
async function decrypt(secret: string, blob: string) {
  const [iv = '', ct = ''] = blob.split('.');
  return new TextDecoder().decode(await crypto.subtle.decrypt({ name: 'AES-GCM', iv: unb64(iv) }, await aesKey(secret), unb64(ct)));
}

type Probe = { ok: true; status: ReturnType<typeof mapResource> } | { ok: false; error: 'unreachable' | 'auth' | 'tls' | 'timeout' };

async function probe(host: string, password: string): Promise<Probe> {
  const auth = 'Basic ' + btoa(`${API_USER}:${password}`);
  const get = (p: string) => fetch(`https://${host}/rest${p}`, { headers: { Authorization: auth }, signal: AbortSignal.timeout(8000) });
  try {
    const res = await get('/system/resource');
    if (res.status === 401 || res.status === 403) return { ok: false, error: 'auth' };
    if (!res.ok) return { ok: false, error: 'unreachable' };
    const resource = (await res.json()) as Record<string, string>;
    const id = await get('/system/identity').then((r) => (r.ok ? (r.json() as Promise<{ name?: string }>) : ({} as { name?: string }))).catch(() => ({} as { name?: string }));
    const hs = await get('/ip/hotspot/active').then((r) => (r.ok ? r.json() as Promise<unknown[]> : null)).catch(() => null);
    return { ok: true, status: mapResource(resource, id.name, hs ? hs.length : undefined) };
  } catch (e) {
    const msg = String(e);
    if (/timeout|abort/i.test(msg)) return { ok: false, error: 'timeout' };
    if (/certificate|ssl|tls/i.test(msg)) return { ok: false, error: 'tls' };
    return { ok: false, error: 'unreachable' };
  }
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
    }).eq('id', data.id).select('id').maybeSingle();
    if (error || !row) return { ok: false as const };
    return { ok: true as const, token, password };
  });

/** Saves the host and tests the connection right away. */
export const connectIpCloudRouter = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ id: z.string().uuid(), host: z.string().max(260), port: z.union([z.number(), z.string().max(5)]).optional() }).parse(i))
  .handler(async ({ data, context }) => {
    const host = normalizeCloudAddress(data.host, data.port);
    if (!host) return { ok: false as const, error: 'invalid_host' as const };
    return checkOne(context.supabase, data.id, host);
  });

/** Refreshes all IP Cloud routers of the signed-in owner (called while their page is open). */
export const refreshIpCloudRouters = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data } = await context.supabase.from('routers').select('id, cloud_host').not('cloud_host', 'is', null);
    await Promise.all((data ?? []).map((r) => checkOne(context.supabase, r.id, r.cloud_host!)));
    return { ok: true };
  });

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function checkOne(sb: any, id: string, host: string) {
  const key = process.env['ROUTER_SECRET_KEY'];
  const { data: r } = await sb.from('routers').select('api_secret_encrypted, last_status').eq('id', id).maybeSingle();
  if (!key || !r?.api_secret_encrypted) return { ok: false as const, error: 'no_user' as const };
  const result = await probe(host, await decrypt(key, r.api_secret_encrypted));
  const now = new Date().toISOString();
  await sb.from('routers').update(result.ok
    ? { cloud_host: host, last_seen_at: now, last_status: { ...(r.last_status ?? {}), ...Object.fromEntries(Object.entries(result.status).filter(([, v]) => v !== undefined)) }, last_check_error: null, ros_version: result.status.version?.startsWith('6') ? 'v6' : 'v7' }
    : { cloud_host: host, last_check_error: result.error }).eq('id', id);
  return result.ok ? { ok: true as const, status: result.status } : { ok: false as const, error: result.error };
}
