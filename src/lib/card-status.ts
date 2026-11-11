// Card state from what the router reports. Browser-safe.
import { durationToSeconds } from './duration';
import { sizeToBytes } from './packages';
export type CardRow = {
  router_id: string; source: string; name: string; profile: string | null; uptime_s: number; bytes: number; limit_uptime_s: number | null; limit_bytes: number | null;
  disabled: boolean; comment: string | null; first_seen_at: string; synced_at: string; um_state?: string | null; first_used_at?: string | null;
  /** From the router (Mikhmon note, User Manager v7) or, when `expires_est`, first use we saw + package validity. */
  expires_at?: string | null; expires_est?: boolean; last_online_at?: string | null; validity_s?: number | null;
};
/** finished = its time or data is used up; expired = its validity days are over. */
export type CardState = 'unused' | 'active' | 'almost' | 'finished' | 'expired' | 'disabled';
export const CARD_STATES: CardState[] = ['unused', 'active', 'almost', 'finished', 'expired', 'disabled'];

/** Share of the limit already used (time or data, whichever is higher), or null when the card has no limit. */
export function usedShare(c: Pick<CardRow, 'uptime_s' | 'bytes' | 'limit_uptime_s' | 'limit_bytes'>): number | null {
  const parts = [c.limit_uptime_s ? c.uptime_s / c.limit_uptime_s : null, c.limit_bytes ? c.bytes / c.limit_bytes : null].filter((x): x is number => x != null);
  return parts.length ? Math.max(...parts) : null;
}

export function cardState(c: Pick<CardRow, 'uptime_s' | 'bytes' | 'limit_uptime_s' | 'limit_bytes' | 'disabled'> & { um_state?: string | null; expires_at?: string | null }, now = Date.now()): CardState {
  if (c.expires_at && Date.parse(c.expires_at) <= now) return 'expired';
  if (c.disabled) return 'disabled';
  // User Manager v7 says it directly: waiting (unused), running (in use), used (finished).
  if (c.um_state === 'used') return 'finished';
  if (c.um_state === 'waiting') return 'unused';
  if (c.um_state?.startsWith('running') && c.uptime_s === 0 && c.bytes === 0) return 'active';
  const share = usedShare(c);
  if (share != null && share >= 1) return 'finished';
  if (c.uptime_s === 0 && c.bytes === 0) return 'unused';
  if (share != null && share >= 0.8) return 'almost';
  return 'active';
}

export function formatBytes(b: number): string {
  if (b < 1024) return `${b} B`;
  const u = ['KB', 'MB', 'GB', 'TB']; let v = b / 1024; let i = 0;
  while (v >= 1024 && i < u.length - 1) { v /= 1024; i++; }
  return `${v.toFixed(v < 10 ? 1 : 0)} ${u[i]}`;
}

export function formatDuration(s: number, ar: boolean): string {
  const d = Math.floor(s / 86400), h = Math.floor((s % 86400) / 3600), m = Math.floor((s % 3600) / 60);
  const parts = ar ? [d && `${d} ي`, h && `${h} س`, (m || (!d && !h)) && `${m} د`] : [d && `${d}d`, h && `${h}h`, (m || (!d && !h)) && `${m}m`];
  return parts.filter(Boolean).join(' ');
}

type Pkg = { router_id: string; source: string; name: string; validity: string | null; extra?: Record<string, string> | null };

/**
 * Adds what the package knows to each card: User Manager limits live on the package, not the card, and the validity
 * gives an estimated expiry from the first use we saw (never earlier than the real one, since we see use after it starts).
 */
export function withPackage(cards: CardRow[], pkgs: Pkg[]): CardRow[] {
  const by = new Map(pkgs.map((p) => [`${p.router_id}|${p.source}|${p.name}`, p]));
  return cards.map((c) => {
    const p = c.profile ? by.get(`${c.router_id}|${c.source}|${c.profile}`) : undefined;
    if (!p) return c;
    const x = p.extra ?? {};
    const validity = durationToSeconds(p.validity) || null;
    const out: CardRow = { ...c, validity_s: validity };
    if (c.source === 'usermanager') {
      if (!c.limit_uptime_s) out.limit_uptime_s = durationToSeconds(x['uptimeLimit']) || null;
      if (!c.limit_bytes) out.limit_bytes = sizeToBytes(x['transferLimit']);
    }
    if (!c.expires_at && validity && c.first_used_at) { out.expires_at = new Date(Date.parse(c.first_used_at) + validity * 1000).toISOString(); out.expires_est = true; }
    return out;
  });
}

/** What is left on a card: data, time and days, each null when the card has no such limit. */
export function remaining(c: CardRow, now = Date.now()): { bytes: number | null; seconds: number | null; untilMs: number | null } {
  return {
    bytes: c.limit_bytes ? Math.max(0, c.limit_bytes - c.bytes) : null,
    seconds: c.limit_uptime_s ? Math.max(0, c.limit_uptime_s - c.uptime_s) : null,
    untilMs: c.expires_at ? Date.parse(c.expires_at) - now : null,
  };
}

/** "3 أيام" / "5 س" / "20 د" — the biggest unit of a time left, for short labels. */
export function shortLeft(ms: number, ar: boolean): string {
  const m = Math.max(0, Math.floor(ms / 60000)), h = Math.floor(m / 60), d = Math.floor(h / 24);
  if (d >= 1) return ar ? (d === 1 ? 'يوم' : d === 2 ? 'يومين' : `${d} أيام`) : `${d}d`;
  if (h >= 1) return ar ? `${h} س` : `${h}h`;
  return ar ? `${m} د` : `${m}m`;
}
