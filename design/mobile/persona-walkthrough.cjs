const fs=require('fs'),vm=require('vm'),assert=require('assert');
const {parseHTML}=require('linkedom');
const source=fs.readFileSync(__dirname+'/mikro-network-hub.html','utf8');
const base=source.match(/<script>([\s\S]*?)<\/script>/)[1].replace(/\r\n/g,'\n').replace('\n})();','\nglobalThis.qa={state,routers,go,render,cardStore,routerPlans,writable};\n})();');
const tasks=[];let checked=0;
function session(id){const {window,document}=parseHTML(source);const timers=new Map();let serial=0;window.openai={setWidgetState:async()=>{}};const scope={window,document,Intl,URL,console,setTimeout:fn=>{timers.set(++serial,fn);return serial;},clearTimeout:id=>timers.delete(id)};vm.runInNewContext(base,scope);const root=document.getElementById('mikro-network-hub'),Q=scope.qa;const task={id,steps:[],observations:{}};tasks.push(task);
 const snap=label=>{const main=root.querySelector('main');task.steps.push({label,page:Q.state.page,text:main.textContent.replace(/\s+/g,' ').trim(),actions:[...main.querySelectorAll('button[data-do]')].map(b=>({action:b.dataset.do,label:b.textContent.trim(),disabled:b.disabled}))});};
 const click=a=>{const el=root.querySelector('[data-do="'+a+'"]');assert(el,id+' missing '+a);assert(!el.disabled,id+' disabled '+a);el.dispatchEvent(new window.Event('click',{bubbles:true,cancelable:true}));};
 const input=(id,value,event='input')=>{const el=root.querySelector('#'+id);assert(el,'Missing input '+id);if(el.tagName==='SELECT')Object.defineProperty(el,'value',{value,configurable:true});else el.value=value;el.dispatchEvent(new window.Event(event,{bubbles:true}));};
 const observe=(label,value)=>{task.observations[label]=value;};
 const expect=(condition,label)=>{assert(condition,id+' '+label);checked++;};
 const flush=()=>{for(const [id,fn]of [...timers]){timers.delete(id);fn();}};
 return {Q,root,snap,click,input,observe,expect,flush};}
{
 const {Q,root,snap,click,input,observe,expect}=session('T01-first-launch-and-connection');
 click('first-use');snap('First opening');input('mo-phone','+967700000000');click('register');snap('Optional profile');click('skip-profile');click('new-router');snap('Single connection card');input('mo-host','https://router.example.net:8778/webfig/');input('mo-scenario','timeout','change');click('check-connection');snap('Unreachable remote host');expect(Q.state.port==='8778'&&Q.state.page==='connection-result','Pasted API port retained through a failed connection');observe('requires_phone_before_local_workspace',true);observe('actual_authentication_or_discovery',false);
}
{
 const {Q,root,snap,click,input,observe,expect}=session('T02-complaint-and-source-choice');
 click('go:lookup');input('mo-lookup','٠٠١٢٣٨٧٤');click('find-card');snap('Duplicate number across account sources');expect(Q.state.page==='lookup-results','Duplicate is not silently resolved');observe('contextual_system_help_on_results',!!root.querySelector('main .op-help'));click('open-card:hotspot:00123874');snap('Explain an exhausted data voucher');click('go:share');snap('Report preview');expect(!root.querySelector('.dw-report').textContent.includes('MAC'),'Public report omits device MAC by default');click('channel:sms');click('share-review');snap('Recipient handoff preview');observe('real_message_sent',false);
}
{
 const {Q,root,snap,click,input,observe,expect}=session('T03-time-limit-only');
 const c=Q.cardStore().find(c=>c.key==='hotspot:00123874');Object.assign(c,{used:200,total:600,minutes:300,limitMinutes:300,validity:'running',status:'expired'});click('go:lookup');input('mo-lookup',c.number);click('find-card');click('open-card:'+c.key);snap('Online time exhausted with data remaining');const text=root.querySelector('main').textContent;observe('remaining_data_message_despite_time_exhausted',text.includes('ما زال هناك رصيد'));expect(text.includes('300 / 300'),'Time evidence present');click('go:share');snap('Customer report of time-only exhaustion');
}
{
 const {Q,root,snap,click,input,observe,expect}=session('T04-expired-validity-only');
 const c=Q.cardStore().find(c=>c.key==='hotspot:00123874');Object.assign(c,{used:200,total:600,minutes:50,limitMinutes:300,validity:'expired',status:'expired'});click('go:lookup');input('mo-lookup',c.number);click('find-card');click('open-card:'+c.key);snap('Validity exhausted with time and data remaining');observe('incorrect_validity_label',root.querySelector('main').textContent.includes('سارية في المثال'));expect(Q.cardStore().find(v=>v.key===c.key).validity==='expired','Fixture is explicitly expired');click('go:share');snap('Report repeats validity');observe('report_repeats_valid_label',root.querySelector('.dw-report').textContent.includes('سارية في المثال'));
}
{
 const {Q,root,snap,click,input,observe,expect}=session('T05-one-generated-voucher-for-waiting-customer');
 click('go:add-choice');click('one');snap('Choose plan for one customer');click('review-issue');snap('Review single issuance');click('confirm-issue');snap('Issuance completed');const c=Q.cardStore().at(-1);expect(Q.state.confirmed===1,'One demo account created');observe('new_number_on_completion',root.querySelector('main').textContent.includes(c.number));observe('completion_has_direct_share_or_copy',!!root.querySelector('main [data-do="copy-voucher"],main [data-do="go:share"]'));click('go:cards');snap('Show cards after issuing one');observe('opens_specific_new_card',Q.state.page==='card'&&Q.state.selectedCard===c.key);observe('list_contains_new_number',root.querySelector('main').textContent.includes(c.number));
}
{
 const {Q,root,snap,click,input,observe,expect}=session('T06-batch-and-print-handoff');
 click('go:add-choice');click('batch');input('mo-count','٢٥');click('review-issue');click('confirm-issue');snap('Batch completed');const batch=Q.routers.main.lastBatch;expect(batch.count===25,'25 demo accounts confirmed');click('design:'+Q.state.selectedPlan);snap('Template editor entered from completed batch');click('go:paper');snap('Paper arrangement preview');const codes=[...root.querySelectorAll('.dw-paper-cell bdi')].map(e=>e.textContent);observe('paper_codes_match_issued_batch',codes.every(number=>batch.keys.some(key=>key.endsWith(':'+number))));observe('paper_uses_custom_design_contents',!!root.querySelector('.dw-paper-cell [data-layer]'));observe('no_real_print_disclosure_present',root.querySelector('main').textContent.includes('لا PDF أو طباعة فعلية'));click('go:design');click('save-template');snap('After template save');click('go:more');click('go:batches');snap('Archive after issuing 25');observe('archive_shows_fixed_100_sample_after_25_issued',root.querySelector('main').textContent.includes('100 · Hotspot'));
}
{
 const {Q,root,snap,click,input,observe,expect}=session('T07-renew-with-remaining-balance');
 click('go:cards');click('quick-renew:hotspot:00123877');snap('Renew still-active voucher');input('op-renew-plan','hs-200','change');snap('Choose another plan in same source');const c=Q.cardStore().find(c=>c.key==='hotspot:00123877'),before=c.total-c.used;input('op-outcome','unknown','change');click('renew-confirm');snap('Write reply lost');expect(!!Q.routers.main.pending,'Uncertain result stays pending');const count=Q.routers.main.requests.length;input('op-outcome','confirmed','change');click('verify-operation');snap('Verification confirms renewal');expect(Q.routers.main.requests.length===count,'No duplicate write during verification');observe('remaining_before_renewal',before);observe('remaining_after_renewal',c.total-c.used);observe('chosen_plan',c.planId);
}
{
 const {Q,root,snap,click,input,observe,expect}=session('T08-disable-versus-disconnect');
 click('go:sessions');snap('Active sessions');const s=Q.routers.main.sessions.find(s=>s.active);click('session-card:'+s.id);snap('Linked card opened from sessions');observe('card_back_from_session_targets_cards',!!root.querySelector('main [data-do="go:cards"]'));click('go:sessions');click('session-disconnect:'+s.id);snap('Review single disconnect');click('confirm-card-action');expect(!s.active,'Only intended session ends');snap('Disconnect confirmed');observe('card_still_allowed',Q.cardStore().find(c=>c.key===s.cardKey).status!=='disabled');
}
{
 const {Q,root,snap,click,input,observe,expect}=session('T09-offline-reading-and-recovery');
 click('offline');snap('Saved workspace while disconnected');click('go:lookup');input('mo-lookup','00123874');click('find-card');snap('Inspect saved or missing reading');expect(!Q.writable(),'Offline state does not permit writes');observe('offline_lookup_page',Q.state.page);click('go:routers');click('router:branch');snap('Select another offline network');observe('no_cross_router_selected_card',Q.state.selectedCard===null);
}
{
 const {Q,root,snap,click,input,observe,expect}=session('T10-guided-package-creation');
 click('go:packages');click('new-package');snap('Plan setup first step');input('mo-package-name','باقة تجربة');input('mo-package-price','200');input('mo-package-quota','1');input('op-package-unit','GB','change');click('package-next');snap('Online time validity and speeds');input('mo-package-hours','5');input('mo-package-days','2');click('package-next');snap('Review new plan');input('op-outcome','rejected','change');click('package-save');snap('Rejected write');expect(Q.routerPlans().length===5,'Rejected plan is not added');
}
{
 const {Q,root,snap,click,input,observe,expect,flush}=session('T11-local-discovery-and-manual-fallback');
 click('go:routers');click('new-router');input('nh-scan-outcome','empty','change');click('start-discovery');snap('Discovery running');flush();snap('No local routers shown');click('go:connect');input('mo-host','192.168.88.1');snap('Manual fallback');expect(Q.state.raw==='192.168.88.1','Manual fallback remains available');
}
{
 const {Q,root,snap,click,input,observe,expect}=session('T12-network-rename-and-safe-removal');
 click('go:routers');click('network-menu:main');click('network-rename');input('mo-network-alias','الشبكة الرئيسية للتجربة');click('save-network-alias');snap('Rename saved connection');click('go:network-remove');snap('Removal review');click('confirm-network-remove');snap('Return to chooser without switching automatically');expect(!Q.state.workspaceOpen,'No silent operational workspace after removal');click('go:removed-networks');click('restore-network:main');snap('Restore saved connection offline');expect(!Q.routers.main.connected,'Restore requires a fresh connection');
}
const report={prototype:'mikro-network-hub.html',method:'single-reviewer cognitive walkthrough using synthetic DOM; no human participant, browser, device, LAN, messages or printing',tasks:tasks.length,assertions:checked,traces:tasks};
fs.mkdirSync(__dirname+'/artifacts',{recursive:true});
fs.writeFileSync(__dirname+'/artifacts/persona-walkthrough-evidence.json',JSON.stringify(report,null,2));
console.log(JSON.stringify({tasks:tasks.length,assertions:checked,observations:tasks.map(t=>({id:t.id,...t.observations})),snapshots:tasks.reduce((sum,t)=>sum+t.steps.length,0)},null,2));
