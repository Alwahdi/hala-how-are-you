import { describe, it, expect } from 'vitest';
import { buildPasteCommand, escapeRos, hashToken, isOnline, newToken } from '@/lib/router-script';

describe('router status push', () => {
  it('reports every 30 seconds', () => {
    expect(buildPasteCommand('a'.repeat(48))).toContain('interval=30s');
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
