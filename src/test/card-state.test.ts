import { describe, expect, it } from 'vitest';
import { byAttention, cardState, demoCards, formatDataSize } from '@/lib/specimen-data';
const base = demoCards[0]!;
describe('Card state and data size', () => {
  it('formats 1,590 MB as 1.6 GB and 850 MB as MB', () => { expect(formatDataSize(1590)).toBe('1.6 GB'); expect(formatDataSize(850)).toBe('850 MB'); });
  it('marks a card almost finished below 20% remaining', () => { expect(cardState({ ...base, limitMB: 1000, downloadMB: 810, uploadMB: 0 })).toBe('almostFinished'); expect(cardState({ ...base, limitMB: 1000, downloadMB: 800, uploadMB: 0 })).toBe('inUse'); });
  it('treats an unused card as ready to sell and sorts attention first', () => { expect(cardState(demoCards[1]!)).toBe('unused'); expect(byAttention(demoCards)[0]!.id).toBe('DEMO-004'); });
});
