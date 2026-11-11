import { describe, it, expect } from 'vitest';
import { checkHealth, healthScore, parseRouterDate } from '@/lib/router-health';

const now = Date.parse('2026-11-11T12:00:00Z');
describe('router health', () => {
  it('a clean router scores 100', () => {
    const i = checkHealth({ version: '7.24.4 (stable)', freeHdd: 70, totalHdd: 100, freeMemory: 60, totalMemory: 100, ntp: 'true', clockDate: '2026-11-11', services: 'api,winbox', socks: 'false', proxy: 'false', users: 2, idle: '5m', shared: '1' }, now);
    expect(i).toEqual([]); expect(healthScore(i)).toBe(100);
  });
  it('flags the Winbox-vulnerable v6 and socks as critical', () => {
    const ids = checkHealth({ version: '6.40.1', socks: 'true' }, now).filter((x) => x.severity === 'critical').map((x) => x.id);
    expect(ids).toEqual(['version_vuln', 'proxy']);
  });
  it('flags a wrong router date (old and new formats)', () => {
    expect(parseRouterDate('nov/11/2026')).toBe(Date.UTC(2026, 10, 11));
    expect(checkHealth({ clockDate: 'jan/01/1970' }, now).map((x) => x.id)).toContain('clock');
  });
  it('gives fix commands for time sync, idle timeout and unsafe services', () => {
    const i = checkHealth({ ntp: 'false', idle: 'none', services: 'telnet,ftp,api' }, now);
    expect(i.find((x) => x.id === 'services')?.fix).toBe('/ip service set telnet disabled=yes; /ip service set ftp disabled=yes');
    expect(healthScore(i)).toBe(70);
  });
});
