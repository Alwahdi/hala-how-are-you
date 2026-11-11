// A router sends its cards as a run of numbered batches (page 0, 1, 2, ... with done on the last).
type Source = 'hotspot' | 'usermanager';
export type CardRuns = Partial<Record<Source, { at: string; pages: number }>> & {
  /** How long the last complete run of each kind took, in seconds (shown in router health). */
  took?: Partial<Record<Source, { secs: number; at: string }>>;
};

/**
 * Records one batch. Returns the updated runs and, on the last batch of a run where every batch arrived,
 * the run start: cards not refreshed since then are gone from the router. Otherwise complete is null and nothing is removed.
 */
export function nextRun(runs: CardRuns, source: Source, page: number, done: boolean, now: string): { runs: CardRuns; complete: string | null } {
  const cur = runs[source];
  const run = page === 0 ? { at: now, pages: 1 } : cur ? { at: cur.at, pages: cur.pages + 1 } : null;
  const next: CardRuns = { ...runs };
  if (run) next[source] = run; else delete next[source];
  const complete = done && run && run.pages === page + 1 ? run.at : null;
  if (complete) {
    next.took = { ...(runs.took ?? {}), [source]: { secs: Math.max(0, Math.round((Date.parse(now) - Date.parse(complete)) / 1000)), at: now } };
    delete next[source];
  }
  return { runs: next, complete };
}

/** The slowest last complete card read of a router, in seconds, or null when none finished yet. */
export function cardReadSecs(runs: CardRuns | null | undefined): number | null {
  const t = Object.values(runs?.took ?? {}).map((x) => x?.secs).filter((x): x is number => typeof x === 'number');
  return t.length ? Math.max(...t) : null;
}

/** A card read longer than this means the router is struggling with it. */
export const SLOW_CARD_READ_SECS = 240;
