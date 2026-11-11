import { describe, it, expect } from 'vitest';
import { detectStyle, sampleCard } from '@/lib/card-style';

describe('card style', () => {
  it('detects number-only digit cards with a shared prefix', () => {
    const cards = ['77012345', '77098765', '77055555', '77011111'].map((name) => ({ name, pw_mode: 'same' }));
    expect(detectStyle(cards)).toMatchObject({ mode: 'number_only', length: 8, charset: 'digits', prefix: '770' });
  });
  it('detects number + code when most cards have a different password', () => {
    const cards = ['a1b2c3', 'x9y8z7', 'k2m3n4'].map((name) => ({ name, pw_mode: 'other' }));
    expect(detectStyle(cards)).toMatchObject({ mode: 'number_password', charset: 'mixed' });
  });
  it('returns nothing without cards', () => expect(detectStyle([])).toBeNull());
  it('builds a sample in the style', () => {
    const c = sampleCard({ mode: 'number_password', length: 8, charset: 'digits', prefix: '77' }, () => 0.5);
    expect(c.user).toMatch(/^77\d{6}$/);
    expect(c.password).toMatch(/^\d{6}$/);
  });
});
