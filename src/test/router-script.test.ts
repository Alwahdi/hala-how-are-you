import { describe, it, expect } from 'vitest';
import { buildFallbackCommand, buildSetupFile, majorVersion, buildPasteCommand, escapeRos, hashToken, isOnline, newToken } from '@/lib/router-script';

describe('router status push', () => {
  it('reports every 30 seconds', () => {
    expect(buildSetupFile('a'.repeat(48))).toContain('interval=30s');
  });
  it('paste and fallback commands are a single line (survive mobile terminals)', () => {
    const tok = 'a'.repeat(48);
    expect(buildPasteCommand(tok)).not.toMatch(/[\r\n]/);
    expect(buildFallbackCommand(tok)).not.toMatch(/[\r\n]/);
    expect(buildPasteCommand(tok)).toContain(`t=${tok}`);
    expect(buildFallbackCommand(tok)).toContain('[find name=mikro-report]; /system script remove');
  });
  it('setup file carries the token and scheduler', () => {
    const f = buildSetupFile('b'.repeat(48));
    expect(f).toContain('b'.repeat(48));
    expect(f).toContain('/system scheduler add name=mikro-report');
  });
  it('detects the RouterOS major version from the report', () => {
    expect(majorVersion('6.49.10 (long-term)')).toBe('v6');
    expect(majorVersion('7.15.3 (stable)')).toBe('v7');
    expect(majorVersion('')).toBeNull();
  });
  it('treats a router silent for over 90 seconds as offline', () => {
    const now = Date.now();
    expect(isOnline(new Date(now - 60_000).toISOString(), now)).toBe(true);
    expect(isOnline(new Date(now - 91_000).toISOString(), now)).toBe(false);
    expect(isOnline(null, now)).toBe(false);
  });
  it('escapes quotes and variables for RouterOS', () => {
    expect(escapeRos('"$x"')).toBe('\\"\\$x\\"');
  });
  it('tokens are 48 hex chars and hashes are stable', async () => {
    const t = newToken();
    expect(t).toMatch(/^[a-f0-9]{48}$/);
    expect(await hashToken(t)).toBe(await hashToken(t));
  });
});
