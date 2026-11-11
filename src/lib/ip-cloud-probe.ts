// Server-side direct access: RouterOS API over IP Cloud (8729 encrypted first, then the router's plain API port).
// Kept light on purpose: User Manager lists are never read here (the router's own script reads them), because on
// weak routers they take minutes and keep the CPU busy after we hang up.
import { API_USER, mapResource } from './ip-cloud';
import { apiSession, type ApiError } from './routeros-api';
import { mapHotspotActive, mapHotspotProfile, mapHotspotUser, storeCards, storeProfilesFor, storeSessions, type CardIn, type ProfileIn } from './router-sync';
import { tzSeconds } from './ros-date';

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

export type ProbeError = ApiError | 'no_user';
export type Candidate = { port: number; tls: boolean };
const CARDS_EVERY_MS = 5 * 60_000;

/** Ports to try, in order: encrypted API, plain API (as reported by the router), then any port the owner typed. */
export function candidatePorts(s: { apiSslPort?: string; apiSslDisabled?: string; apiPort?: string; apiDisabled?: string } | null | undefined, manual?: number | null): Candidate[] {
  const out: Candidate[] = [];
  const add = (port: number, tls: boolean) => { if (port > 0 && port < 65536 && !out.some((c) => c.port === port && c.tls === tls)) out.push({ port, tls }); };
  if (manual) { add(manual, true); add(manual, false); }
  if (s?.apiSslDisabled !== 'true') add(Number(s?.apiSslPort) || 8729, true);
  if (s?.apiDisabled !== 'true') add(Number(s?.apiPort) || 8728, false);
  return out;
}

/** The connection check: login plus three quick reads (well under a second on any router). */
export const BASE = [['/system/resource/print'], ['/system/identity/print'], ['/ip/hotspot/active/print']];
/** Hotspot cards and packages, only when the router's own script has not sent them lately. */
export const CARDS = [
  ['/ip/hotspot/user/print', '=.proplist=name,profile,uptime,bytes-in,bytes-out,limit-uptime,limit-bytes-total,disabled,comment'],
  ['/ip/hotspot/user/profile/print', '=.proplist=name,rate-limit,shared-users,session-timeout,idle-timeout,keepalive-timeout,address-pool,on-login'],
];

/** Connects to one router and stores everything we can read. Works with the user client (RLS) or the admin client. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function checkOne(sb: any, id: string, host: string, candidates?: Candidate[]) {
  const key = process.env['ROUTER_SECRET_KEY'];
  const { data: r } = await sb.from('routers').select('api_secret_encrypted, last_status, direct_port, direct_tls, cards_synced_at').eq('id', id).maybeSingle();
  if (!key || !r?.api_secret_encrypted) {
    await sb.from('routers').update({ cloud_host: host, direct_checked_at: new Date().toISOString(), last_check_error: 'no_user' }).eq('id', id);
    return { ok: false as const, error: 'no_user' as const };
  }
  const password = await decrypt(key, r.api_secret_encrypted);
  const known: Candidate[] = r.direct_port ? [{ port: r.direct_port, tls: !!r.direct_tls }] : [];
  const list: Candidate[] = candidates ?? [...known, ...candidatePorts(r.last_status).filter((c) => !known.some((k) => k.port === c.port && k.tls === c.tls))];
  const withCards = !r.cards_synced_at || Date.now() - new Date(r.cards_synced_at).getTime() > CARDS_EVERY_MS;
  const commands = withCards ? [...BASE, ...CARDS] : BASE;
  let lastError: ProbeError = 'unreachable';
  for (const c of list) {
    const res = await apiSession({ host, port: c.port, tls: c.tls, user: API_USER, password, commands, timeoutMs: 8000 }).catch(() => ({ ok: false as const, error: 'unreachable' as const }));
    if (!res.ok) { console.error('api probe failed', host, c.port, c.tls, res.error); if (res.error === 'auth' || lastError === 'unreachable') lastError = res.error; continue; }
    const [resource, identity, hsActive, hsUsers, hsProfiles] = res.results;
    const status = mapResource(resource?.[0] ?? {}, identity?.[0]?.['name'], hsActive ? hsActive.length : undefined);
    const now = new Date().toISOString();
    const sessions = (hsActive ?? []).map(mapHotspotActive).filter((x) => !!x);
    await storeSessions(sb, id, sessions);
    const patch: Record<string, unknown> = {
      cloud_host: host, direct_port: c.port, direct_tls: c.tls, direct_checked_at: now, last_seen_at: now, last_check_error: null,
      last_status: { ...(r.last_status ?? {}), ...Object.fromEntries(Object.entries(status).filter(([, v]) => v !== undefined)) },
      ros_version: status.version?.startsWith('6') ? 'v6' : 'v7',
    };
    if (withCards) {
      const tz = tzSeconds((r.last_status as { tz?: string } | null)?.tz);
      const hs = (hsUsers ?? []).map((x) => mapHotspotUser(x, tz)).filter((x): x is CardIn => !!x);
      if (hsUsers) await storeCards(sb, id, 'hotspot', hs, now);
      // Only Hotspot here: User Manager cards and packages come from the router's own reader script.
      if (hsProfiles) await storeProfilesFor(sb, id, 'hotspot', hsProfiles.map(mapHotspotProfile).filter((p): p is ProfileIn => !!p));
      patch['cards_synced_at'] = now;
    }
    await sb.from('routers').update(patch).eq('id', id);
    return { ok: true as const, status, port: c.port, tls: c.tls };
  }
  await sb.from('routers').update({ cloud_host: host, direct_port: null, direct_tls: null, direct_checked_at: new Date().toISOString(), last_check_error: lastError }).eq('id', id);
  return { ok: false as const, error: lastError };
}
