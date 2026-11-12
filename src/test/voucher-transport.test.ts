import {expect,it} from 'vitest';
import {voucherChunkScript,voucherCommands} from '@/lib/voucher-router';
const task={id:'00000000-0000-4000-8000-000000000001',source:'hotspot',name:'00123',password:'test',profile:'basic',bytes:629145600,time:18000};
const build=(tasks=[task])=>voucherChunkScript(tasks,'6.49.19','00000000-0000-4000-8000-000000000002','a'.repeat(48),'https://example.invalid/result');
it('rejects more than 100 accounts in a transport part',()=>{expect(()=>build(Array.from({length:101},()=>task))).toThrow('invalid_chunk');});
it('rejects command injection before dispatch',()=>{expect(()=>build([{...task,name:'bad";remove'}])).toThrow('unsafe_value');});
it('keeps account receipt and rejects foreign existing account on retry',()=>{const script=voucherCommands('hotspot','6','00123','test','basic','vc-test',629145600,18000,true);expect(script).toContain(':error "exists"');expect(script).toContain('credentials_changed');expect(script).not.toContain('password=');});
it('preserves concrete hotspot quota and uptime in the dispatched account',()=>{const script=build();expect(script).toContain('limit-bytes-total=629145600');expect(script).toContain('limit-uptime=18000s');});