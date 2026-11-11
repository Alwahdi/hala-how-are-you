import { describe, expect, it } from 'vitest';
import { buildNewCardMessage, createDemoCards, demoCards, MAX_QUICK_ADD } from '@/lib/specimen-data';

describe('quick add demo cards', () => {
  it('continues numbering after existing cards and starts unused', () => {
    const c = createDemoCards(demoCards, 2, 3000, 'week', () => 0.5);
    expect(c.map(x => x.id)).toEqual(['DEMO-005', 'DEMO-006']);
    expect(c[0]).toMatchObject({ active: false, downloadMB: 0, limitMB: 3000, limitMinutes: 10080, code: '55000000' });
  });
  it('caps a single add at 20 cards', () => {
    expect(createDemoCards(demoCards, 500, 1000, 'day')).toHaveLength(MAX_QUICK_ADD);
  });
  it('builds a customer message with number, code and package', () => {
    const [c] = createDemoCards(demoCards, 1, 5000, 'month', () => 0);
    const m = buildNewCardMessage([c], 'en');
    expect(m).toContain('DEMO-005'); expect(m).toContain('10000000'); expect(m).toContain('5 GB'); expect(m).toContain('1 month');
  });
});
