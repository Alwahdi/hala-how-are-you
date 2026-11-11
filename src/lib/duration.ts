// Browser-safe: RouterOS durations ("1d02:03:04", "4w2d", "5h30m") to seconds.
export function durationToSeconds(v: string | undefined | null): number {
  if (!v) return 0;
  const hms = /^(?:(\d+)d\s*)?(\d+):(\d+):(\d+)$/.exec(v);
  if (hms) return Number(hms[1] ?? 0) * 86400 + Number(hms[2]) * 3600 + Number(hms[3]) * 60 + Number(hms[4]);
  const unit: Record<string, number> = { w: 604800, d: 86400, h: 3600, m: 60, s: 1 };
  let t = 0; for (const m of v.matchAll(/(\d+)(w|d|h|m|s)(?!s)/g)) t += Number(m[1]) * unit[m[2]!]!;
  return t;
}
