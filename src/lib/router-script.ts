// Builds the RouterOS paste commands that make a router push its status to Mikro.
export const REPORT_URL = 'https://mikro.alwahdi.com/api/public/router-report';
export const OFFLINE_AFTER_MS = 90_000;
export const SCRIPT_NAME = 'mikro-report';

export function reportScriptSource(token: string, url = REPORT_URL): string {
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
    ':local um 0',
    ':do {:set um [:len [[:parse "/user-manager session find where active"]]]} on-error={}',
    // User Manager v6 lives under /tool; the other version's path is compiled at run time so it never breaks the script.
    ':if ($um = 0) do={:do {:set um [:len [[:parse "/tool user-manager session find where active"]]]} on-error={}}',
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
    ':local pa ""',
    ':do {:set pa [:tostr [/ip cloud get public-address]]} on-error={}',
    // Behind NAT unless the IP Cloud public address sits on one of the router's own interfaces.
    ':local nat "unknown"',
    ':if ([:len $pa] > 0) do={:set nat "yes"; :foreach a in=[/ip address find] do={:local ad [:tostr [/ip address get $a address]]; :if ([:pick $ad 0 [:find $ad "/"]] = $pa) do={:set nat "no"}}}',
    ':local json ("{\\"identity\\":\\"" . $id . "\\",\\"board\\":\\"" . $board . "\\",\\"version\\":\\"" . $ver . "\\",\\"uptime\\":\\"" . $up . "\\",\\"cpu\\":" . $cpu . ",\\"freeMemory\\":" . $fm . ",\\"totalMemory\\":" . $tm . ",\\"freeHdd\\":" . $fh . ",\\"totalHdd\\":" . $th . ",\\"hotspotActive\\":" . $hs . ",\\"temperature\\":\\"" . $temp . "\\",\\"cloudName\\":\\"" . $cn . "\\",\\"sslPort\\":\\"" . $sp . "\\",\\"sslDisabled\\":\\"" . $sd . "\\",\\"publicAddress\\":\\"" . $pa . "\\",\\"behindNat\\":\\"" . $nat . "\\",\\"apiPort\\":\\"" . $ap . "\\",\\"apiDisabled\\":\\"" . $apd . "\\",\\"apiSslPort\\":\\"" . $asp . "\\",\\"apiSslDisabled\\":\\"" . $asd . "\\",\\"apiUser\\":" . $au . ",\\"ntp\\":\\"" . $ntp . "\\",\\"clockDate\\":\\"" . $cd . "\\",\\"services\\":\\"" . $svc . "\\",\\"socks\\":\\"" . $sk . "\\",\\"proxy\\":\\"" . $px . "\\",\\"users\\":" . $uc . ",\\"idle\\":\\"" . $idl . "\\",\\"shared\\":\\"" . $shr . "\\",\\"umActive\\":" . $um . ",\\"umi\\":\\"" . $umi . "\\",\\"umr\\":" . $umr . ",\\"act\\":\\"" . $act . "\\",\\"actMore\\":\\"" . $am . "\\"}")',
    // The reply may carry one task. Only the tasks written here can run: restart, or remove used-up Hotspot cards
    // (each card is checked on the router itself before removal). Nothing else in the reply is ever executed.
    ':local job ""',
    `:do {:local res [/tool fetch url="${url}" http-method=post http-header-field="Content-Type: application/json,X-Mikro-Token: ${token}" http-data=$json output=user as-value]; :set job ($res->"data")} on-error={}`,
    ':if ([:pick $job 0 7] = "reboot|") do={:delay 2s; /system reboot}',
    `:if ([:pick $job 0 3] = "rm|") do={:local rest [:pick $job 3 [:len $job]]; :local jid [:pick $rest 0 [:find $rest "|"]]; :local c 0; :foreach n in=[:toarray [:pick $rest ([:find $rest "|"] + 1) [:len $rest]]] do={:local u [/ip hotspot user find name=$n]; :if ([:len $u] > 0) do={:local r [/ip hotspot user get $u]; :local done false; :do {:if (($r->"uptime") >= ($r->"limit-uptime")) do={:set done true}} on-error={}; :do {:if ((($r->"bytes-in") + ($r->"bytes-out")) >= ($r->"limit-bytes-total")) do={:set done true}} on-error={}; :if ($done) do={/ip hotspot user remove $u; :set c ($c + 1)}}}; :do {/tool fetch url="${url.replace('router-report', 'router-job')}" http-method=post http-header-field="Content-Type: application/json,X-Mikro-Token: ${token}" http-data=("{\\"job\\":\\"" . $jid . "\\",\\"removed\\":" . $c . "}") output=none} on-error={}}`,
    // card|job|source|action|name|value: one fixed action on one card. Values were checked on our server (letters, digits . _ @ - only).
    String.raw`:if ([:pick $job 0 5] = "card|") do={:local r [:pick $job 5 [:len $job]]; :local i [:find $r "|"]; :local jid [:pick $r 0 $i]; :set r [:pick $r ($i + 1) [:len $r]]; :set i [:find $r "|"]; :local src [:pick $r 0 $i]; :set r [:pick $r ($i + 1) [:len $r]]; :set i [:find $r "|"]; :local act [:pick $r 0 $i]; :set r [:pick $r ($i + 1) [:len $r]]; :set i [:find $r "|"]; :local n [:pick $r 0 $i]; :local v [:pick $r ($i + 1) [:len $r]]; :local res "ok"; :do {` +
    String.raw`:if ($src = "hotspot") do={:local u [/ip hotspot user find name=$n]; :if ([:len $u] = 0) do={:set res "missing"} else={:if ($act = "pw") do={/ip hotspot user set $u password=$v}; :if ($act = "name") do={:if ([:len [/ip hotspot user find name=$v]] > 0) do={:set res "exists"} else={/ip hotspot user set $u name=$v}}; :if ($act = "off") do={/ip hotspot user set $u disabled=yes; :do {/ip hotspot active remove [find user=$n]} on-error={}}; :if ($act = "on") do={/ip hotspot user set $u disabled=no}; :if ($act = "kick") do={/ip hotspot active remove [find user=$n]}; :if ($act = "del") do={:do {/ip hotspot active remove [find user=$n]} on-error={}; /ip hotspot user remove $u}}}; ` +
    String.raw`:if ($src = "usermanager") do={:local b "/user-manager user"; :local k "name"; :if ([:pick $ver 0 1] = "6") do={:set b "/tool user-manager user"; :set k "username"}; :local sel ("[find " . $k . "=\"" . $n . "\"]"); :local f [:parse (":return [" . $b . " find " . $k . "=\"" . $n . "\"]")]; :if ([:len [$f]] = 0) do={:set res "missing"}; :if ($res = "ok") do={:local cmd ""; :if ($act = "pw") do={:set cmd ($b . " set " . $sel . " password=\"" . $v . "\"")}; :if ($act = "name") do={:local g [:parse (":return [" . $b . " find " . $k . "=\"" . $v . "\"]")]; :if ([:len [$g]] > 0) do={:set res "exists"} else={:set cmd ($b . " set " . $sel . " " . $k . "=\"" . $v . "\"")}}; :if ($act = "off") do={:set cmd ($b . " set " . $sel . " disabled=yes")}; :if ($act = "on") do={:set cmd ($b . " set " . $sel . " disabled=no")}; :if ($act = "del") do={:set cmd ($b . " remove " . $sel)}; :if (($act = "off") || ($act = "kick") || ($act = "del")) do={:do {/ip hotspot active remove [find user=$n]} on-error={}; :do {/ppp active remove [find name=$n]} on-error={}}; :if ([:len $cmd] > 0) do={:local f [:parse $cmd]; $f}}}` +
    `} on-error={:set res "error"}; :do {/tool fetch url="${url.replace('router-report', 'router-job')}" http-method=post http-header-field="Content-Type: application/json,X-Mikro-Token: ${token}" http-data=("{\\"job\\":\\"" . $jid . "\\",\\"result\\":\\"" . $res . "\\"}") output=none} on-error={}}`,
  ].join('\n');
}

export const CARDS_URL = REPORT_URL.replace('router-report', 'router-cards');
export const CARDS_SCRIPT = 'mikro-cards';
export const UM_SCRIPT = 'mikro-um';

/**
 * Sends every card in batches of 40, then the packages (behind NAT this is how we read cards). Fields are read from the item
 * array, so missing ones stay empty. The password itself never leaves the router: only "same as name" / "none" / "other".
 */
export function cardsScriptSource(token: string, kind: 'hotspot' | 'usermanager', url = CARDS_URL): string {
  const menu = kind === 'hotspot' ? '/ip hotspot user' : '/user-manager user';
  const fields = kind === 'hotspot' ? ['name', 'profile', 'uptime', 'bytes-in', 'bytes-out', 'limit-uptime', 'limit-bytes-total', 'disabled', 'comment'] : ['name', 'group', 'disabled', 'comment'];
  const row = fields.map((f) => `"\\"" . [:tostr ($r->"${f}")] . "\\""`).join(' . "," . ') + ' . ",\\"" . $pm . "\\""';
  const pmenu = kind === 'hotspot' ? '/ip hotspot user profile' : '/user-manager profile';
  const pfields = kind === 'hotspot' ? ['name', 'rate-limit', 'shared-users', 'session-timeout'] : ['name', 'name-for-users', 'validity', 'price'];
  const prow = pfields.map((f) => `"\\"" . [:tostr ($r->"${f}")] . "\\""`).join(' . "," . ');
  const send = (done: string, what = kind as string) => `/tool fetch url="${url}" http-method=post http-header-field="Content-Type: application/json,X-Mikro-Token: ${token}" http-data=("{\\"source\\":\\"${what}\\",\\"page\\":" . $p . ",\\"done\\":${done},\\"rows\\":[" . $b . "]}") output=none`;
  return [
    ':local p 0', ':local b ""', ':local n 0',
    `:foreach u in=[${menu} find] do={:local r [${menu} get $u]; :local pw [:tostr ($r->"password")]; :local pm "other"; :if ($pw = "") do={:set pm "none"}; :if ($pw = [:tostr ($r->"name")]) do={:set pm "same"}; :if ($n > 0) do={:set b ($b . ",")}; :set b ($b . "[" . ${row} . "]"); :set n ($n + 1); :if ($n = 40) do={${send('false')}; :set b ""; :set n 0; :set p ($p + 1)}}`,
    send('true'),
    ':set b ""; :set n 0; :set p 0',
    `:foreach u in=[${pmenu} find] do={:local r [${pmenu} get $u]; :if ($n < 50) do={:if ($n > 0) do={:set b ($b . ",")}; :set b ($b . "[" . ${prow} . "]"); :set n ($n + 1)}}`,
    send('true', `${kind}-profiles`),
  ].join('\n');
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
  // User Manager (v7 package) only where it is installed; its menu does not exist elsewhere.
  parts.push(`:if (([:len [/system package find name=user-manager]] > 0) && ([:pick [/system resource get version] 0 1] = "7")) do={/system script add name=${UM_SCRIPT} policy=read,write,test,sensitive source="${escapeRos((cardsScriptSource(token, 'usermanager', url.replace('router-report', 'router-cards'))))}"; /system scheduler add name=${UM_SCRIPT} interval=5m start-time=startup on-event=${UM_SCRIPT}}`);
  parts.push(`/system script run ${SCRIPT_NAME}`, `:do {/system script run ${CARDS_SCRIPT}} on-error={}`);
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

const RETRY_FAILED_MS = 3 * 60_000;
const REFRESH_CARDS_MS = 5 * 60_000;

/**
 * Decides when the server tries the direct API link on its own: right away for a new or reconnected router,
 * every 5 minutes when it works (cards), and at most every 3 minutes after a failure so we never hammer the router's login.
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
