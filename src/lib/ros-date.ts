// Browser-safe: RouterOS dates in router local time to UTC ISO strings.
const MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];

/** The router's gmt-offset as seconds: v6 and v7 give seconds ("10800"); some builds print "+03:00". */
export function tzSeconds(v: string | number | null | undefined): number {
  if (v == null || v === '') return 0;
  if (typeof v === 'number') return v;
  const hm = /^([+-])?(\d{1,2}):(\d{2})$/.exec(v.trim());
  if (hm) return (hm[1] === '-' ? -1 : 1) * (Number(hm[2]) * 3600 + Number(hm[3]) * 60);
  const n = Number(v); return Number.isFinite(n) ? n : 0;
}

/**
 * "nov/18/2026 10:00:00" (v6, Mikhmon), "2026-11-18 10:00:00" (v7.10+) or "nov/18 10:00:00" (this year) in router time → UTC ISO.
 * Anything else (a normal card note, "never") gives null.
 */
export function parseRosDate(s: string | null | undefined, tz = 0, now = new Date()): string | null {
  if (!s) return null;
  const t = s.trim().toLowerCase();
  let y: number, mo: number, d: number, rest: string;
  let m = /^([a-z]{3})\/(\d{1,2})(?:\/(\d{4}))?\s+(\d{1,2}:\d{2}:\d{2})$/.exec(t);
  if (m) { mo = MONTHS.indexOf(m[1]!); if (mo < 0) return null; d = Number(m[2]); y = m[3] ? Number(m[3]) : now.getUTCFullYear(); rest = m[4]!; }
  else {
    m = /^(\d{4})-(\d{2})-(\d{2})\s+(\d{1,2}:\d{2}:\d{2})$/.exec(t);
    if (!m) return null;
    y = Number(m[1]); mo = Number(m[2]) - 1; d = Number(m[3]); rest = m[4]!;
  }
  const [hh, mm, ss] = rest.split(':').map(Number) as [number, number, number];
  const ms = Date.UTC(y, mo, d, hh, mm, ss) - tz * 1000;
  return Number.isFinite(ms) ? new Date(ms).toISOString() : null;
}
