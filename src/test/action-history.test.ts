import { describe, expect, it } from 'vitest';
import { actionHistoryLabel } from '@/lib/action-history';
describe('Action history distinguishes operations',()=>{
  it('does not call a card renewal cleanup',()=>expect(actionHistoryLabel('card_action',{action:'renew'},false)).toBe('Renew card'));
  it('identifies package removal',()=>expect(actionHistoryLabel('package_action',{action:'del'},false)).toBe('Remove package'));
  it('distinguishes a router reboot',()=>expect(actionHistoryLabel('reboot',null,false)).toBe('Router restart'));
});