import { describe, expect, it } from 'vitest';
import { activeTotal, actionLogLabel, confirmedWrite, freshSession, packageKey, summarizeBulk } from '@/lib/operations-ui';

describe('operational UI evidence and outcomes', () => {
  const now = Date.parse('2026-11-12T01:00:00Z');
  const fresh = '2026-11-12T00:59:30Z';
  it('does not call a saved session live when its router is offline', () => {
    expect(freshSession({ router_id: 'r1', synced_at: fresh }, [{ id: 'r1', last_seen_at: '2026-11-11T01:00:00Z' }], now)).toBe(false);
    expect(freshSession({ router_id: 'r1', synced_at: fresh }, [{ id: 'r1', last_seen_at: fresh }], now)).toBe(true);
  });
  it('does not replace a report total with partial session details', () => {
    expect(activeTotal([{ last_seen_at: fresh, last_status: { hotspotActive: 1500 } }], now)).toBe(1500);
    expect(activeTotal([{ last_seen_at: '2026-11-11T01:00:00Z', last_status: { hotspotActive: 1500 } }], now)).toBeNull();
  });
  it('keeps same-name packages on two routers separate', () => {
    expect(packageKey({ router_id: 'r1', source: 'hotspot', name: '100' })).not.toBe(packageKey({ router_id: 'r2', source: 'hotspot', name: '100' }));
  });
  it('rejects failed persistence instead of confirming success', async () => {
    await expect(confirmedWrite(async () => ({ error: { message: 'denied' } }))).rejects.toThrow('save_failed');
    await expect(confirmedWrite(async () => ({ error: null }))).resolves.toBeUndefined();
  });
  it('keeps failed and expired bulk targets separate from successful counts', () => {
    expect(summarizeBulk([{ id: 'a', status: 'done', result: 'ok:2', payload: { names: ['1','2'] } }, { id: 'b', status: 'expired', result: null, payload: { names: ['3'] } }])).toEqual({ succeeded: 2, failed: 1, waiting: 0, retryIds: ['b'], over: true });
    expect(summarizeBulk([{ id: 'a', status: 'done', result: 'ok:1', payload: { names: ['1','2'] } }]).failed).toBe(1);
  });
  it('keeps package edits and renewals distinct from cleanup', () => {
    expect(actionLogLabel({ kind: 'package', payload: { action: 'edit', name: '100' } }, false)).toBe('Edit package 100');
    expect(actionLogLabel({ kind: 'card_action', payload: { action: 'renew', name: '123' } }, false)).toBe('Renew card 123');
  });
});