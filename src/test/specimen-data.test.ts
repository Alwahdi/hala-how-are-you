import { describe, it, expect } from 'vitest';
import { formatNumber, searchCards } from '../lib/specimen-data';
describe('Latin display digits required by founder', () => {
  it('renders counts using 0–9', () => expect(formatNumber(1234)).toBe('1,234'));
  it('renders year using 0–9', () => expect(formatNumber(2026, {useGrouping:false})).toBe('2026'));
  it('renders percentage using 0–9', () => expect(formatNumber(0.125, {style:'percent', maximumFractionDigits:1})).toBe('12.5%'));
});
it('searches the concrete demonstration card', () => expect(searchCards('demo-002').map(c=>c.id)).toEqual(['DEMO-002']));