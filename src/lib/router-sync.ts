// Server-side: stores cards, sessions and profiles from either the API pull or the router push.
import { durationToSeconds } from './routeros-api';

export type CardIn = { source: 'hotspot' | 'usermanager'; name: string; profile?: string | null; uptime_s?: number; bytes?: number; limit_uptime_s?: number | null; limit_bytes?: number | null; disabled?: boolean; comment?: string | null; pw_mode?: 'same' | 'none' | 'other' | null };
export type SessionIn = { source: 'hotspot' | 'usermanager'; username: string; address?: string | null; mac?: string | null; uptime_s?: number; bytes?: number };
export type ProfileIn = { source: 'hotspot' | 'usermanager'; name: string; rate_limit?: string | null; shared_users?: string | null; validity?: string | null; price?: string | null };

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
