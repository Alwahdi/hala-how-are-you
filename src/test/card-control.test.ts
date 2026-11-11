import { describe, expect, it } from 'vitest';
import { cardJobLine, checkCardAction, humanDevices, humanRate, humanValidity, parseMikhmon, umStatus } from '@/lib/card-actions';
import { cardFromRow, parseActiveList, profileFromRow } from '@/lib/router-sync';
import { cardState } from '@/lib/card-status';
import { buildSetupScript, cardsScriptSource, reportScriptSource } from '@/lib/router-script';

const card = { uptime_s: 0, bytes: 0, limit_uptime_s: null, limit_bytes: null, disabled: false };

describe('card actions sent to the router', () => {
  it('only lets safe names and values through (nothing that can break out of a RouterOS command)', () => {
    expect(checkCardAction({ source: 'hotspot', action: 'pw', name: '0123', value: 'ab12' })).toBeNull();
    for (const v of ['a b', 'x"y', 'a;b', '$x', 'a[b]', '', 'x'.repeat(33)]) expect(checkCardAction({ source: 'hotspot', action: 'pw', name: '0123', value: v })).toBe('bad_value');
    expect(checkCardAction({ source: 'hotspot', action: 'off', name: 'a"b' })).toBe('bad_name');
    expect(checkCardAction({ source: 'hotspot', action: 'reboot', name: '0123' })).toBe('bad_action');
    expect(checkCardAction({ source: 'pppoe', action: 'off', name: '0123' })).toBe('bad_action');
    expect(checkCardAction({ source: 'usermanager', action: 'name', name: 'u1', value: 'u1' })).toBe('same_name');
  });
  it('builds the fixed reply line, with "-" when the action has no value', () => {
    expect(cardJobLine('J1', { source: 'hotspot', action: 'off', name: '0123' })).toBe('card|J1|hotspot|off|0123|-');
    expect(cardJobLine('J1', { source: 'usermanager', action: 'pw', name: 'u1', value: 'k9' })).toBe('card|J1|usermanager|pw|u1|k9');
    expect(cardJobLine('J1', { source: 'hotspot', action: 'pw', name: 'u1', value: null })).toBeNull();
  });
  it('the router script runs card actions on Hotspot and on User Manager v6 (/tool) and v7', () => {
    const s = reportScriptSource('t'.repeat(48));
    expect(s).toContain('"card|"');
    expect(s).toContain('/tool user-manager user');
    expect(s).toContain('/ip hotspot user set $u password=$v');
  });
});

describe('User Manager v6 and v7 reading', () => {
  it('installs the v6 reader on v6 and the v7 reader on v7', () => {
    const setup = buildSetupScript('t'.repeat(48));
    expect(setup).toContain('/tool user-manager user find');
    expect(setup).toContain('/user-manager user-profile find');
    expect(cardsScriptSource('t', 'um6')).toContain('/tool user-manager profile profile-limitation');
    expect(cardsScriptSource('t', 'um6')).not.toContain('[/user-manager ');
  });
  it('reads a v6 card row with usage, and still reads rows from older scripts', () => {
    expect(cardFromRow('usermanager', ['u111', 'um10', '1h', '1000', '24', 'false', '', 'same'])).toMatchObject({ name: 'u111', profile: 'um10', uptime_s: 3600, bytes: 1024, pw_mode: 'same' });
    expect(cardFromRow('usermanager', ['u1', 'g', 'false', 'c', 'other'])).toMatchObject({ name: 'u1', profile: 'g', pw_mode: 'other' });
  });
  it('says "not installed", "off", "needs reconnect" or "on" from the report', () => {
    expect(umStatus({ umi: ',' })).toBe('missing');
    expect(umStatus({ umi: 'pkg,false', umr: 1 })).toBe('off');
    expect(umStatus({ umi: 'pkg,', umr: 0 })).toBe('on_no_reader');
    expect(umStatus({ umi: 'pkg,true', umr: 1 })).toBe('on');
    expect(umStatus({})).toBe('unknown');
  });
  it('v7 card state comes from User Manager itself', () => {
    expect(cardState({ ...card, um_state: 'used' })).toBe('finished');
    expect(cardState({ ...card, um_state: 'running-active' })).toBe('active');
    expect(cardState({ ...card, um_state: 'waiting' })).toBe('unused');
    expect(cardState({ ...card, disabled: true, um_state: 'running' })).toBe('disabled');
  });
});

describe('packages in owner words', () => {
  it('reads price and validity that Mikhmon keeps in on-login', () => {
    expect(parseMikhmon(':put (",rem,1000,1d,1200,,Disable,"); :local x 1;')).toEqual({ mode: 'rem', price: '1000', validity: '1d', sellPrice: '1200', lock: 'Disable' });
    expect(parseMikhmon(',ntfc,500,12h,0,,Enable,')).toMatchObject({ price: '500', validity: '12h', sellPrice: '' });
    expect(parseMikhmon(':log info "hello"')).toBeNull();
  });
  it('hotspot package: Mikhmon price wins, zero limits are dropped', () => {
    const p = profileFromRow('hotspot', ['p1000', '512k/2M', '1', '1d00:00:00', 'none', '2m', '', 'rem,1000,1d,1200,,Disable,'.replace(/^/, ',')]);
    expect(p).toMatchObject({ name: 'p1000', price: '1000', sell_price: '1200', validity: '1d', rate_limit: '512k/2M', shared_users: '1' });
    expect(p?.extra).not.toHaveProperty('idle');
  });
  it('User Manager package: limitation speed, no "00:00:00" or "off" noise', () => {
    const p = profileFromRow('usermanager', ['um10', '10 GB', '4w2d00:00:00', '3000', 'off', '1000000/4000000', '00:00:00', '10000000000']);
    expect(p).toMatchObject({ price: '3000', shared_users: null, rate_limit: '1000000/4000000' });
    expect(p?.extra).toEqual({ forUsers: '10 GB', transferLimit: '10000000000' });
  });
  it('speed, time and devices read like an owner says them', () => {
    expect(humanRate('384k/1536k', true)).toBe('1.5 ميجا تنزيل · 384 ك رفع');
    expect(humanRate('1000000/4000000', false)).toBe('4 Mbps down · 1 Mbps up');
    expect(humanRate('0/0', true)).toBeNull();
    expect(humanValidity('4w2d00:00:00', true)).toBe('30 يوم');
    expect(humanValidity('1d', true)).toBe('يوم');
    expect(humanValidity('3d12h', true)).toBe('3 أيام و12 ساعة');
    expect(humanDevices('1', true)).toBe('جهاز واحد');
  });
});

describe('who is online', () => {
  it('reads the compact list from the 30-second report', () => {
    expect(parseActiveList('0123|AA:BB|5m|2048;u1|CC|1h|0;')).toEqual([
      { source: 'hotspot', username: '0123', mac: 'AA:BB', uptime_s: 300, bytes: 2048, address: null },
      { source: 'hotspot', username: 'u1', mac: 'CC', uptime_s: 3600, bytes: 0, address: null },
    ]);
  });
});
