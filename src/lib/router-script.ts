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
    ':do {:set temp [:tostr [/system health get temperature]]} on-error={}',
    ':if ($temp = "") do={:do {:set temp [:tostr [/system health get [find name=temperature] value]]} on-error={}}',
    ':local json ("{\\"identity\\":\\"" . $id . "\\",\\"board\\":\\"" . $board . "\\",\\"version\\":\\"" . $ver . "\\",\\"uptime\\":\\"" . $up . "\\",\\"cpu\\":" . $cpu . ",\\"freeMemory\\":" . $fm . ",\\"totalMemory\\":" . $tm . ",\\"freeHdd\\":" . $fh . ",\\"totalHdd\\":" . $th . ",\\"hotspotActive\\":" . $hs . ",\\"temperature\\":\\"" . $temp . "\\"}")',
    `/tool fetch url="${url}" http-method=post http-header-field="Content-Type: application/json,X-Mikro-Token: ${token}" http-data=$json output=none`,
  ].join('\n');
}

/** Escape a script so it can live inside a RouterOS double-quoted string. */
export function escapeRos(source: string): string {
  return source.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\$/g, '\\$').replace(/\n/g, '\\r\\n');
}

export function buildPasteCommand(token: string, url = REPORT_URL): string {
  return [
    `/system scheduler remove [find name=${SCRIPT_NAME}]`,
    `/system script remove [find name=${SCRIPT_NAME}]`,
    `/system script add name=${SCRIPT_NAME} policy=read,write,test source="${escapeRos(reportScriptSource(token, url))}"`,
    `/system scheduler add name=${SCRIPT_NAME} interval=30s start-time=startup on-event=${SCRIPT_NAME}`,
    `/system script run ${SCRIPT_NAME}`,
  ].join('\n');
}

export function buildRemoveCommand(): string {
  return `/system scheduler remove [find name=${SCRIPT_NAME}]\n/system script remove [find name=${SCRIPT_NAME}]`;
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
