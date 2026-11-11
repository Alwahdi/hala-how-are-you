// Server-side helpers for direct IP Cloud (REST over HTTPS) checks. No secrets at module scope.
import { API_USER, mapResource } from './ip-cloud';

async function aesKey(secret: string) {
  const raw = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(secret));
  return crypto.subtle.importKey('raw', raw, 'AES-GCM', false, ['encrypt', 'decrypt']);
}
const b64 = (u: Uint8Array) => btoa(String.fromCharCode(...u));
const unb64 = (s: string) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
export async function encrypt(secret: string, text: string) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, await aesKey(secret), new TextEncoder().encode(text)));
  return `${b64(iv)}.${b64(ct)}`;
}
async function decrypt(secret: string, blob: string) {
  const [iv = '', ct = ''] = blob.split('.');
  return new TextDecoder().decode(await crypto.subtle.decrypt({ name: 'AES-GCM', iv: unb64(iv) }, await aesKey(secret), unb64(ct)));
}

export type ProbeError = 'unreachable' | 'auth' | 'tls' | 'timeout' | 'no_user';
type Probe = { ok: true; status: ReturnType<typeof mapResource> } | { ok: false; error: ProbeError };

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
    console.error('ip-cloud probe failed', host, msg);
    if (/timeout|abort/i.test(msg)) return { ok: false, error: 'timeout' };
    if (/certificate|ssl|tls|handshake/i.test(msg)) return { ok: false, error: 'tls' };
    return { ok: false, error: 'unreachable' };
  }
}

/** Probes one router and stores the result. Works with the user client (RLS) or the admin client. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function checkOne(sb: any, id: string, host: string) {
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
