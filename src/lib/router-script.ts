// Builds the RouterOS paste commands that make a router push its status to Mikro.
export const REPORT_URL = 'https://mikro.alwahdi.com/api/public/router-report';
export const OFFLINE_AFTER_MS = 90_000;
export const SCRIPT_NAME = 'mikro-report';

export function reportScriptSource(token: string, url = REPORT_URL): string {
  const reply = (res: string, extra = '') => `:do {/tool fetch url="${url.replace('router-report', 'router-job')}" http-method=post http-header-field="Content-Type: application/json,X-Mikro-Token: ${token}" http-data=("{\\"job\\":\\"" . $jid . "\\",\\"result\\":\\"" . ${res} . "\\"${extra}}") output=none} on-error={}`;
  return [
    ':local id [/system identity get name]',
    ':local board [/system resource get board-name]',
    ':local ver [/system resource get version]',
    ':local up [:tostr [/system resource get uptime]]',
    ':local cpu [/system resource get cpu-load]',
    ':local fm [/system resource get free-memory]',
    ':local tm [/system resource get total-memory]',
    ':local fh [/system resource get free-hdd-space]',
    ':local th [/system resource get total-hdd-space]',
    ':local hs 0',
    ':do {:set hs [:len [/ip hotspot active find]]} on-error={}',
    ':local temp ""',
    // v6 and v7 read temperature differently; :parse compiles at run time so the other version's syntax cannot break the script.
    ':do {:set temp [:tostr [[:parse "/system health get temperature"]]]} on-error={}',
    ':if ($temp = "") do={:do {:set temp [:tostr [[:parse "/system health get [find name=temperature] value"]]]} on-error={}}',
    ':local cn ""',
    ':do {:set cn [:tostr [/ip cloud get dns-name]]} on-error={}',
    ':local sp ""',
    ':do {:set sp [:tostr [/ip service get www-ssl port]]} on-error={}',
    ':local sd ""',
    ':do {:set sd [:tostr [/ip service get www-ssl disabled]]} on-error={}',
    ':local ap ""', ':local apd ""', ':local asp ""', ':local asd ""',
    ':do {:set ap [:tostr [/ip service get api port]]; :set apd [:tostr [/ip service get api disabled]]; :set asp [:tostr [/ip service get api-ssl port]]; :set asd [:tostr [/ip service get api-ssl disabled]]} on-error={}',
    // Online User Manager cards log in through Hotspot, so they are already in the Hotspot count. Scanning User Manager's
    // session history every 30 seconds kept weak v6 routers at 100% CPU, so it is no longer read here.
    ':local um 0',
    // umi: "pkg" when the User Manager package is installed, then ",true|false" (v7 enabled flag). umr: our reader script is installed.
    ':local umi ""',
    ':do {:if ([:len [/system package find where name="user-manager" and disabled=no]] > 0) do={:set umi "pkg"}} on-error={}',
    ':do {:set umi ($umi . "," . [:tostr [[:parse ":return [/user-manager get enabled]"]]])} on-error={}',
    ':local umr [:len [/system script find name=mikro-um]]',
    // Who is online now (Hotspot): user|mac|uptime|bytes; capped so the report stays small. Names with quotes are skipped.
    ':local act ""', ':local am "no"',
    String.raw`:do {:foreach a in=[/ip hotspot active find] do={:local r [/ip hotspot active get $a]; :local u [:tostr ($r->"user")]; :if ([:len $act] < 2400) do={:if (([:typeof [:find $u "\""]] = "nil") && ([:typeof [:find $u "\\"]] = "nil")) do={:set act ($act . $u . "|" . [:tostr ($r->"mac-address")] . "|" . [:tostr ($r->"uptime")] . "|" . [:tostr (($r->"bytes-in") + ($r->"bytes-out"))] . ";")}} else={:set am "yes"}}} on-error={}`,
    ':local au 0',
    ':do {:set au [:len [/user find name=mikro-read]]} on-error={}',
    // Health check fields (read only): time sync, router date, enabled services, socks/proxy, users, hotspot idle timeout, shared users.
    ':local ntp ""', ':do {:set ntp [:tostr [/system ntp client get enabled]]} on-error={}',
    ':local cd ""', ':do {:set cd [:tostr [/system clock get date]]} on-error={}',
    ':local svc ""', ':do {:foreach s in=[/ip service find where disabled=no] do={:set svc ($svc . [/ip service get $s name] . ",")}} on-error={}',
    ':local sk ""', ':do {:set sk [:tostr [/ip socks get enabled]]} on-error={}',
    ':local px ""', ':do {:set px [:tostr [/ip proxy get enabled]]} on-error={}',
    ':local uc 0', ':do {:set uc [:len [/user find]]} on-error={}',
    ':local idl ""', ':do {:foreach h in=[/ip hotspot find] do={:set idl [:tostr [/ip hotspot get $h idle-timeout]]}} on-error={}',
    ':local shr ""', ':do {:foreach q in=[/ip hotspot user profile find] do={:set shr ($shr . [:tostr [/ip hotspot user profile get $q shared-users]] . ",")}} on-error={}',
    ':local tz ""', ':do {:set tz [:tostr [/system clock get gmt-offset]]} on-error={}',
    ':local pa ""',
    ':do {:set pa [:tostr [/ip cloud get public-address]]} on-error={}',
    // Behind NAT unless the IP Cloud public address sits on one of the router's own interfaces.
    ':local nat "unknown"',
    ':if ([:len $pa] > 0) do={:set nat "yes"; :foreach a in=[/ip address find] do={:local ad [:tostr [/ip address get $a address]]; :if ([:pick $ad 0 [:find $ad "/"]] = $pa) do={:set nat "no"}}}',
    ':local json ("{\\"identity\\":\\"" . $id . "\\",\\"board\\":\\"" . $board . "\\",\\"version\\":\\"" . $ver . "\\",\\"uptime\\":\\"" . $up . "\\",\\"cpu\\":" . $cpu . ",\\"freeMemory\\":" . $fm . ",\\"totalMemory\\":" . $tm . ",\\"freeHdd\\":" . $fh . ",\\"totalHdd\\":" . $th . ",\\"hotspotActive\\":" . $hs . ",\\"temperature\\":\\"" . $temp . "\\",\\"cloudName\\":\\"" . $cn . "\\",\\"sslPort\\":\\"" . $sp . "\\",\\"sslDisabled\\":\\"" . $sd . "\\",\\"publicAddress\\":\\"" . $pa . "\\",\\"behindNat\\":\\"" . $nat . "\\",\\"apiPort\\":\\"" . $ap . "\\",\\"apiDisabled\\":\\"" . $apd . "\\",\\"apiSslPort\\":\\"" . $asp . "\\",\\"apiSslDisabled\\":\\"" . $asd . "\\",\\"apiUser\\":" . $au . ",\\"ntp\\":\\"" . $ntp . "\\",\\"clockDate\\":\\"" . $cd . "\\",\\"services\\":\\"" . $svc . "\\",\\"socks\\":\\"" . $sk . "\\",\\"proxy\\":\\"" . $px . "\\",\\"users\\":" . $uc . ",\\"idle\\":\\"" . $idl . "\\",\\"shared\\":\\"" . $shr . "\\",\\"umActive\\":" . $um . ",\\"umi\\":\\"" . $umi . "\\",\\"umr\\":" . $umr . ",\\"act\\":\\"" . $act . "\\",\\"actMore\\":\\"" . $am . "\\",\\"tz\\":\\"" . $tz . "\\"}")',
    // The reply may carry one task. Only the tasks written here can run: restart, or remove used-up Hotspot cards
    // (each card is checked on the router itself before removal). Nothing else in the reply is ever executed.
    ':local job ""',
    `:do {:local res [/tool fetch url="${url}" http-method=post http-header-field="Content-Type: application/json,X-Mikro-Token: ${token}" http-data=$json output=user as-value]; :set job ($res->"data")} on-error={}`,
    ':if ([:pick $job 0 7] = "reboot|") do={:delay 2s; /system reboot}',
    `:if ([:pick $job 0 3] = "rm|") do={:local rest [:pick $job 3 [:len $job]]; :local jid [:pick $rest 0 [:find $rest "|"]]; :local c 0; :foreach n in=[:toarray [:pick $rest ([:find $rest "|"] + 1) [:len $rest]]] do={:local u [/ip hotspot user find name=$n]; :if ([:len $u] > 0) do={:local r [/ip hotspot user get $u]; :local done false; :do {:if (($r->"uptime") >= ($r->"limit-uptime")) do={:set done true}} on-error={}; :do {:if ((($r->"bytes-in") + ($r->"bytes-out")) >= ($r->"limit-bytes-total")) do={:set done true}} on-error={}; :if ($done) do={/ip hotspot user remove $u; :set c ($c + 1)}}}; :do {/tool fetch url="${url.replace('router-report', 'router-job')}" http-method=post http-header-field="Content-Type: application/json,X-Mikro-Token: ${token}" http-data=("{\\"job\\":\\"" . $jid . "\\",\\"removed\\":" . $c . "}") output=none} on-error={}}`,
    // card|job|source|action|name|value: one fixed action on one card. Values were checked on our server (letters, digits . _ @ - only).
    String.raw`:if ([:pick $job 0 5] = "card|") do={:local r [:pick $job 5 [:len $job]]; :local i [:find $r "|"]; :local jid [:pick $r 0 $i]; :set r [:pick $r ($i + 1) [:len $r]]; :set i [:find $r "|"]; :local src [:pick $r 0 $i]; :set r [:pick $r ($i + 1) [:len $r]]; :set i [:find $r "|"]; :local act [:pick $r 0 $i]; :set r [:pick $r ($i + 1) [:len $r]]; :set i [:find $r "|"]; :local n [:pick $r 0 $i]; :local v [:pick $r ($i + 1) [:len $r]]; :local res "ok"; :do {` +
    String.raw`:if ($src = "hotspot") do={:local u [/ip hotspot user find name=$n]; :if ([:len $u] = 0) do={:set res "missing"} else={:if ($act = "pw") do={/ip hotspot user set $u password=$v}; :if ($act = "name") do={:if ([:len [/ip hotspot user find name=$v]] > 0) do={:set res "exists"} else={/ip hotspot user set $u name=$v}}; :if ($act = "off") do={/ip hotspot user set $u disabled=yes; :do {/ip hotspot active remove [find user=$n]} on-error={}}; :if ($act = "on") do={/ip hotspot user set $u disabled=no}; :if ($act = "kick") do={/ip hotspot active remove [find user=$n]}; :if ($act = "del") do={:do {/ip hotspot active remove [find user=$n]} on-error={}; /ip hotspot user remove $u}; :if ($act = "renew") do={` + HS_RENEW + String.raw`}}}; ` +
    String.raw`:if ($src = "usermanager") do={:local b "/user-manager user"; :local k "name"; :if ([:pick $ver 0 1] = "6") do={:set b "/tool user-manager user"; :set k "username"}; :local sel ("[find " . $k . "=\"" . $n . "\"]"); :local f [:parse (":return [" . $b . " find " . $k . "=\"" . $n . "\"]")]; :if ([:len [$f]] = 0) do={:set res "missing"}; :if ($res = "ok") do={:local cmd ""; :if ($act = "pw") do={:set cmd ($b . " set " . $sel . " password=\"" . $v . "\"")}; :if ($act = "name") do={:local g [:parse (":return [" . $b . " find " . $k . "=\"" . $v . "\"]")]; :if ([:len [$g]] > 0) do={:set res "exists"} else={:set cmd ($b . " set " . $sel . " " . $k . "=\"" . $v . "\"")}}; :if ($act = "off") do={:set cmd ($b . " set " . $sel . " disabled=yes")}; :if ($act = "on") do={:set cmd ($b . " set " . $sel . " disabled=no")}; :if ($act = "del") do={:set cmd ($b . " remove " . $sel)}; :if ($act = "renew") do={:if ([:pick $ver 0 1] = "6") do={:set cmd ` + UM6_RENEW + String.raw`} else={:set cmd ` + UM7_RENEW + String.raw`}}; :if (($act = "off") || ($act = "kick") || ($act = "del")) do={:do {/ip hotspot active remove [find user=$n]} on-error={}; :do {/ppp active remove [find name=$n]} on-error={}}; :if ([:len $cmd] > 0) do={:local f [:parse $cmd]; $f}}}` +
    `} on-error={:set res "error"}; ${reply('$res')}}`,
    bulkTask(reply),
    packageTask(reply),
  ].join('\n');
}

/**
 * Turns RouterOS code into a RouterOS string expression, with {x} replaced by the script variable $x.
 * Used for commands under menus that exist on only one RouterOS version: they are compiled at run time with :parse.
 * Every variable put in was checked on our server (letters, digits and a few safe symbols only).
 */
export function rosExpr(code: string): string {
  const lit = (t: string) => `"${t.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\$/g, '\\$')}"`;
  const parts: string[] = [];
  let last = 0;
  for (const m of code.matchAll(/\{([a-z]+)\}/g)) { parts.push(lit(code.slice(last, m.index)), `$${m[1]}`); last = m.index! + m[0].length; }
  parts.push(lit(code.slice(last)));
  return `(${parts.filter((x) => x !== '""').join(' . ')})`;
}

// Renew = the same card number gets its allowance back. Hotspot: counters to zero, on again, its expiry timer and expiry note cleared.
const HS_RENEW = String.raw`/ip hotspot user reset-counters $u; /ip hotspot user set $u disabled=no; :do {/system scheduler remove [find name=("mikro-exp-" . $n)]} on-error={}; :local c [:tostr [/ip hotspot user get $u comment]]; :if ((([:pick $c 3 4] = "/") || ([:pick $c 4 5] = "-")) && ([:typeof [:find $c ":"]] = "num")) do={/ip hotspot user set $u comment=""}`;
// User Manager v6: its package is cleared and activated again with zeroed counters (the router's own package first, ours as fallback).
const UM6_RENEW = rosExpr(':local i [/tool user-manager user find username="{n}"]; :local p [:tostr [/tool user-manager user get $i actual-profile]]; :if ([:len $p] = 0) do={:set p "{v}"}; :local c [/tool user-manager user get $i customer]; /tool user-manager user clear-profiles $i; /tool user-manager user reset-counters $i; /tool user-manager user set $i disabled=no; :if ($p != "-") do={/tool user-manager user create-and-activate-profile $i customer=$c profile=$p}');
// User Manager v7: the package is added again; it starts when the current one ends (or at once if it already ended).
const UM7_RENEW = rosExpr('/user-manager user set [find name="{n}"] disabled=no; :if ("{v}" != "-") do={/user-manager user-profile add user="{n}" profile="{v}"}');

type Reply = (res: string, extra?: string) => string;

/** bulk|job|source|action|name,name,...: turn off, turn on or remove several cards in one go. Replies how many were found. */
function bulkTask(reply: Reply): string {
  return String.raw`:if ([:pick $job 0 5] = "bulk|") do={:local r [:pick $job 5 [:len $job]]; :local i [:find $r "|"]; :local jid [:pick $r 0 $i]; :set r [:pick $r ($i + 1) [:len $r]]; :set i [:find $r "|"]; :local src [:pick $r 0 $i]; :set r [:pick $r ($i + 1) [:len $r]]; :set i [:find $r "|"]; :local act [:pick $r 0 $i]; :local c 0; :foreach n in=[:toarray [:pick $r ($i + 1) [:len $r]]] do={:do {` +
    String.raw`:if ($src = "hotspot") do={:local u [/ip hotspot user find name=$n]; :if ([:len $u] > 0) do={:if ($act = "off") do={/ip hotspot user set $u disabled=yes; :do {/ip hotspot active remove [find user=$n]} on-error={}}; :if ($act = "on") do={/ip hotspot user set $u disabled=no}; :if ($act = "del") do={:do {/ip hotspot active remove [find user=$n]} on-error={}; /ip hotspot user remove $u}; :set c ($c + 1)}}; ` +
    String.raw`:if ($src = "usermanager") do={:local b "/user-manager user"; :local k "name"; :if ([:pick $ver 0 1] = "6") do={:set b "/tool user-manager user"; :set k "username"}; :local sel ("[find " . $k . "=\"" . $n . "\"]"); :local cmd ($b . " remove " . $sel); :if ($act = "off") do={:set cmd ($b . " set " . $sel . " disabled=yes")}; :if ($act = "on") do={:set cmd ($b . " set " . $sel . " disabled=no")}; :local f [:parse (":return [:len [" . $b . " find " . $k . "=\"" . $n . "\"]]")]; :if ([$f] > 0) do={:local g [:parse $cmd]; $g; :set c ($c + 1); :if ($act != "on") do={:do {/ip hotspot active remove [find user=$n]} on-error={}}}}` +
    `} on-error={}}; ${reply('"ok"', String.raw`,\"removed\":" . $c . "`)}}`;
}

const UM6_PKG = rosExpr(':local c [/tool user-manager customer get [:pick [/tool user-manager customer find] 0] login]; :if ("{act}" = "del") do={/tool user-manager profile profile-limitation remove [find profile="{nm}"]; :do {/tool user-manager profile limitation remove [find name="{nm}"]} on-error={}; /tool user-manager profile remove [find name="{nm}"]} else={:if ("{act}" = "add") do={/tool user-manager profile add name="{nm}" name-for-users="{nm}" owner=$c starts-at=logon}; :local sh "off"; :if ("{dev}" != "0") do={:set sh "{dev}"}; /tool user-manager profile set [find name="{nm}"] validity={val} price={pr} override-shared-users=$sh; :local pl [/tool user-manager profile profile-limitation find profile="{nm}"]; :if ([:len $pl] = 0) do={:if ([:len [/tool user-manager profile limitation find name="{nm}"]] = 0) do={/tool user-manager profile limitation add name="{nm}" owner=$c}; /tool user-manager profile profile-limitation add profile="{nm}" limitation="{nm}"; :set pl [/tool user-manager profile profile-limitation find profile="{nm}"]}; :local ln [/tool user-manager profile profile-limitation get [:pick $pl 0] limitation]; /tool user-manager profile limitation set [find name=$ln] rate-limit-rx={up} rate-limit-tx={dn} uptime-limit={upt} transfer-limit={by}}');
// v7 refuses a package added without validity, so validity goes into the add itself.
const UM7_PKG = rosExpr(':if ("{act}" = "del") do={/user-manager profile-limitation remove [find profile="{nm}"]; :do {/user-manager limitation remove [find name="{nm}"]} on-error={}; /user-manager profile remove [find name="{nm}"]} else={:local va "{val}"; :if ($va = "0s") do={:set va "unlimited"}; :if ("{act}" = "add") do={/user-manager profile add name="{nm}" name-for-users="{nm}" starts-when=first-auth validity=$va}; :local sh "off"; :if ("{dev}" != "0") do={:set sh "{dev}"}; /user-manager profile set [find name="{nm}"] validity=$va price={pr} override-shared-users=$sh; :local pl [/user-manager profile-limitation find profile="{nm}"]; :if ([:len $pl] = 0) do={:if ([:len [/user-manager limitation find name="{nm}"]] = 0) do={/user-manager limitation add name="{nm}"}; /user-manager profile-limitation add profile="{nm}" limitation="{nm}"; :set pl [/user-manager profile-limitation find profile="{nm}"]}; :local ln [/user-manager profile-limitation get [:pick $pl 0] limitation]; /user-manager limitation set [find name=$ln] rate-limit-rx={up} rate-limit-tx={dn} uptime-limit={upt} transfer-limit={by}}');

/** pkg|job|source|action|name|devices|down|up|validity|uptime|bytes|price|onlogin: add, edit or remove one package. */
function packageTask(reply: Reply): string {
  return String.raw`:if ([:pick $job 0 4] = "pkg|") do={:local r [:pick $job 4 [:len $job]]; :local f ({}); :for k from=0 to=10 do={:local i [:find $r "|"]; :set ($f->$k) [:pick $r 0 $i]; :set r [:pick $r ($i + 1) [:len $r]]}; :local jid ($f->0); :local src ($f->1); :local act ($f->2); :local nm ($f->3); :local dev ($f->4); :local dn ($f->5); :local up ($f->6); :local val ($f->7); :local upt ($f->8); :local by ($f->9); :local pr ($f->10); :local ol $r; :if ($ol = "-") do={:set ol ""}; :local res "ok"; :do {` +
    String.raw`:if ($src = "hotspot") do={:local p [/ip hotspot user profile find name=$nm]; :if (($act = "add") && ([:len $p] > 0)) do={:set res "exists"}; :if (($act != "add") && ([:len $p] = 0)) do={:set res "missing"}; :if ($res = "ok") do={:if ($act = "add") do={/ip hotspot user profile add name=$nm; :set p [/ip hotspot user profile find name=$nm]}; :if ($act = "del") do={/ip hotspot user profile remove $p} else={:local sh $dev; :if ($dev = "0") do={:set sh "unlimited"}; /ip hotspot user profile set $p shared-users=$sh rate-limit=($up . "/" . $dn); :local cur [:tostr [/ip hotspot user profile get $p on-login]]; :if (($act = "add") || ([:len $cur] = 0) || ([:typeof [:find $cur ":put (\","]] = "num") || ([:typeof [:find $cur "mikro-exp-"]] = "num")) do={/ip hotspot user profile set $p on-login=$ol} else={:set res "partial"}}}}; ` +
    String.raw`:if ($src = "usermanager") do={:local v6 ([:pick $ver 0 1] = "6"); :local pm "/user-manager profile"; :if ($v6) do={:set pm "/tool user-manager profile"}; :local cnt [:parse (":return [:len [" . $pm . " find name=\"" . $nm . "\"]]")]; :local ex [$cnt]; :if (($act = "add") && ($ex > 0)) do={:set res "exists"}; :if (($act != "add") && ($ex = 0)) do={:set res "missing"}; :if ($res = "ok") do={:local cmd ` + UM7_PKG + String.raw`; :if ($v6) do={:set cmd ` + UM6_PKG + String.raw`}; :local g [:parse $cmd]; $g}}` +
    `} on-error={:set res "error"}; ${reply('$res')}}`;
}

export const CARDS_URL = REPORT_URL.replace('router-report', 'router-cards');
export const CARDS_SCRIPT = 'mikro-cards';
export const UM_SCRIPT = 'mikro-um';

export type CardsKind = 'hotspot' | 'um6' | 'um7';

const q = (expr: string) => String.raw`"\"" . ` + expr + String.raw` . "\""`;
const fld = (f: string) => q(`[:tostr ($r->"${f}")]`);
// Comments may hold quotes or backslashes that would break the JSON, so those are sent empty.
const SAFE_COMMENT = String.raw`:local cm [:tostr ($r->"comment")]; :if (([:typeof [:find $cm "\""]] != "nil") || ([:typeof [:find $cm "\\"]] != "nil")) do={:set cm ""}`;

/**
 * Sends the packages first, then who is online, then every card in batches of 40 (behind NAT this is how we read cards).
 * Each send is protected: one failed batch never stops the rest, so packages and online users always arrive.
 * Fields are read from the item array, so missing ones stay empty. The password itself never leaves the router:
 * only "same as name" / "none" / "other". Each kind uses its own menus: Hotspot, User Manager v6 (/tool) or v7.
 */
export function cardsScriptSource(token: string, kind: CardsKind | 'usermanager', url = CARDS_URL): string {
  const k: CardsKind = kind === 'usermanager' ? 'um7' : kind;
  const src = k === 'hotspot' ? 'hotspot' : 'usermanager';
  const send = (done: string, what: string) => `:do {/tool fetch url="${url}" http-method=post http-header-field="Content-Type: application/json,X-Mikro-Token: ${token}" http-data=("{\\"source\\":\\"${what}\\",\\"page\\":" . $p . ",\\"done\\":${done},\\"rows\\":[" . $b . "]}") output=none} on-error={}`;
  const add = (row: string, what: string, max = 40) => `:if ($n > 0) do={:set b ($b . ",")}; :set b ($b . "[" . ${row} . "]"); :set n ($n + 1); :if ($n = ${max}) do={${send('false', what)}; :set b ""; :set n 0; :set p ($p + 1)}`;
  const reset = ':set b ""; :set n 0; :set p 0';
  const T = {
    hotspot: { menu: '/ip hotspot user', name: 'name', pmenu: '/ip hotspot user profile', smenu: '/ip hotspot active', s: ['user', 'mac-address', 'uptime'], sb: ['bytes-in', 'bytes-out'], sa: 'address' },
    um6: { menu: '/tool user-manager user', name: 'username', pmenu: '/tool user-manager profile', smenu: '/tool user-manager session', s: ['user', 'calling-station-id', 'uptime'], sb: ['download', 'upload'], sa: 'user-ip' },
    um7: { menu: '/user-manager user', name: 'name', pmenu: '/user-manager profile', smenu: '/user-manager session', s: ['user', 'calling-station-id', 'uptime'], sb: ['download', 'upload'], sa: 'user-address' },
  }[k];
  const empty = '"\\"\\""';
  // Hotspot rows: name,profile,uptime,in,out,limit-uptime,limit-bytes,disabled,comment,pw.
  // UM rows: name,profile,uptime,down,up,disabled,comment,pw,last-seen (v7 usage is summed from its sessions).
  const rows: Record<CardsKind, string[]> = {
    hotspot: [fld('name'), fld('profile'), fld('uptime'), fld('bytes-in'), fld('bytes-out'), fld('limit-uptime'), fld('limit-bytes-total'), fld('disabled'), q('$cm'), q('$pm')],
    um6: [fld('username'), fld('actual-profile'), fld('uptime-used'), fld('download-used'), fld('upload-used'), fld('disabled'), q('$cm'), q('$pm'), fld('last-seen')],
    um7: [fld('name'), empty, q('$ut'), q('$ub'), q('"0"'), fld('disabled'), q('$cm'), q('$pm'), empty],
  };
  const row = rows[k].join(' . "," . ');
  const lines = [':local p 0', ':local b ""', ':local n 0'];

  // 1) Packages.
  if (k === 'hotspot') {
    // name,rate,devices,session-timeout,idle,keepalive,pool,mikhmon (price/validity that Mikhmon keeps in on-login).
    const prow = [fld('name'), fld('rate-limit'), fld('shared-users'), fld('session-timeout'), fld('idle-timeout'), fld('keepalive-timeout'), fld('address-pool'), q('$mk')].join(' . "," . ');
    lines.push(String.raw`:foreach u in=[/ip hotspot user profile find] do={:do {:local r [/ip hotspot user profile get $u]; :local ol [:tostr ($r->"on-login")]; :local mk ""; :local s [:find $ol ":put (\","]; :if ([:typeof $s] = "num") do={:local e [:find $ol "\")" $s]; :if ([:typeof $e] = "num") do={:set mk [:pick $ol ($s + 7) $e]}}; :if (([:typeof [:find $mk "\""]] != "nil") || ([:typeof [:find $mk "\\"]] != "nil")) do={:set mk ""}; :if ($n < 50) do={:if ($n > 0) do={:set b ($b . ",")}; :set b ($b . "[" . ` + prow + String.raw` . "]"); :set n ($n + 1)}} on-error={}}`);
  } else {
    // name,name-for-users,validity,price,devices,rate(rx/tx),uptime-limit,transfer-limit (from the first linked limitation).
    const lim = k === 'um6' ? { pl: '/tool user-manager profile profile-limitation', l: '/tool user-manager profile limitation', shared: 'override-shared-users' } : { pl: '/user-manager profile-limitation', l: '/user-manager limitation', shared: 'override-shared-users' };
    // User Manager keeps the price in hundredths on v6 and v7 (500 is stored as 50000); a price it cannot divide is sent as it is.
    const prow = [fld('name'), fld('name-for-users'), fld('validity'), q('$pr'), fld(lim.shared), q('$rl'), q('$ul'), q('$tl')].join(' . "," . ');
    lines.push(`:foreach u in=[${T.pmenu} find] do={:do {:local r [${T.pmenu} get $u]; :local pr [:tostr ($r->"price")]; :do {:set pr [:tostr ([:tonum ($r->"price")] / 100)]} on-error={}; :local rl ""; :local ul ""; :local tl ""; :do {:foreach x in=[${lim.pl} find where profile=($r->"name")] do={:local ln [${lim.pl} get $x limitation]; :local l [${lim.l} find where name=$ln]; :if (([:len $l] > 0) && ($rl = "")) do={:local lr [${lim.l} get [:pick $l 0]]; :set rl ([:tostr ($lr->"rate-limit-rx")] . "/" . [:tostr ($lr->"rate-limit-tx")]); :set ul [:tostr ($lr->"uptime-limit")]; :set tl [:tostr ($lr->"transfer-limit")]}}} on-error={}; :if ($n < 50) do={:if ($n > 0) do={:set b ($b . ",")}; :set b ($b . "[" . ${prow} . "]"); :set n ($n + 1)}} on-error={}}`);
  }
  lines.push(send('true', `${src}-profiles`), reset);

  // 2) Who is online: user,mac,uptime,bytes,address (all of them, in batches).
  const srow = [...T.s.map(fld), q(`[:tostr (($r->"${T.sb[0]}") + ($r->"${T.sb[1]}"))]`), fld(T.sa)].join(' . "," . ');
  const where = k === 'hotspot' ? '' : ' where active';
  lines.push(`:foreach u in=[${T.smenu} find${where}] do={:do {:local r [${T.smenu} get $u]; :local cm [:tostr ($r->"user")]; :if (([:typeof [:find $cm "\\""]] = "nil") && ([:typeof [:find $cm "\\\\"]] = "nil")) do={${add(srow, `${src}-sessions`)}}} on-error={}}`, send('true', `${src}-sessions`), reset);

  // 3) Cards. v7 keeps used time and data per session, so they are summed first (skipped on huge session logs).
  let pre = '';
  if (k === 'um7') {
    lines.push(String.raw`:local agb ({}); :local agt ({}); :local sc 0; :do {:set sc [:len [/user-manager session find]]} on-error={}; :if ($sc < 20000) do={:foreach s in=[/user-manager session find] do={:do {:local r [/user-manager session get $s]; :local u [:tostr ($r->"user")]; :local ob [:tonum ($agb->$u)]; :if ([:typeof $ob] != "num") do={:set ob 0}; :local ot ($agt->$u); :if ([:typeof $ot] != "time") do={:set ot 0s}; :set ($agb->$u) ($ob + [:tonum ($r->"download")] + [:tonum ($r->"upload")]); :set ($agt->$u) ($ot + [:totime ($r->"uptime")])} on-error={}}}`);
    pre = String.raw`:local nm [:tostr ($r->"name")]; :local ut [:tostr ($agt->$nm)]; :local ub [:tostr ($agb->$nm)]; `;
  }
  lines.push(
    `:foreach u in=[${T.menu} find] do={:do {:local r [${T.menu} get $u]; ${pre}:local pw [:tostr ($r->"password")]; :local pm "other"; :if ($pw = "") do={:set pm "none"}; :if ($pw = [:tostr ($r->"${T.name}")]) do={:set pm "same"}; ${SAFE_COMMENT}; ${add(row, src)}} on-error={}}`,
    send('true', src),
  );

  // 4) v7: which package each card has and its state (waiting / running / used) live outside the user.
  if (k === 'um7') {
    lines.push(reset, `:foreach u in=[/user-manager user-profile find] do={:do {:local r [/user-manager user-profile get $u]; ${add([fld('user'), fld('profile'), fld('state'), fld('end-time')].join(' . "," . '), 'usermanager-links')}} on-error={}}`, send('true', 'usermanager-links'));
  }
  return lines.filter(Boolean).join('\n');
}

/** Escape a script so it can live inside a RouterOS double-quoted string. */
export function escapeRos(source: string): string {
  return source.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\$/g, '\\$').replace(/\n/g, '\\r\\n');
}

import { readOnlyUserCommands } from './ip-cloud';

/**
 * The one paste command for every RouterOS version: a single line (mobile terminals drop newlines),
 * no download from our site, and v7-only steps compiled at run time so v6 skips them without errors.
 * When an API password is given, the router also gets the read-only API user (v6 and v7) used for automatic direct access.
 */
export function buildPasteCommand(token: string, apiPassword?: string, url = REPORT_URL): string {
  return setupParts(token, apiPassword, url).join('; ');
}

/** The same steps one per line, served as the downloadable setup file for the short command. */
export function buildSetupScript(token: string, apiPassword?: string, url = REPORT_URL): string {
  return [...setupParts(token, apiPassword, url), ':put "Mikro: setup finished. Go back to the app."'].join('\r\n') + '\r\n';
}

function setupParts(token: string, apiPassword?: string, url = REPORT_URL): string[] {
  const parts = [
    `/system scheduler remove [find name=${SCRIPT_NAME}]`,
    `/system script remove [find name=${SCRIPT_NAME}]`,
    `/system script add name=${SCRIPT_NAME} policy=read,write,test,reboot source="${escapeRos(reportScriptSource(token, url))}"`,
    `/system scheduler add name=${SCRIPT_NAME} interval=30s start-time=startup on-event=${SCRIPT_NAME}`,
  ];
  if (apiPassword) {
    parts.push(readOnlyUserCommands(apiPassword));
  }
  for (const name of [CARDS_SCRIPT, UM_SCRIPT]) parts.push(`/system scheduler remove [find name=${name}]`, `/system script remove [find name=${name}]`);
  parts.push(`/system script add name=${CARDS_SCRIPT} policy=read,write,test,sensitive source="${escapeRos(cardsScriptSource(token, 'hotspot', url.replace('router-report', 'router-cards')))}"`);
  parts.push(`/system scheduler add name=${CARDS_SCRIPT} interval=5m start-time=startup on-event=${CARDS_SCRIPT}`);
  // User Manager only where its package is installed (its menus do not exist elsewhere); v6 keeps it under /tool.
  const cu = url.replace('router-report', 'router-cards');
  const umAdd = (k: CardsKind) => `/system script add name=${UM_SCRIPT} policy=read,write,test,sensitive source="${escapeRos(cardsScriptSource(token, k, cu))}"; /system scheduler add name=${UM_SCRIPT} interval=5m start-time=startup on-event=${UM_SCRIPT}`;
  parts.push(`:if ([:len [/system package find where name="user-manager" and disabled=no]] > 0) do={:if ([:pick [/system resource get version] 0 1] = "7") do={${umAdd('um7')}} else={${umAdd('um6')}}}`);
  parts.push(`/system script run ${SCRIPT_NAME}`, `:do {/system script run ${CARDS_SCRIPT}} on-error={}`, `:do {/system script run ${UM_SCRIPT}} on-error={}`);
  return parts;
}

export function buildRemoveCommand(): string {
  return [SCRIPT_NAME, CARDS_SCRIPT, UM_SCRIPT].map((n) => `/system scheduler remove [find name=${n}]; /system script remove [find name=${n}]`).join('; ');
}

/** Map a RouterOS version string like "7.15.3 (stable)" to our major label. */
export function majorVersion(version: string | undefined | null): 'v6' | 'v7' | null {
  const m = /^\s*(\d+)\./.exec(version ?? '');
  if (!m) return null;
  return m[1] === '6' ? 'v6' : 'v7';
}

/** Direct access needs IP Cloud, a public address on the router itself and the API (8728/8729) switched on. Works on v6 and v7. */
export function directAccessState(s: { cloudName?: string; behindNat?: string; apiDisabled?: string; apiSslDisabled?: string } | null | undefined): 'unavailable' | 'needs_api' | 'ready' {
  if (!s?.cloudName || s.behindNat !== 'no') return 'unavailable';
  return s.apiDisabled === 'true' && s.apiSslDisabled === 'true' ? 'needs_api' : 'ready';
}

export const RETRY_FAILED_MS = 30 * 60_000;
const REFRESH_CARDS_MS = 5 * 60_000;

/**
 * Decides when the server tries the direct API link on its own: right away for a new or reconnected router,
 * every 5 minutes when it works, and only every 30 minutes after a failure: a busy router is not woken again and again,
 * and "Try now" or Reconnect still checks at once.
 */
export function shouldTryDirect(
  r: { cloud_host: string | null; direct_port: number | null; last_check_error: string | null; direct_checked_at: string | null; cards_synced_at: string | null },
  s: Parameters<typeof directAccessState>[0] & { apiUser?: number | undefined },
  now = Date.now(),
): boolean {
  if (directAccessState(s) !== 'ready') return false;
  if (s?.apiUser === 0) return false;
  const since = (iso: string | null) => (iso ? now - new Date(iso).getTime() : Infinity);
  if (!r.direct_checked_at) return true;
  if (r.last_check_error || !r.direct_port) return since(r.direct_checked_at) >= RETRY_FAILED_MS;
  return since(r.cards_synced_at) >= REFRESH_CARDS_MS || since(r.direct_checked_at) >= REFRESH_CARDS_MS;
}

export const API_ENABLE_COMMAND = '/ip service set api disabled=no';

export function isOnline(lastSeenAt: string | null, now = Date.now()): boolean {
  return !!lastSeenAt && now - new Date(lastSeenAt).getTime() < OFFLINE_AFTER_MS;
}

export function newToken(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(24));
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

export async function hashToken(token: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(token));
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, '0')).join('');
}
