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
    ':local au 0',
    ':do {:set au [:len [/user find name=mikro-read]]} on-error={}',
    ':local pa ""',
    ':do {:set pa [:tostr [/ip cloud get public-address]]} on-error={}',
    // Behind NAT unless the IP Cloud public address sits on one of the router's own interfaces.
    ':local nat "unknown"',
    ':if ([:len $pa] > 0) do={:set nat "yes"; :foreach a in=[/ip address find] do={:local ad [:tostr [/ip address get $a address]]; :if ([:pick $ad 0 [:find $ad "/"]] = $pa) do={:set nat "no"}}}',
    ':local json ("{\\"identity\\":\\"" . $id . "\\",\\"board\\":\\"" . $board . "\\",\\"version\\":\\"" . $ver . "\\",\\"uptime\\":\\"" . $up . "\\",\\"cpu\\":" . $cpu . ",\\"freeMemory\\":" . $fm . ",\\"totalMemory\\":" . $tm . ",\\"freeHdd\\":" . $fh . ",\\"totalHdd\\":" . $th . ",\\"hotspotActive\\":" . $hs . ",\\"temperature\\":\\"" . $temp . "\\",\\"cloudName\\":\\"" . $cn . "\\",\\"sslPort\\":\\"" . $sp . "\\",\\"sslDisabled\\":\\"" . $sd . "\\",\\"publicAddress\\":\\"" . $pa . "\\",\\"behindNat\\":\\"" . $nat . "\\",\\"apiPort\\":\\"" . $ap . "\\",\\"apiDisabled\\":\\"" . $apd . "\\",\\"apiSslPort\\":\\"" . $asp . "\\",\\"apiSslDisabled\\":\\"" . $asd . "\\",\\"apiUser\\":" . $au . ",\\"umActive\\":" . $um . "}")',
    `/tool fetch url="${url}" http-method=post http-header-field="Content-Type: application/json,X-Mikro-Token: ${token}" http-data=$json output=none`,
  ].join('\n');
}

export const CARDS_URL = REPORT_URL.replace('router-report', 'router-cards');
export const CARDS_SCRIPT = 'mikro-cards';
export const UM_SCRIPT = 'mikro-um';

/** Sends every card in batches of 40 (behind NAT this is how we read cards). Fields are read from the item array, so missing ones stay empty. */
export function cardsScriptSource(token: string, kind: 'hotspot' | 'usermanager', url = CARDS_URL): string {
  const menu = kind === 'hotspot' ? '/ip hotspot user' : '/user-manager user';
  const fields = kind === 'hotspot' ? ['name', 'profile', 'uptime', 'bytes-in', 'bytes-out', 'limit-uptime', 'limit-bytes-total', 'disabled', 'comment'] : ['name', 'group', 'disabled', 'comment'];
  const row = fields.map((f) => `"\\"" . [:tostr ($r->"${f}")] . "\\""`).join(' . "," . ');
  const send = (done: string) => `/tool fetch url="${url}" http-method=post http-header-field="Content-Type: application/json,X-Mikro-Token: ${token}" http-data=("{\\"source\\":\\"${kind}\\",\\"page\\":" . $p . ",\\"done\\":${done},\\"rows\\":[" . $b . "]}") output=none`;
  return [
    ':local p 0', ':local b ""', ':local n 0',
    `:foreach u in=[${menu} find] do={:local r [${menu} get $u]; :if ($n > 0) do={:set b ($b . ",")}; :set b ($b . "[" . ${row} . "]"); :set n ($n + 1); :if ($n = 40) do={${send('false')}; :set b ""; :set n 0; :set p ($p + 1)}}`,
    send('true'),
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
  const parts = [
    `/system scheduler remove [find name=${SCRIPT_NAME}]`,
    `/system script remove [find name=${SCRIPT_NAME}]`,
    `/system script add name=${SCRIPT_NAME} policy=read,write,test source="${escapeRos(reportScriptSource(token, url))}"`,
    `/system scheduler add name=${SCRIPT_NAME} interval=30s start-time=startup on-event=${SCRIPT_NAME}`,
  ];
  if (apiPassword) {
    parts.push(readOnlyUserCommands(apiPassword));
  }
  for (const name of [CARDS_SCRIPT, UM_SCRIPT]) parts.push(`/system scheduler remove [find name=${name}]`, `/system script remove [find name=${name}]`);
  parts.push(`/system script add name=${CARDS_SCRIPT} policy=read,write,test source="${escapeRos(cardsScriptSource(token, 'hotspot', url.replace('router-report', 'router-cards')))}"`);
  parts.push(`/system scheduler add name=${CARDS_SCRIPT} interval=5m start-time=startup on-event=${CARDS_SCRIPT}`);
  // User Manager (v7 package) only where it is installed; its menu does not exist elsewhere.
  parts.push(`:if (([:len [/system package find name=user-manager]] > 0) && ([:pick [/system resource get version] 0 1] = "7")) do={/system script add name=${UM_SCRIPT} policy=read,write,test source="${escapeRos((cardsScriptSource(token, 'usermanager', url.replace('router-report', 'router-cards'))))}"; /system scheduler add name=${UM_SCRIPT} interval=5m start-time=startup on-event=${UM_SCRIPT}}`);
  parts.push(`/system script run ${SCRIPT_NAME}`, `:do {/system script run ${CARDS_SCRIPT}} on-error={}`);
  return parts.join('; ');
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
