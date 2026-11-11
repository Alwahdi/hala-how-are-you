import { describe, it, expect } from 'vitest';
import { buildPasteCommand, escapeRos, hashToken, isOnline, majorVersion, newToken, reportScriptSource, shouldTryDirect } from '@/lib/router-script';

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
  it('creates the read-only API user on every version, removing the old user before its group', () => {
    const cmd = buildPasteCommand('a'.repeat(48), 'Abc123');
    expect(cmd).not.toContain(':if ([:pick [/system resource get version] 0 1] = "7") do={:do {:local f');
    expect(cmd.indexOf('/user remove [find name=mikro-read]')).toBeLessThan(cmd.indexOf('/user group remove [find name=mikro-read]'));
    expect(cmd).toContain(':do {/user add name=mikro-read group=mikro-read password=Abc123}');
    expect(buildPasteCommand('a'.repeat(48))).not.toContain('/user add');
  });
  it('reports whether the read-only user exists', () => {
    expect(reportScriptSource('a'.repeat(48))).toContain('[:len [/user find name=mikro-read]]');
  });
  it('tries the direct link automatically: at once, then every 3 minutes after a failure, never when the user is missing', () => {
    const ready = { cloudName: 'x.sn.mynetname.net', behindNat: 'no', apiDisabled: 'false', apiSslDisabled: 'true' };
    const now = Date.parse('2026-11-11T05:00:00Z');
    const fresh = { cloud_host: null, direct_port: null, last_check_error: null, direct_checked_at: null, cards_synced_at: null };
    expect(shouldTryDirect(fresh, ready, now)).toBe(true);
    const failed = { ...fresh, cloud_host: 'x', last_check_error: 'auth', direct_checked_at: new Date(now - 60_000).toISOString() };
    expect(shouldTryDirect(failed, ready, now)).toBe(false);
    expect(shouldTryDirect({ ...failed, direct_checked_at: new Date(now - 180_000).toISOString() }, ready, now)).toBe(true);
    expect(shouldTryDirect(fresh, { ...ready, apiUser: 0 }, now)).toBe(false);
    expect(shouldTryDirect(fresh, { ...ready, behindNat: 'yes' }, now)).toBe(false);
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
