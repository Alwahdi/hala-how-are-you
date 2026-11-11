import { describe, it, expect } from 'vitest';
import { buildPasteCommand, escapeRos, hashToken, isOnline, majorVersion, newToken, reportScriptSource } from '@/lib/router-script';

describe('router status push', () => {
  it('reports every 30 seconds', () => {
    expect(buildPasteCommand('a'.repeat(48))).toContain('interval=30s');
  });
  it('the paste command is one line with no download from our site', () => {
    const cmd = buildPasteCommand('a'.repeat(48), 'Abc123');
    expect(cmd).not.toMatch(/[\r\n]/);
    expect(cmd).not.toContain('router-setup');
    expect(cmd).toContain('[find name=mikro-report]; /system script remove');
  });
  it('creates the read-only user only on v7, compiled at run time so v6 skips it', () => {
    const cmd = buildPasteCommand('a'.repeat(48), 'Abc123');
    expect(cmd).toContain(':if ([:pick [/system resource get version] 0 1] = "7")');
    expect(cmd).toContain(':parse "/user group remove');
    expect(cmd).toContain('password=Abc123');
    expect(buildPasteCommand('a'.repeat(48))).not.toContain('/user add');
  });
  it('reports the IP Cloud name and HTTPS port', () => {
    const src = reportScriptSource('a'.repeat(48));
    expect(src).toContain('/ip cloud get dns-name');
    expect(src).toContain('/ip service get www-ssl port');
  });
  it('keeps version-specific syntax out of the compiled script (works on v6 and v7)', () => {
    const f = buildPasteCommand('c'.repeat(48));
    expect(f).not.toContain('[/system health get [find');
    expect(f).toContain(':parse');
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
