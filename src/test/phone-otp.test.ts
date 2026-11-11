import { describe, it, expect } from 'vitest';
import { hashOtp, newOtp, normalizePhone, signProof, verifyProof, OTP_MAX_ATTEMPTS, OTP_TTL_MS, PROOF_TTL_MS } from '@/lib/phone-otp';
import { readOnlyUserCommands, normalizeCloudAddress, normalizeCloudHost } from '@/lib/ip-cloud';

describe('phone verification', () => {
  it('normalises Yemeni, Egyptian and Syrian mobiles', () => {
    expect(normalizePhone('771234567', '+967')).toBe('+967771234567');
    expect(normalizePhone('01012345678', '+20')).toBe('+201012345678');
    expect(normalizePhone('00963944567890')).toBe('+963944567890');
    expect(normalizePhone('123', '+967')).toBeNull();
  });
  it('codes are 6 digits, expire after 10 minutes, allow 5 attempts', () => {
    expect(newOtp()).toMatch(/^\d{6}$/);
    expect(OTP_TTL_MS).toBe(600_000);
    expect(OTP_MAX_ATTEMPTS).toBe(5);
  });
  it('code hash depends on the phone', async () => {
    expect(await hashOtp('s', '+967771234567', '123456')).not.toBe(await hashOtp('s', '+967771234568', '123456'));
  });
  it('proof verifies, rejects tampering and expires after 30 minutes', async () => {
    const now = Date.now();
    const p = await signProof('s', '+967771234567', now);
    expect(await verifyProof('s', p, now)).toBe('+967771234567');
    expect(await verifyProof('s', p.replace('+967771234567', '+967771234568'), now)).toBeNull();
    expect(await verifyProof('other', p, now)).toBeNull();
    expect(await verifyProof('s', p, now + PROOF_TTL_MS + 1)).toBeNull();
  });
});

describe('IP Cloud connection', () => {
  it('accepts IP Cloud names and rejects private addresses', () => {
    expect(normalizeCloudHost('https://abcd1234.sn.mynetname.net/')).toBe('abcd1234.sn.mynetname.net');
    expect(normalizeCloudHost('192.168.88.1')).toBeNull();
    expect(normalizeCloudHost('100.64.1.1')).toBeNull();
    expect(normalizeCloudHost('localhost')).toBeNull();
  });
  it('accepts a custom HTTPS port, separately or after the name', () => {
    expect(normalizeCloudAddress('abcd1234.sn.mynetname.net', 8443)).toBe('abcd1234.sn.mynetname.net:8443');
    expect(normalizeCloudAddress('abcd1234.sn.mynetname.net:9443')).toBe('abcd1234.sn.mynetname.net:9443');
    expect(normalizeCloudAddress('abcd1234.sn.mynetname.net', 443)).toBe('abcd1234.sn.mynetname.net');
    expect(normalizeCloudAddress('abcd1234.sn.mynetname.net', '')).toBe('abcd1234.sn.mynetname.net');
    expect(normalizeCloudAddress('abcd1234.sn.mynetname.net', 70000)).toBeNull();
    expect(normalizeCloudAddress('192.168.88.1:8443')).toBeNull();
  });
  it('setup user can read but never write, in one line', () => {
    const cmd = readOnlyUserCommands('pw');
    expect(cmd).not.toMatch(/[\r\n]/);
    expect(cmd).toContain('policy=read,api}');
    expect(cmd).not.toMatch(/policy=[^\n]*(?<!!)write,/);
  });
});
