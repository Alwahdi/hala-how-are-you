import { describe, it, expect } from 'vitest';
import { yesterdayAt, buckets } from '@/lib/active-history';

const now = Date.parse('2026-11-11T12:00:00Z');
const at = (msAgo: number, v: number, r = 'a') => ({ router_id: r, created_at: new Date(now - msAgo).toISOString(), status: { hotspotActive: v } });

describe('active history', () => {
  it('compares with the same time yesterday, summing routers', () => {
    expect(yesterdayAt([at(86400_000 + 60_000, 30), at(86400_000, 5, 'b'), at(3600_000, 99)], now)).toBe(35);
  });
  it('has no comparison without a reading near yesterday', () => expect(yesterdayAt([at(3600_000, 10)], now)).toBeNull());
  it('builds 48 half-hour buckets for the day', () => {
    const b = buckets([at(10 * 60_000, 7)], now);
    expect(b).toHaveLength(48);
    expect(b[47]!.value).toBe(7);
    expect(b[0]!.value).toBeNull();
  });
});
