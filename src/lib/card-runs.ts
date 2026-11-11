// A router sends its cards as a run of numbered batches (page 0, 1, 2, ... with done on the last).
export type CardRuns = Partial<Record<'hotspot' | 'usermanager', { at: string; pages: number }>>;

/**
 * Records one batch. Returns the updated runs and, on the last batch of a run where every batch arrived,
 * the run start: cards not refreshed since then are gone from the router. Otherwise complete is null and nothing is removed.
 */
export function nextRun(runs: CardRuns, source: 'hotspot' | 'usermanager', page: number, done: boolean, now: string): { runs: CardRuns; complete: string | null } {
  const cur = runs[source];
  const run = page === 0 ? { at: now, pages: 1 } : cur ? { at: cur.at, pages: cur.pages + 1 } : null;
  const next: CardRuns = { ...runs };
  if (run) next[source] = run; else delete next[source];
  const complete = done && run && run.pages === page + 1 ? run.at : null;
  return { runs: next, complete };
}
