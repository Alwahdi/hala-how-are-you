// A router sends its cards as a run of numbered batches (page 0, 1, 2, ... with done on the last).
// The bookkeeping is done atomically in the database (card_run_step): Hotspot and User Manager upload at the same time.
type Source = 'hotspot' | 'usermanager';
export type CardRuns = Partial<Record<Source, { at: string; pages: number }>> & {
  /** How long the last complete run of each kind took, in seconds (shown in router health). */
  took?: Partial<Record<Source, { secs: number; at: string }>>;
};

/** The slowest last complete card read of a router, in seconds, or null when none finished yet. */
export function cardReadSecs(runs: CardRuns | null | undefined): number | null {
  const t = Object.values(runs?.took ?? {}).map((x) => x?.secs).filter((x): x is number => typeof x === 'number');
  return t.length ? Math.max(...t) : null;
}

/** A card read longer than this means the router is struggling with it. */
export const SLOW_CARD_READ_SECS = 240;
