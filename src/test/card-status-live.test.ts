import { describe, expect, it } from 'vitest';
import { cardState, formatBytes } from '@/lib/card-status';

const c = (o: Partial<Parameters<typeof cardState>[0]>) => ({ uptime_s: 0, bytes: 0, limit_uptime_s: null, limit_bytes: null, disabled: false, ...o });
describe('live card state', () => {
  it('unused when nothing consumed', () => expect(cardState(c({}))).toBe('unused'));
  it('almost used up at 80% of time', () => expect(cardState(c({ uptime_s: 2880, limit_uptime_s: 3600 }))).toBe('almost'));
  it('finished at the data limit', () => expect(cardState(c({ bytes: 1000, limit_bytes: 1000 }))).toBe('finished'));
  it('disabled wins', () => expect(cardState(c({ disabled: true, uptime_s: 10 }))).toBe('disabled'));
  it('formats bytes', () => expect(formatBytes(1536 * 1024)).toBe('1.5 MB'));
});
