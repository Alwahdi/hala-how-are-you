// Pure helpers for the IP Cloud / DDNS (pull) connection method.
export const API_USER = 'mikro-read';
export const API_GROUP = 'mikro-read';

/** Accepts MikroTik IP Cloud names or any public hostname; rejects IPs in private ranges. */
/** Cleans what people paste: Arabic/Persian digits, spaces, scheme, www., paths, trailing dots. */
export function cleanAddressInput(input: string): string {
  return input
    .replace(/[\u0660-\u0669]/g, (d) => String(d.charCodeAt(0) - 0x0660))
    .replace(/[\u06f0-\u06f9]/g, (d) => String(d.charCodeAt(0) - 0x06f0))
    .replace(/[\s\u200e\u200f]+/g, '')
    .replace(/\uff1a/g, ':')
    .toLowerCase()
    .replace(/^[a-z]+:\/\//, '')
    .replace(/^[^@/]*@/, '')
    .replace(/^www\./, '')
    .replace(/[/?#].*$/, '')
    .replace(/\.+(?=:|$)/, '');
}

export function normalizeCloudHost(input: string): string | null {
  const h = cleanAddressInput(input);
  if (!/^[a-z0-9.-]{4,253}$/.test(h) || !h.includes('.')) return null;
  if (/^(10\.|127\.|192\.168\.|169\.254\.|172\.(1[6-9]|2\d|3[01])\.|100\.(6[4-9]|[7-9]\d|1[01]\d|12[0-7])\.)/.test(h)) return null;
  if (h === 'localhost' || h.endsWith('.local') || h.endsWith('.internal')) return null;
  return h;
}

/** Accepts "host", "host:port" or a URL plus an optional separate port; returns "host" or "host:port" (443 omitted). */
export function normalizeCloudAddress(input: string, port?: number | string | null): string | null {
  const raw = cleanAddressInput(input);
  const m = /^(.*?)(?::(\d{1,5}))?$/.exec(raw);
  const host = normalizeCloudHost(m?.[1] ?? '');
  if (!host) return null;
  const cp = typeof port === 'string' ? cleanAddressInput(port) : port;
  const p = Number(m?.[2] ?? (cp === '' || cp == null ? 443 : cp));
  if (!Number.isInteger(p) || p < 1 || p > 65535) return null;
  return p === 443 ? host : `${host}:${p}`;
}

/**
 * Read-only group and user for Mikro, one line, v6 and v7. The user is removed before its group (a group in use cannot be
 * removed) and every step has its own on-error, so a leftover from an earlier paste can never stop the new password.
 * Only read + api: direct access uses the RouterOS API, never REST or writes. The password is alphanumeric, so no quotes.
 */
export function readOnlyUserCommands(password: string): string {
  if (!/^[A-Za-z0-9]+$/.test(password)) throw new Error('API password must be alphanumeric');
  return [
    `:do {/user remove [find name=${API_USER}]} on-error={}`,
    `:do {/user group remove [find name=${API_GROUP}]} on-error={}`,
    `:do {/user group add name=${API_GROUP} policy=read,api} on-error={}`,
    `:do {/user add name=${API_USER} group=${API_GROUP} password=${password}} on-error={:do {/user set [find name=${API_USER}] group=${API_GROUP} password=${password}} on-error={}}`,
  ].join('; ');
}

/** One line: show the IP Cloud name (enables IP Cloud if it was off). */
export const CLOUD_NAME_COMMAND = '/ip cloud set ddns-enabled=yes; :delay 5s; :put [/ip cloud get dns-name]';

/** One line: trusted certificate for the IP Cloud name and HTTPS service on. Keeps the owner's port. */
export const HTTPS_SETUP_COMMAND = '/certificate enable-ssl-certificate dns-name=[/ip cloud get dns-name]; :delay 20s; /ip service set www-ssl disabled=no certificate=[/certificate find where common-name=[/ip cloud get dns-name]]';

export function newApiPassword(): string {
  const a = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
  return Array.from(crypto.getRandomValues(new Uint8Array(20)), (b) => a[b % a.length]).join('');
}

/** Maps a REST /system/resource response to the status shape used by push reports. */
export function mapResource(r: Record<string, string>, identity?: string, hotspotActive?: number) {
  const n = (v?: string) => (v == null ? undefined : Number(v));
  return {
    identity, board: r['board-name'], version: r['version'], uptime: r['uptime'], cpu: n(r['cpu-load']),
    freeMemory: n(r['free-memory']), totalMemory: n(r['total-memory']), freeHdd: n(r['free-hdd-space']), totalHdd: n(r['total-hdd-space']),
    hotspotActive,
  };
}
