import { describe, expect, it } from 'vitest';
import { normalizeCloudAddress } from '@/lib/ip-cloud';
import { directAccessState } from '@/lib/router-script';
import { candidatePorts } from '@/lib/ip-cloud-probe';

describe('IP Cloud address cleaning', () => {
  it('strips scheme, www, path and spaces', () => expect(normalizeCloudAddress(' https://www.HMG0B67.sn.mynetname.net/webfig/ ')).toBe('hmg0b67.sn.mynetname.net'));
  it('takes the port from host:port', () => expect(normalizeCloudAddress('http://abc.sn.mynetname.net:8443')).toBe('abc.sn.mynetname.net:8443'));
  it('accepts Arabic digits in the port', () => expect(normalizeCloudAddress('abc.sn.mynetname.net', '٨٤٤٣')).toBe('abc.sn.mynetname.net:8443'));
  it('rejects private addresses', () => expect(normalizeCloudAddress('192.168.88.1')).toBeNull());
});

describe('direct access decision', () => {
  const base = { cloudName: 'a.sn.mynetname.net', apiDisabled: 'false', apiSslDisabled: 'true' };
  it('is unavailable behind NAT', () => expect(directAccessState({ ...base, behindNat: 'yes' })).toBe('unavailable'));
  it('is ready with a public address and API on', () => expect(directAccessState({ ...base, behindNat: 'no' })).toBe('ready'));
  it('needs the API when both API services are off', () => expect(directAccessState({ ...base, behindNat: 'no', apiDisabled: 'true' })).toBe('needs_api'));
  it('is unavailable without IP Cloud', () => expect(directAccessState({ ...base, cloudName: '', behindNat: 'no' })).toBe('unavailable'));
});

describe('port order', () => {
  it('tries encrypted 8729 before 8728', () => expect(candidatePorts({ apiPort: '8728', apiSslPort: '8729' })).toEqual([{ port: 8729, tls: true }, { port: 8728, tls: false }]));
  it('skips disabled services and puts a typed port first', () => expect(candidatePorts({ apiSslDisabled: 'true', apiPort: '8728' }, 9000)).toEqual([{ port: 9000, tls: true }, { port: 9000, tls: false }, { port: 8728, tls: false }]));
});
