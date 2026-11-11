import { describe, it, expect } from 'vitest';
import { cardsToClean, evaluateRouter, localClock, lowPackages, uptimeSeconds } from '@/lib/watch-rules';

const now = Date.parse('2026-11-11T12:00:00Z');
const ago = (ms: number) => new Date(now - ms).toISOString();

describe('background watcher rules', () => {
  it('alerts once when a router is silent for 3 minutes, then when it is back', () => {
    const a = evaluateRouter('R', ago(4 * 60_000), {}, {}, now);
    expect(a.alerts.map((x) => x.kind)).toEqual(['router_down']);
    expect(evaluateRouter('R', ago(5 * 60_000), {}, a.state, now).alerts).toHaveLength(0);
    const back = evaluateRouter('R', ago(10_000), {}, a.state, now);
    expect(back.alerts.map((x) => x.kind)).toEqual(['router_up']);
  });
  it('does not alert for a router silent under 3 minutes', () => expect(evaluateRouter('R', ago(2 * 60_000), {}, {}, now).alerts).toHaveLength(0));
  it('alerts high CPU only after 3 readings in a row, and at most once an hour', () => {
    let s = {};
    for (let i = 0; i < 2; i++) { const r = evaluateRouter('R', ago(5000), { cpu: 95 }, s, now); expect(r.alerts).toHaveLength(0); s = r.state; }
    const third = evaluateRouter('R', ago(5000), { cpu: 95 }, s, now);
    expect(third.alerts.map((x) => x.kind)).toEqual(['router_strain']);
    expect(evaluateRouter('R', ago(5000), { cpu: 95 }, third.state, now + 10 * 60_000).alerts).toHaveLength(0);
  });
  it('detects an unexpected restart when uptime goes back', () => {
    const r = evaluateRouter('R', ago(5000), { uptime: '45s' }, { lastUptime: 86400 }, now);
    expect(r.alerts[0]).toMatchObject({ kind: 'router_restart', severity: 'warn' });
  });
  it('reports a requested restart as success', () => {
    const r = evaluateRouter('R', ago(5000), { uptime: '50s' }, { lastUptime: 86400, rebootAt: ago(60_000) }, now);
    expect(r.alerts[0]).toMatchObject({ kind: 'router_restart', severity: 'ok' });
  });
  it('parses RouterOS uptime', () => {
    expect(uptimeSeconds('2d20:14:07')).toBe(2 * 86400 + 20 * 3600 + 14 * 60 + 7);
    expect(uptimeSeconds('1w1d00:00:01')).toBe(8 * 86400 + 1);
    expect(uptimeSeconds('5m3s')).toBe(303);
  });
  it('warns when a package with 30+ cards has under 20 ready', () => {
    const cards = [...Array(15).fill({ profile: '200', state: 'unused' }), ...Array(20).fill({ profile: '200', state: 'finished' }), ...Array(5).fill({ profile: 'VIP', state: 'unused' })];
    expect(lowPackages(cards)).toEqual([{ name: '200', ready: 15 }]);
  });
  it('removes only Hotspot cards finished for at least the chosen days', () => {
    const cards = [{ name: 'a1', source: 'hotspot', finished_at: ago(4 * 86400_000) }, { name: 'b2', source: 'hotspot', finished_at: ago(86400_000) }, { name: 'c3', source: 'usermanager', finished_at: ago(9 * 86400_000) }, { name: 'd4', source: 'hotspot', finished_at: null }];
    expect(cardsToClean(cards, 3, now)).toEqual(['a1']);
  });
  it('uses the owner local clock for the daily report', () => expect(localClock(180, now)).toEqual({ date: '2026-11-11', hour: 15 }));
});
