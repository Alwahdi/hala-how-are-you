import { describe, expect, it } from 'vitest';
import { normalizeCloudAddress } from '@/lib/ip-cloud';
import { directAccessState } from '@/lib/router-script';

describe('IP Cloud address cleaning', () => {
  it('strips scheme, www, path and spaces', () => expect(normalizeCloudAddress(' https://www.HMG0B67.sn.mynetname.net/webfig/ ')).toBe('hmg0b67.sn.mynetname.net'));
  it('takes the port from host:port', () => expect(normalizeCloudAddress('http://abc.sn.mynetname.net:8443')).toBe('abc.sn.mynetname.net:8443'));
  it('accepts Arabic digits in the port', () => expect(normalizeCloudAddress('abc.sn.mynetname.net', '٨٤٤٣')).toBe('abc.sn.mynetname.net:8443'));
  it('rejects private addresses', () => expect(normalizeCloudAddress('192.168.88.1')).toBeNull());
});

describe('direct access decision', () => {
  const base = { version: '7.24.4', cloudName: 'a.sn.mynetname.net', sslDisabled: 'false' };
  it('is unavailable behind NAT', () => expect(directAccessState({ ...base, behindNat: 'yes' })).toBe('unavailable'));
  it('is ready with a public address on the router', () => expect(directAccessState({ ...base, behindNat: 'no' })).toBe('ready'));
  it('needs HTTPS when www-ssl is off', () => expect(directAccessState({ ...base, behindNat: 'no', sslDisabled: 'true' })).toBe('needs_https'));
  it('is unavailable on v6', () => expect(directAccessState({ ...base, version: '6.49', behindNat: 'no' })).toBe('unavailable'));
});
