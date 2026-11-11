// Server-side: stores cards, sessions and profiles from either the API pull or the router push.
import { durationToSeconds } from './routeros-api';
import { parseMikhmon } from './card-actions';

export type CardIn = { source: 'hotspot' | 'usermanager'; name: string; profile?: string | null; uptime_s?: number; bytes?: number; limit_uptime_s?: number | null; limit_bytes?: number | null; disabled?: boolean; comment?: string | null; pw_mode?: 'same' | 'none' | 'other' | null };
export type SessionIn = { source: 'hotspot' | 'usermanager'; username: string; address?: string | null; mac?: string | null; uptime_s?: number; bytes?: number };
export type ProfileIn = { source: 'hotspot' | 'usermanager'; name: string; rate_limit?: string | null; shared_users?: string | null; validity?: string | null; price?: string | null; sell_price?: string | null; extra?: Record<string, string> };

const n = (v?: string) => (v == null || v === '' ? 0 : Number(v) || 0);
const lim = (v?: string) => { const x = durationToSeconds(v); return x > 0 ? x : null; };
const pwMode = (v?: string) => (v === 'same' || v === 'none' || v === 'other' ? v : undefined);
const limB = (v?: string) => (v && Number(v) > 0 ? Number(v) : null);

export function mapHotspotUser(r: Record<string, string>): CardIn | null {
  if (!r['name'] || r['name'] === 'default-trial') return null;
  return { source: 'hotspot', name: r['name'], profile: r['profile'] ?? null, uptime_s: durationToSeconds(r['uptime']), bytes: n(r['bytes-in']) + n(r['bytes-out']), limit_uptime_s: lim(r['limit-uptime']), limit_bytes: limB(r['limit-bytes-total']), disabled: r['disabled'] === 'true', comment: r['comment'] ?? null, ...(pwMode(r['pw']) ? { pw_mode: pwMode(r['pw'])! } : {}) };
}
export function mapUmUser(r: Record<string, string>): CardIn | null {
  const name = r['name'] ?? r['username']; if (!name) return null;
  return { source: 'usermanager', name, profile: r['actual-profile'] ?? r['group'] ?? null, uptime_s: durationToSeconds(r['uptime-used'] ?? r['total-uptime']), bytes: n(r['download-used']) + n(r['upload-used']) + n(r['total-download']) + n(r['total-upload']), disabled: r['disabled'] === 'true', comment: r['comment'] ?? null, ...(pwMode(r['pw']) ? { pw_mode: pwMode(r['pw'])! } : {}) };
}
export function mapHotspotActive(r: Record<string, string>): SessionIn | null {
  if (!r['user']) return null;
  return { source: 'hotspot', username: r['user'], address: r['address'] ?? null, mac: r['mac-address'] ?? '', uptime_s: durationToSeconds(r['uptime']), bytes: n(r['bytes-in']) + n(r['bytes-out']) };
}
export function mapUmSession(r: Record<string, string>): SessionIn | null {
  if (!r['user'] || r['active'] === 'false') return null;
  return { source: 'usermanager', username: r['user'], address: r['user-address'] ?? null, mac: r['calling-station-id'] ?? '', uptime_s: durationToSeconds(r['uptime']), bytes: n(r['download']) + n(r['upload']) };
}

const chunk = <T,>(a: T[], size = 500) => Array.from({ length: Math.ceil(a.length / size) }, (_, i) => a.slice(i * size, i * size + size));

/** Upserts a full snapshot for one source and removes rows that disappeared from the router. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function storeCards(sb: any, routerId: string, source: CardIn['source'], cards: CardIn[], startedAt?: string) {
  const now = new Date().toISOString();
  for (const part of chunk(cards)) await sb.from('router_cards').upsert(part.map((c) => ({ ...c, router_id: routerId, synced_at: now })), { onConflict: 'router_id,source,name' });
  if (startedAt !== undefined) await sb.from('router_cards').delete().eq('router_id', routerId).eq('source', source).lt('synced_at', startedAt);
}
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function storeSessions(sb: any, routerId: string, sessions: SessionIn[]) {
  await sb.from('router_sessions').delete().eq('router_id', routerId);
  for (const part of chunk(sessions)) await sb.from('router_sessions').upsert(part.map((s) => ({ ...s, mac: s.mac ?? '', router_id: routerId, synced_at: new Date().toISOString() })), { onConflict: 'router_id,source,username,mac' });
}
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function storeProfiles(sb: any, routerId: string, profiles: ProfileIn[]) {
  await sb.from('router_profiles').delete().eq('router_id', routerId);
  if (profiles.length) await sb.from('router_profiles').upsert(profiles.map((p) => ({ ...p, router_id: routerId })), { onConflict: 'router_id,source,name' });
}
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function storeProfilesFor(sb: any, routerId: string, source: ProfileIn['source'], profiles: ProfileIn[]) {
  await sb.from('router_profiles').delete().eq('router_id', routerId).eq('source', source);
  if (profiles.length) await sb.from('router_profiles').upsert(profiles.map((p) => ({ ...p, router_id: routerId, synced_at: new Date().toISOString() })), { onConflict: 'router_id,source,name' });
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function storeSessionsFor(sb: any, routerId: string, source: SessionIn['source'], sessions: SessionIn[], removeBefore?: string) {
  const now = new Date().toISOString();
  for (const part of chunk(sessions)) await sb.from('router_sessions').upsert(part.map((s) => ({ ...s, mac: s.mac ?? '', router_id: routerId, synced_at: now })), { onConflict: 'router_id,source,username,mac' });
  if (removeBefore) await sb.from('router_sessions').delete().eq('router_id', routerId).eq('source', source).lt('synced_at', removeBefore);
}

// Empty, "off", "none" and zero durations or rates ("0s", "00:00:00", "0/0") mean "no limit".
const nz = (v?: string | null) => {
  if (!v || ['none', 'off', '0', '/', 'unlimited'].includes(v)) return null;
  if (/^[0:/smhdw\s]+$/.test(v) && !/[1-9]/.test(v)) return null;
  return v;
};
const drop = (o: Record<string, string | null | undefined>) => Object.fromEntries(Object.entries(o).filter(([, v]) => !!v)) as Record<string, string>;

/** Hotspot package from the push row (name,rate,devices,session-timeout,idle,keepalive,pool,mikhmon) or an API row. Mikhmon wins for price/validity. */
export function mapHotspotProfile(r: Record<string, string | undefined>): ProfileIn | null {
  if (!r['name']) return null;
  const mk = parseMikhmon(r['mikhmon'] ?? r['on-login']);
  return {
    source: 'hotspot', name: r['name'], rate_limit: nz(r['rate-limit']), shared_users: nz(r['shared-users']),
    validity: mk?.validity || nz(r['session-timeout']), price: mk?.price || null, sell_price: mk?.sellPrice || null,
    extra: drop({ sessionTimeout: nz(r['session-timeout']), idle: nz(r['idle-timeout']), keepalive: nz(r['keepalive-timeout']), pool: nz(r['address-pool']), expiry: mk?.mode, lock: mk?.lock }),
  };
}
/** User Manager package (v6 or v7): name,name-for-users,validity,price,devices,rate rx/tx,uptime-limit,transfer-limit. */
export function mapUmProfile(r: Record<string, string | undefined>): ProfileIn | null {
  if (!r['name']) return null;
  return {
    source: 'usermanager', name: r['name'], rate_limit: nz(r['rate']), shared_users: nz(r['shared']), validity: nz(r['validity']), price: nz(r['price']),
    extra: drop({ forUsers: nz(r['name-for-users']), uptimeLimit: nz(r['uptime-limit']), transferLimit: nz(r['transfer-limit']) }),
  };
}
/** Online row from the push: user,mac,uptime,bytes,address. */
export function mapSessionRow(source: SessionIn['source'], r: string[]): SessionIn | null {
  if (!r[0]) return null;
  return { source, username: r[0], mac: r[1] ?? '', uptime_s: durationToSeconds(r[2]), bytes: n(r[3]), address: r[4] || null };
}
/** The report's compact online list: "user|mac|uptime|bytes;" repeated. */
export function parseActiveList(act: string | undefined): SessionIn[] {
  if (!act) return [];
  return act.split(';').map((x) => x.split('|')).filter((p) => p[0]).map((p) => mapSessionRow('hotspot', p)).filter((x): x is SessionIn => !!x);
}

/** Turns one pushed row into a card. Old scripts send shorter rows, so both layouts are read. */
export function cardFromRow(source: 'hotspot' | 'usermanager', r: string[]): CardIn | null {
  if (source === 'hotspot') return mapHotspotUser({ name: r[0] ?? '', profile: r[1] ?? '', uptime: r[2] ?? '', 'bytes-in': r[3] ?? '', 'bytes-out': r[4] ?? '', 'limit-uptime': r[5] ?? '', 'limit-bytes-total': r[6] ?? '', disabled: r[7] ?? '', comment: r[8] ?? '', pw: r[9] ?? '' });
  if (r.length <= 5) return mapUmUser({ name: r[0] ?? '', group: r[1] ?? '', disabled: r[2] ?? '', comment: r[3] ?? '', pw: r[4] ?? '' });
  const c = mapUmUser({ name: r[0] ?? '', 'actual-profile': r[1] ?? '', 'uptime-used': r[2] ?? '', 'download-used': r[3] ?? '', 'upload-used': r[4] ?? '', disabled: r[5] ?? '', comment: r[6] ?? '', pw: r[7] ?? '' });
  if (c && !r[1]) delete c.profile; // v7: the package comes from the links list, keep what we know.
  return c;
}
export function profileFromRow(source: 'hotspot' | 'usermanager', r: string[]): ProfileIn | null {
  if (source === 'hotspot') return mapHotspotProfile({ name: r[0], 'rate-limit': r[1], 'shared-users': r[2], 'session-timeout': r[3], 'idle-timeout': r[4], 'keepalive-timeout': r[5], 'address-pool': r[6], mikhmon: r[7] });
  return mapUmProfile({ name: r[0], 'name-for-users': r[1], validity: r[2], price: r[3], shared: r[4], rate: r[5], 'uptime-limit': r[6], 'transfer-limit': r[7] });
}

