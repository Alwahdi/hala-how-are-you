import { describe, expect, it } from 'vitest';
import { demoCards, remainingMB } from '@/lib/specimen-data';
describe('Illustrative voucher allowances', () => {
  it('uses combined upload/download for the demonstrated 68.2% usage', () => {
    const card = demoCards[2];
    if (!card) throw new Error('Missing demonstration card');
    expect(card.downloadMB + card.uploadMB).toBe(3410);
    expect((card.downloadMB + card.uploadMB) / card.limitMB * 100).toBe(68.2);
    expect(remainingMB(card)).toBe(1590);
  });
});