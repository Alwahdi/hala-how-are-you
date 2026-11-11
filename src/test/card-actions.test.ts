import { describe, expect, it } from 'vitest';
import { cardState, createDemoCards, demoCards, remainingMB, renewCard, smsLink, validateManualId, whatsappLink } from '@/lib/specimen-data';
const c4 = demoCards.find(c => c.id === 'DEMO-004')!;
describe('card actions (demo)', () => {
  it('rejects a typed card number that already exists', () => { expect(validateManualId(demoCards, 'demo-004')).toBe('taken'); expect(validateManualId(demoCards, '')).toBe('empty'); expect(validateManualId(demoCards, 'A B')).toBe('format'); expect(validateManualId(demoCards, 'shop-77')).toBeNull(); });
  it('creates one card with the typed number', () => { expect(createDemoCards(demoCards, 1, 1000, 'day', () => 0, 'shop-77')[0]!.id).toBe('SHOP-77'); expect(createDemoCards(demoCards, 1, 1000, 'day', () => 0, 'DEMO-001')).toHaveLength(0); });
  it('renewing adds the package to the same card', () => { const r = renewCard(c4, 1000); expect(r.limitMB).toBe(2000); expect(remainingMB(r)).toBe(1150); expect(cardState(r)).toBe('inUse'); });
  it('a disabled card reads as disabled', () => { expect(cardState({ ...c4, disabled: true })).toBe('disabled'); });
  it('builds WhatsApp and SMS links with the customer number', () => { expect(whatsappLink('hi', '+967 777 123')).toBe('https://wa.me/967777123?text=hi'); expect(smsLink('hi', '+967 777')).toBe('sms:+967777?&body=hi'); });
});
