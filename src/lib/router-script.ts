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
    ':local pa ""',
    ':do {:set pa [:tostr [/ip cloud get public-address]]} on-error={}',
    // Behind NAT unless the IP Cloud public address sits on one of the router's own interfaces.
    ':local nat "unknown"',
    ':if ([:len $pa] > 0) do={:set nat "yes"; :foreach a in=[/ip address find] do={:local ad [:tostr [/ip address get $a address]]; :if ([:pick $ad 0 [:find $ad "/"]] = $pa) do={:set nat "no"}}}',
    ':local json ("{\\"identity\\":\\"" . $id . "\\",\\"board\\":\\"" . $board . "\\",\\"version\\":\\"" . $ver . "\\",\\"uptime\\":\\"" . $up . "\\",\\"cpu\\":" . $cpu . ",\\"freeMemory\\":" . $fm . ",\\"totalMemory\\":" . $tm . ",\\"freeHdd\\":" . $fh . ",\\"totalHdd\\":" . $th . ",\\"hotspotActive\\":" . $hs . ",\\"temperature\\":\\"" . $temp . "\\",\\"cloudName\\":\\"" . $cn . "\\",\\"sslPort\\":\\"" . $sp . "\\",\\"sslDisabled\\":\\"" . $sd . "\\",\\"publicAddress\\":\\"" . $pa . "\\",\\"behindNat\\":\\"" . $nat . "\\"}")',
    `/tool fetch url="${url}" http-method=post http-header-field="Content-Type: application/json,X-Mikro-Token: ${token}" http-data=$json output=none`,
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
 * When an API password is given, v7 routers also get the read-only user used for direct IP Cloud access.
 */
export function buildPasteCommand(token: string, apiPassword?: string, url = REPORT_URL): string {
  const parts = [
    `/system scheduler remove [find name=${SCRIPT_NAME}]`,
    `/system script remove [find name=${SCRIPT_NAME}]`,
    `/system script add name=${SCRIPT_NAME} policy=read,write,test source="${escapeRos(reportScriptSource(token, url))}"`,
    `/system scheduler add name=${SCRIPT_NAME} interval=30s start-time=startup on-event=${SCRIPT_NAME}`,
  ];
  if (apiPassword) {
    parts.push(`:if ([:pick [/system resource get version] 0 1] = "7") do={:do {:local f [:parse "${readOnlyUserCommands(apiPassword)}"]; $f} on-error={}}`);
  }
  parts.push(`/system script run ${SCRIPT_NAME}`);
  return parts.join('; ');
}

export function buildRemoveCommand(): string {
  return `/system scheduler remove [find name=${SCRIPT_NAME}]; /system script remove [find name=${SCRIPT_NAME}]`;
}

/** Map a RouterOS version string like "7.15.3 (stable)" to our major label. */
export function majorVersion(version: string | undefined | null): 'v6' | 'v7' | null {
  const m = /^\s*(\d+)\./.exec(version ?? '');
  if (!m) return null;
  return m[1] === '6' ? 'v6' : 'v7';
}

/** Direct access is only useful when the router owns its public address and IP Cloud is on (v7 REST). */
export function directAccessState(s: { version?: string; cloudName?: string; behindNat?: string; sslDisabled?: string } | null | undefined): 'unavailable' | 'needs_https' | 'ready' {
  if (!s?.cloudName || !s.version?.startsWith('7') || s.behindNat !== 'no') return 'unavailable';
  return s.sslDisabled === 'true' ? 'needs_https' : 'ready';
}

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
