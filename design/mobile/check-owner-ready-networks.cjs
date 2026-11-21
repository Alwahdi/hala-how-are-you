const fs=require('fs'),vm=require('vm'),assert=require('assert');
const {parseHTML}=require('linkedom');
const source=fs.readFileSync(__dirname+'/mikro-owner-ready.html','utf8');
let code=source.match(/<script>([\s\S]*?)<\/script>/)[1].replace(/\r\n/g,'\n');
code=code.replace('\n})();','\nglobalThis.qa={state,routers,go,render,writable,layerValue,routerPlans,cardStore,startDiscovery};\n})();');
const {window,document}=parseHTML(source),saved=[],timers=new Map(),cancelled=[];let serial=0;
window.openai={setWidgetState:async value=>saved.push(value)};
const scope={window,document,Intl,URL,console,setTimeout:fn=>{timers.set(++serial,fn);return serial;},clearTimeout:id=>{cancelled.push(timers.get(id));timers.delete(id);}};
vm.runInNewContext(code,scope);
const Q=scope.qa,root=document.getElementById('mikro-owner-ready');let checks=0;
const ok=(value,label)=>{assert(value,label);checks++;};
const text=()=>root.querySelector('main').textContent;
function click(action){const el=root.querySelector('[data-do="'+action+'"]');assert(el,'Missing action '+action+' on '+Q.state.page);el.dispatchEvent(new window.Event('click',{bubbles:true,cancelable:true}));}
function input(id,value,event='input'){const el=root.querySelector('#'+id);assert(el,'Missing input '+id);if(el.tagName==='SELECT')Object.defineProperty(el,'value',{value,configurable:true});else el.value=value;el.dispatchEvent(new window.Event(event,{bubbles:true}));}
function flush(){for(const [id,fn] of [...timers]){timers.delete(id);fn();}}
function unique(){const ids=[...root.querySelectorAll('[id]')].map(el=>el.id);ok(ids.length===new Set(ids).size,'Mounted IDs unique');}
function menu(id){Q.go('routers');click('network-menu:'+id);}
ok(root.querySelector('nav').children.length===5&&root.querySelector('header').textContent.includes('الشبكات'),'Workspace has five labeled tabs and global network selector');
ok(source.includes('width:29px;height:29px')&&source.includes('min-height:86px'),'Nav size increased without unlabeled icons');
click('go:routers');ok(!Q.state.workspaceOpen&&root.querySelector('nav').hidden,'Chooser has no active write workspace');
Q.go('packages');ok(Q.state.page==='routers'&&!Q.writable(),'No operational route opens without an explicit network choice');
click('new-router');ok(root.querySelectorAll('main .mo-panel').length===1&&root.querySelectorAll('main .dw-credentials').length===0,'Address, port and login are inside one card');
ok(root.querySelector('#mo-host').getAttribute('placeholder').includes('IP')&&root.querySelector('#mo-port')&&root.querySelector('[data-do="start-discovery"]'),'Address hint, visible port and local discovery are available');
input('mo-router-user','Sample١٢');input('mo-router-password','Sample١٢');click('show-password');ok(root.querySelector('#mo-router-password').value==='Sample١٢'&&root.querySelector('#mo-router-user').value==='Sample١٢','Existing credentials remain exact on reveal');
input('mo-host','bad host');click('check-connection');ok(Q.state.page==='connect'&&root.querySelector('#mo-router-password').value==='Sample١٢','Invalid address preserves the in-memory login draft for correction');
input('mo-host','https://branch.example.net:8778/webfig/?demo=1');click('check-connection');ok(Q.state.raw==='branch.example.net'&&Q.state.port==='8778'&&Q.state.page==='connection-result','Pasted URL keeps explicit port and strips web path');
input('mo-connection-name','الفرع ٢');click('finish-connection');const added=Q.state.router;ok(Q.routers[added].name[0]==='الفرع 2'&&Q.state.workspaceOpen&&Q.routers[added].connected,'Optional alias saved after successful demo check');
const printed=Q.layerValue('network');menu(added);click('network-rename');input('mo-network-alias','');click('save-network-alias');ok(Q.state.page==='network-rename'&&text().includes('60'),'Empty rename gives an inline correction');
input('mo-network-alias','شبكة <img id="injected">');click('save-network-alias');ok(!root.querySelector('#injected')&&text().includes('<img id="injected">'),'Alias is rendered as literal text');
click('router:'+added);ok(Q.layerValue('network')===printed,'Private alias does not alter the printed network brand');
menu(added);click('go:network-remove');ok(text().includes('لا يطفئ الراوتر')&&text().includes('لا يحذف كروته'),'Removal explains its exact scope before confirmation');
click('go:network-manage');ok(!Q.routers[added].hidden,'Cancel preserves the saved connection');
const cards=Q.routers[added].cards,templates=Q.routers[added].templates;click('go:network-remove');click('confirm-network-remove');ok(Q.state.page==='routers'&&Q.routers[added].hidden&&!Q.state.workspaceOpen,'Removal returns to chooser without silently selecting another router');
ok(Q.routers[added].cards===cards&&Q.routers[added].templates===templates,'Removal retains card and template data');
Q.go('cards');ok(Q.state.page==='routers'&&!Q.writable(),'Removed active network cannot receive actions through stale routes');
click('go:removed-networks');ok(root.querySelector('[data-do="restore-network:'+added+'"]'),'Retained data has a reachable restore path');click('restore-network:'+added);ok(!Q.routers[added].hidden&&!Q.routers[added].connected,'Restore never presents old readings as a fresh connection');
click('router:'+added);ok(!Q.writable()&&root.querySelector('header').textContent.includes('غير متصل'),'Restored network opens saved data with writes disabled');
menu(added);click('network-reconnect');ok(Q.state.connectionId===added&&root.querySelector('#mo-host').value==='branch.example.net','Reconnect edits the same saved connection');click('check-connection');click('finish-connection');ok(Q.state.router===added&&Q.writable(),'Fresh demo connection enables the original workspace');
menu(added);Q.routers[added].pending={id:'pending-fixture'};click('go:network-remove');ok(!root.querySelector('[data-do="confirm-network-remove"]')&&text().includes('ينتظر التحقق'),'Unresolved request blocks removal');Q.routers[added].pending=null;
click('go:network-manage');click('go:routers');click('new-router');ok(root.querySelector('#mo-host').value===''&&Q.state.port==='8729'&&Q.state.connectionId===null,'Adding another network clears the previous endpoint and alias');
input('mo-port','٨٧٧٨');click('start-discovery');ok(Q.state.scanStatus==='scanning'&&timers.size===1,'Discovery presents a cancellable in-progress state');click('cancel-discovery');const obsolete=cancelled.at(-1);if(obsolete)obsolete();ok(Q.state.page==='connect'&&timers.size===0&&Q.state.scanStatus==='idle','Cancel ignores late discovery results');
click('start-discovery');flush();ok(Q.state.scanStatus==='results'&&root.querySelectorAll('[data-do^="discover-pick:"]').length===2,'Synthetic discovery shows selectable candidates');click('discover-pick:nearby');ok(Q.state.raw==='192.168.88.2'&&Q.state.port==='8778'&&!Q.state.connectionId,'Discovery fills only the endpoint and preserves chosen API port');
ok(Q.state.page==='connect'&&!Q.routers.added2,'Selecting a candidate does not create an authenticated network');
click('start-discovery');flush();const count=Object.keys(Q.routers).length;click('discover-pick:known');ok(Q.state.connectionId==='main'&&Object.keys(Q.routers).length===count,'Known demo identity reuses its saved entry instead of duplicating it');click('check-connection');click('finish-connection');ok(Q.state.router==='main'&&Object.keys(Q.routers).length===count,'Confirmed known fixture opens the original workspace');
click('go:routers');click('new-router');for(const status of ['empty','permission','unsupported','local']){input('nh-scan-outcome',status,'change');click('start-discovery');flush();ok(Q.state.scanStatus===status&&root.querySelector('[data-do="go:connect"]')&&root.querySelector('[data-do="start-discovery"]'),'Discovery '+status+' has manual fallback and retry');click('go:connect');}
input('nh-scan-outcome','results','change');click('start-discovery');click('go:local-help');const late=cancelled.at(-1);if(late)late();ok(Q.state.page==='local-help'&&timers.size===0,'Leaving discovery for help cancels pending work');click('go:discovery');ok(Q.state.scanStatus==='idle'&&root.querySelector('[data-do="start-discovery"]'),'Returning from help does not show a permanently running scan');
click('go:connect');input('mo-host','192.168.88.2');input('mo-scenario','certificate','change');click('check-connection');ok(text().includes('لا نحول')&&!root.querySelector('[data-do="finish-connection"]'),'Certificate failure cannot be saved as success or silently downgraded');
click('go:connect');input('mo-scenario','plain','change');click('check-connection');ok(text().includes('غير مشفرة')&&text().includes('يمكن أن تكشف'),'Plain API protection warning remains visible before continuation');
click('go:connect');click('go:routers');click('router:branch');ok(Q.state.router==='branch'&&!Q.state.selectedCard&&!Q.state.actionRequest,'Network selection clears transient card and action targets');
click('lang');ok(root.querySelector('main').dir==='ltr'&&root.querySelector('header').textContent.includes('Networks'),'English preserves network switching');unique();
menu('branch');click('network-rename');ok(text().includes('printed on cards'),'English rename explains the public/private name distinction');
ok(!JSON.stringify(saved).includes('Sample')&&!JSON.stringify(saved).includes('injected')&&!JSON.stringify(saved).includes('branch.example.net'),'Host state excludes entered credentials, aliases and hosts');
for(const id of Object.keys(Q.routers)){Q.routers[id].pending=null;menu(id);click('go:network-remove');click('confirm-network-remove');}
ok(text().includes('Add your first network')&&root.querySelector('[data-do="new-router"]'),'Removing the last connection leaves a usable empty state');
ok(!/\b(fetch\s*\(|XMLHttpRequest|WebSocket\s*\(|localStorage|sessionStorage)/.test(source),'No actual network scan, API calls or persistent personal data');
console.log(JSON.stringify({passed:checks,environment:'synthetic DOM only; no browser layout, native discovery, devices or live routers'},null,2));
