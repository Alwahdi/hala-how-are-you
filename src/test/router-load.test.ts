import { describe, expect, it } from 'vitest';
import { cardsScriptSource, reportScriptSource, FULL_EVERY_CARDS, FULL_EVERY_RUNS, CARD_BATCH } from '@/lib/router-script';
import { cardReadSecs } from '@/lib/card-runs';
import { checkHealth } from '@/lib/router-health';
import { BASE, CARDS } from '@/lib/ip-cloud-probe';

// Rules from the founder's RB2011 (v6, 3,000+ User Manager cards) that sat at 100% CPU.
describe('router load', () => {
  it('never starts a card run while the previous one is still going', () => {
    expect(cardsScriptSource('a'.repeat(48), 'um6').startsWith(':if ([:len [/system script job find where script="mikro-um"]] < 2) do={')).toBe(true);
    expect(cardsScriptSource('a'.repeat(48), 'hotspot')).toContain('script="mikro-cards"]] < 2');
  });
  it('reads the full card list every 30 minutes above 1,000 cards, packages every run', () => {
    expect(FULL_EVERY_CARDS).toBe(1000);
    expect(FULL_EVERY_RUNS * 5).toBe(30);
    const s = cardsScriptSource('a'.repeat(48), 'um6');
    expect(s).toContain('<= 1000) || (($mikroUmTick % 6) = 0)');
    expect(s.indexOf('usermanager-profiles')).toBeLessThan(s.indexOf(':if ($full) do={'));
  });
  it('reads User Manager with one list instead of one request per card, in batches of 100', () => {
    const s = cardsScriptSource('a'.repeat(48), 'um6');
    expect(s).toContain('[/tool user-manager user print as-value]');
    expect(s).not.toContain(':foreach u in=[/tool user-manager user find]');
    expect(CARD_BATCH).toBe(100);
  });
  it('never scans User Manager session history (every 30 seconds or every 5 minutes)', () => {
    expect(reportScriptSource('a'.repeat(48))).not.toContain('session find');
    expect(cardsScriptSource('a'.repeat(48), 'um6')).not.toContain('session find');
  });
  it('checks the direct link with three quick reads and never asks for User Manager lists', () => {
    expect(BASE.length).toBe(3);
    expect(JSON.stringify([...BASE, ...CARDS])).not.toContain('user-manager');
  });
  it('records how long a complete card read took and warns above 4 minutes', () => {
    expect(cardReadSecs({ took: { hotspot: { secs: 12, at: 'x' }, usermanager: { secs: 570, at: 'y' } } })).toBe(570);
    expect(cardReadSecs({ usermanager: { at: 'x', pages: 3 } })).toBeNull();
    expect(checkHealth({ cardsSecs: 570 }).some((i) => i.id === 'cards_slow')).toBe(true);
    expect(checkHealth({ cardsSecs: 40 }).some((i) => i.id === 'cards_slow')).toBe(false);
  });
});
