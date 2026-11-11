import { describe, expect, it } from 'vitest';
import { biggestSession, buildCustomerMessage, demoCards, filterCards, sessionsOf } from '@/lib/specimen-data';
const c3 = demoCards.find(c => c.id === 'DEMO-003')!;
describe('Customer reply message', () => {
  it('session totals match each card', () => { for (const c of demoCards) { const s = sessionsOf(c); expect(s.reduce((a, x) => a + x.downloadMB, 0)).toBe(c.downloadMB); expect(s.reduce((a, x) => a + x.uploadMB, 0)).toBe(c.uploadMB); expect(s.reduce((a, x) => a + x.minutes, 0)).toBe(c.usedMinutes); } });
  it('Arabic short message has package, remaining, time and session count', () => { const m = buildCustomerMessage(c3, 'ar', 'short'); expect(m).toContain('الباقة: 5 GB'); expect(m).toContain('المتبقي: 1.6 GB'); expect(m).toContain('في 3 جلسة'); expect(m).toContain('مشاهدة الفيديو'); });
  it('detailed English message names the biggest session', () => { expect(biggestSession(sessionsOf(c3))!.device).toBe('Smart TV'); expect(buildCustomerMessage(c3, 'en', 'detailed')).toContain('Biggest session: 2.6 GB on Smart TV'); });
  it('filters by number and state', () => { expect(filterCards(demoCards, '004', 'all').map(c => c.id)).toEqual(['DEMO-004']); expect(filterCards(demoCards, '', 'unused').map(c => c.id)).toEqual(['DEMO-002']); expect(filterCards(demoCards, '999', 'all')).toHaveLength(0); });
});
