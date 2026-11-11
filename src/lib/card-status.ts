// Card state from what the router reports. Browser-safe.
export type CardRow = { router_id: string; source: string; name: string; profile: string | null; uptime_s: number; bytes: number; limit_uptime_s: number | null; limit_bytes: number | null; disabled: boolean; comment: string | null; first_seen_at: string; synced_at: string };
export type CardState = 'unused' | 'active' | 'almost' | 'finished' | 'disabled';

/** Share of the limit already used (time or data, whichever is higher), or null when the card has no limit. */
export function usedShare(c: Pick<CardRow, 'uptime_s' | 'bytes' | 'limit_uptime_s' | 'limit_bytes'>): number | null {
  const parts = [c.limit_uptime_s ? c.uptime_s / c.limit_uptime_s : null, c.limit_bytes ? c.bytes / c.limit_bytes : null].filter((x): x is number => x != null);
  return parts.length ? Math.max(...parts) : null;
}

export function cardState(c: Pick<CardRow, 'uptime_s' | 'bytes' | 'limit_uptime_s' | 'limit_bytes' | 'disabled'>): CardState {
  if (c.disabled) return 'disabled';
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
