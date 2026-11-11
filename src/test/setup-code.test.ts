import { describe, expect, it } from 'vitest';
import { buildShortCommand, newSetupCode, normalizeSetupCode, openSetup, sealSetup, setupCodeHash } from '@/lib/setup-code';

describe('router setup codes', () => {
  it('short command stays short and on one line', () => {
    const cmd = buildShortCommand(newSetupCode());
    expect(cmd.length).toBeLessThan(160);
    expect(cmd).not.toMatch(/\n/);
    expect(cmd).toContain('/import file-name=mikro.rsc');
  });
  it('codes are 8 readable characters without look-alikes', () => {
    for (let i = 0; i < 200; i++) expect(newSetupCode()).toMatch(/^[2-9A-HJKMNP-Z]{8}$/);
  });
  it('accepts lowercase and a .rsc suffix, rejects junk', () => {
    expect(normalizeSetupCode('abcd2345')).toBe('ABCD2345');
    expect(normalizeSetupCode('ABCD2345.rsc')).toBe('ABCD2345');
    expect(normalizeSetupCode('ABCD0345')).toBeNull();
    expect(normalizeSetupCode('../etc')).toBeNull();
  });
  it('only the right code opens the sealed setup', async () => {
    const code = newSetupCode();
    const sealed = await sealSetup(code, { token: 'a'.repeat(48), password: 'p@ss' });
    expect(await openSetup(code, sealed)).toEqual({ token: 'a'.repeat(48), password: 'p@ss' });
    expect(await openSetup('ZZZZZZZZ', sealed)).toBeNull();
    expect(await setupCodeHash(code)).not.toContain(code);
  });
});
