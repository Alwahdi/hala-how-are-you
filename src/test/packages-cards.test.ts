import { describe, expect, it } from 'vitest';
import { nextRun } from '@/lib/card-runs';
import { checkPackage, hotspotOnLogin, packageFacts, packageJobLine, rosDuration } from '@/lib/packages';
import { rosExpr, reportScriptSource, cardsScriptSource } from '@/lib/router-script';
import { parseRosDate, tzSeconds } from '@/lib/ros-date';
import { cardState, remaining, withPackage, type CardRow } from '@/lib/card-status';
import { bulkJobLine, cardJobLine, checkCardAction } from '@/lib/card-actions';
import { cardFromRow } from '@/lib/router-sync';

const card = (o: Partial<CardRow> = {}): CardRow => ({ router_id: 'r', source: 'usermanager', name: 'c1', profile: 'p1', uptime_s: 0, bytes: 0, limit_uptime_s: null, limit_bytes: null, disabled: false, comment: null, first_seen_at: '2026-11-01T00:00:00Z', synced_at: '2026-11-11T00:00:00Z', ...o });

describe('card runs: vanished cards are removed only after a complete run', () => {
  it('a run where every batch arrived removes what was not refreshed since its start', () => {
    let runs = nextRun({}, 'usermanager', 0, false, 'T0').runs;
    runs = nextRun(runs, 'usermanager', 1, false, 'T1').runs;
    expect(nextRun(runs, 'usermanager', 2, true, 'T2').complete).toBe('T0');
  });
  it('a missing batch means nothing is removed', () => {
    const runs = nextRun({}, 'usermanager', 0, false, 'T0').runs;
    expect(nextRun(runs, 'usermanager', 2, true, 'T2').complete).toBeNull();
  });
  it('a slow run never uses a fixed two-minute window (the old bug)', () => {
    let runs = nextRun({}, 'hotspot', 0, false, '2026-11-11T06:52:00Z').runs;
    for (let p = 1; p < 47; p++) runs = nextRun(runs, 'hotspot', p, false, `x${p}`).runs;
    expect(nextRun(runs, 'hotspot', 47, true, '2026-11-11T06:56:30Z').complete).toBe('2026-11-11T06:52:00Z');
  });
});

describe('packages', () => {
  it('refuses a validity shorter than the usage time', () => {
    expect(checkPackage({ source: 'usermanager', action: 'add', name: 'day', validityS: 86400, uptimeS: 2 * 86400 })).toBe('validity_short');
    expect(checkPackage({ source: 'usermanager', action: 'add', name: 'week', validityS: 7 * 86400, uptimeS: 5 * 3600 })).toBeNull();
  });
  it('package names are letters, digits, dot, dash and underscore only', () => {
    expect(checkPackage({ source: 'hotspot', action: 'add', name: 'باقة يوم' })).toBe('bad_name');
    expect(checkPackage({ source: 'hotspot', action: 'add', name: 'a;b' })).toBe('bad_name');
    expect(checkPackage({ source: 'hotspot', action: 'add', name: 'day-500' })).toBeNull();
  });
  it('writes durations the router understands', () => {
    expect(rosDuration(7 * 86400)).toBe('7d');
    expect(rosDuration(5 * 3600)).toBe('5h');
    expect(rosDuration(0)).toBe('0s');
  });
  it('a Hotspot package keeps price and validity the Mikhmon way and adds a per-card expiry timer', () => {
    const ol = hotspotOnLogin({ price: 500, validityS: 7 * 86400 });
    expect(ol.startsWith(':put (",ntf,500,7d,0,,Disable,");')).toBe(true);
    expect(ol).toContain('mikro-exp-');
    expect(ol).toContain('disabled=yes');
    expect(hotspotOnLogin({ price: 300 })).toBe(':put (",ntf,300,0,0,,Disable,");');
  });
  it('the package task line carries numbers only, then the login script', () => {
    const line = packageJobLine('J', { source: 'usermanager', action: 'add', name: 'g1', price: 1000, devices: 1, downKbps: 2000, upKbps: 512, validityS: 30 * 86400, uptimeS: 0, dataMB: 1024 })!;
    expect(line).toBe('pkg|J|usermanager|add|g1|1|2M|512k|30d|0s|1073741824|1000|-');
    expect(packageJobLine('J', { source: 'usermanager', action: 'add', name: 'bad name' })).toBeNull();
  });
  it('Hotspot data and time come from what most of its cards have', () => {
    const f = packageFacts({ source: 'hotspot', price: null, validity: null, rate_limit: null, shared_users: '1' }, [{ limit_bytes: 500, limit_uptime_s: null }, { limit_bytes: 500, limit_uptime_s: null }, { limit_bytes: 900, limit_uptime_s: null }]);
    expect(f.dataBytes).toBe(500); expect(f.fromCards).toBe(true);
  });
});

describe('router script pieces', () => {
  it('builds version-specific commands without letting values break out', () => {
    expect(rosExpr('find name="{n}" $x')).toBe(String.raw`("find name=\"" . $n . "\" \$x")`);
  });
  it('the report carries the router time zone and the new task types', () => {
    const s = reportScriptSource('a'.repeat(48));
    expect(s).toContain('gmt-offset');
    expect(s).toContain('"bulk|"');
    expect(s).toContain('"pkg|"');
    expect(s).toContain('$act = "renew"');
  });
  it('card reading sends packages first and protects every batch', () => {
    const s = cardsScriptSource('a'.repeat(48), 'um6');
    expect(s.indexOf('usermanager-profiles')).toBeLessThan(s.indexOf('usermanager-sessions'));
    expect(s.indexOf('usermanager-sessions')).toBeLessThan(s.lastIndexOf('\\"source\\":\\"usermanager\\"'));
    expect(s.match(/:do \{\/tool fetch/g)!.length).toBe(s.match(/\/tool fetch/g)!.length);
  });
});

describe('dates, expiry and what is left', () => {
  it('reads Mikhmon and v7 dates in router time', () => {
    expect(parseRosDate('nov/18/2026 10:00:00', 10800)).toBe('2026-11-18T07:00:00.000Z');
    expect(parseRosDate('2026-11-18 10:00:00', 0)).toBe('2026-11-18T10:00:00.000Z');
    expect(parseRosDate('vc-123-11.11.26', 0)).toBeNull();
    expect(parseRosDate('never', 0)).toBeNull();
    expect(tzSeconds('+03:00')).toBe(10800);
  });
  it('a Hotspot card note with a Mikhmon date becomes its expiry', () => {
    expect(cardFromRow('hotspot', ['u1', 'p', '1h', '0', '0', '', '', 'false', 'nov/18/2026 10:00:00', 'same'], 10800)?.expires_at).toBe('2026-11-18T07:00:00.000Z');
  });
  it('expired (days over) and used up (balance over) are different states', () => {
    const now = Date.parse('2026-11-11T00:00:00Z');
    expect(cardState(card({ uptime_s: 10, expires_at: '2026-11-10T00:00:00Z' }), now)).toBe('expired');
    expect(cardState(card({ uptime_s: 3600, limit_uptime_s: 3600 }), now)).toBe('finished');
  });
  it('User Manager cards take their limits from the package, and validity gives an estimated end', () => {
    const [c] = withPackage([card({ bytes: 300 * 1024 * 1024, first_used_at: '2026-11-09T00:00:00Z' })], [{ router_id: 'r', source: 'usermanager', name: 'p1', validity: '7d', extra: { transferLimit: '1073741824', uptimeLimit: '5h' } }]);
    expect(c!.limit_bytes).toBe(1073741824);
    expect(c!.limit_uptime_s).toBe(18000);
    expect(c!.expires_at).toBe('2026-11-16T00:00:00.000Z');
    expect(c!.expires_est).toBe(true);
    expect(remaining(c!).bytes).toBe(724 * 1024 * 1024);
  });
});

describe('card tasks', () => {
  it('renew carries the package or "-", never an unsafe value', () => {
    expect(checkCardAction({ source: 'usermanager', action: 'renew', name: 'c1', value: '100' })).toBeNull();
    expect(checkCardAction({ source: 'usermanager', action: 'renew', name: 'c1', value: 'a b' })).toBe('bad_value');
    expect(cardJobLine('J', { source: 'hotspot', action: 'renew', name: 'c1', value: '-' })).toBe('card|J|hotspot|renew|c1|-');
  });
  it('several cards: only off, on and remove; unsafe names dropped; at most 40', () => {
    expect(bulkJobLine('J', 'hotspot', 'renew', ['a'])).toBeNull();
    expect(bulkJobLine('J', 'hotspot', 'off', ['a', 'b c', 'd'])).toBe('bulk|J|hotspot|off|a,d');
    expect(bulkJobLine('J', 'usermanager', 'del', Array.from({ length: 50 }, (_, i) => `c${i}`))!.split('|')[4]!.split(',')).toHaveLength(40);
  });
});

describe('data amounts on a card', () => {
  it('shows a 10G limit from a 1000-based menu as 10 GB, not 9.3 GB', async () => {
    const { formatBytes, isDecimalSize } = await import('@/lib/card-status');
    expect(isDecimalSize(10_000_000_000)).toBe(true);
    expect(formatBytes(10_000_000_000, true)).toBe('10 GB');
    expect(isDecimalSize(2 * 1024 ** 3)).toBe(false);
    expect(formatBytes(2 * 1024 ** 3)).toBe('2.0 GB');
  });
});
