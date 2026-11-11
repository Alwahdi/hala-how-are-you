// Active-user history from the 5-minute router log. Browser-safe.
export type LogPoint = { router_id: string; created_at: string; status: { hotspotActive?: number; umActive?: number } };

/** Sums all routers per 30-minute bucket over the last 24 hours (latest reading per router in each bucket). */
export function buckets(points: LogPoint[], now = Date.now(), hours = 24, stepMin = 30): { at: number; value: number | null }[] {
  const step = stepMin * 60_000; const start = now - hours * 3600_000;
  const out: { at: number; value: number | null }[] = [];
  for (let at = start; at < now; at += step) {
    const per = new Map<string, number>();
    for (const p of points) { const t = new Date(p.created_at).getTime(); if (t >= at && t < at + step) per.set(p.router_id, (p.status.hotspotActive ?? 0) + (p.status.umActive ?? 0)); }
    out.push({ at, value: per.size ? [...per.values()].reduce((a, b) => a + b, 0) : null });
  }
  return out;
}

/** Active users at about the same time yesterday (closest reading per router within 30 minutes), or null when we have no reading. */
export function yesterdayAt(points: LogPoint[], now = Date.now()): number | null {
  const target = now - 86400_000; const best = new Map<string, { d: number; v: number }>();
  for (const p of points) {
    const d = Math.abs(new Date(p.created_at).getTime() - target);
    if (d > 30 * 60_000) continue;
    const cur = best.get(p.router_id);
    if (!cur || d < cur.d) best.set(p.router_id, { d, v: (p.status.hotspotActive ?? 0) + (p.status.umActive ?? 0) });
  }
  return best.size ? [...best.values()].reduce((a, b) => a + b.v, 0) : null;
}
