// Browser-safe rules for packages (Hotspot profiles and User Manager profiles): reading them in owner words,
// checking a new or edited package, and the fixed line the router script runs. Nothing here talks to the router.
import { durationToSeconds } from './routeros-api';

export type PkgSource = 'hotspot' | 'usermanager';
export type PkgAction = 'add' | 'edit' | 'del';
/** Speeds and sizes are kept as plain numbers: kbps for speed, MB for data, seconds for time. 0 means "no limit". */
export type PkgInput = {
  source: PkgSource; action: PkgAction; name: string;
  price?: number; sell?: number; devices?: number;
  downKbps?: number; upKbps?: number;
  validityS?: number; uptimeS?: number; dataMB?: number;
};

/** Package names travel inside RouterOS commands: letters, digits, dot, dash and underscore only. */
export const PKG_NAME = /^[A-Za-z0-9._-]{1,24}$/;
const MAX = { price: 99_999_999, devices: 50, kbps: 1_000_000, validityS: 366 * 86400, uptimeS: 366 * 86400, dataMB: 10_000_000 };

export type PkgError = 'bad_name' | 'bad_number' | 'validity_short' | 'nothing' | null;

/** Checks a package before it is queued. The usage time can never be longer than the validity: the card would expire with time left. */
export function checkPackage(p: PkgInput): PkgError {
  if (!PKG_NAME.test(p.name)) return 'bad_name';
  if (p.action === 'del') return null;
  const nums: [number | undefined, number][] = [[p.price, MAX.price], [p.sell, MAX.price], [p.devices, MAX.devices], [p.downKbps, MAX.kbps], [p.upKbps, MAX.kbps], [p.validityS, MAX.validityS], [p.uptimeS, MAX.uptimeS], [p.dataMB, MAX.dataMB]];
  for (const [v, max] of nums) if (v != null && (!Number.isInteger(v) || v < 0 || v > max)) return 'bad_number';
  if (p.validityS && p.uptimeS && p.uptimeS > p.validityS) return 'validity_short';
  return null;
}

/** Seconds to the RouterOS duration we write: whole weeks, days, hours or minutes ("7d", "5h", "90m"). */
export function rosDuration(s: number | undefined): string {
  if (!s) return '0s';
  if (s % 86400 === 0) return `${s / 86400}d`;
  if (s % 3600 === 0) return `${s / 3600}h`;
  return `${Math.max(1, Math.round(s / 60))}m`;
}
/** kbps to a RouterOS rate ("2M", "512k"). */
export function rosRate(k: number | undefined): string {
  if (!k) return '0';
  return k % 1000 === 0 ? `${k / 1000}M` : `${k}k`;
}

/**
 * The Hotspot on-login script: a Mikhmon header (so Mikhmon and Mikro read the price and validity) and, when the
 * package has a validity, a one-time timer per card that turns the card off when its days are up. The expiry date is
 * written in the card note only when the note is empty or a Mikhmon batch note (vc-/up-), like Mikhmon does.
 */
export function hotspotOnLogin(p: Pick<PkgInput, 'price' | 'sell' | 'validityS'>): string {
  const v = p.validityS ? rosDuration(p.validityS) : '';
  const head = `:put (",ntf,${p.price ?? 0},${v || '0'},${p.sell ?? 0},,Disable,");`;
  if (!v) return head;
  const off = String.raw`("/ip hotspot user set [find name=\"" . $user . "\"] disabled=yes; :do {/ip hotspot active remove [find user=\"" . $user . "\"]} on-error={}; /system scheduler remove [find name=\"mikro-exp-" . $user . "\"]")`;
  return head + ' ' + String.raw`:local n ("mikro-exp-" . $user); :if ([:len [/system scheduler find name=$n]] = 0) do={/system scheduler add name=$n interval=` + v + ` on-event=${off}; :delay 1s; ` +
    String.raw`:local x [:tostr [/system scheduler get [find name=$n] next-run]]; :local d [:tostr [/system clock get date]]; :if ([:len $x] = 8) do={:set x ($d . " " . $x)}; :if ([:len $x] = 15) do={:set x ([:pick $x 0 6] . "/" . [:pick $d 7 11] . " " . [:pick $x 7 15])}; ` +
    String.raw`:local u [/ip hotspot user find name=$user]; :local c [:tostr [/ip hotspot user get $u comment]]; :if (($c = "") || ([:pick $c 0 3] = "vc-") || ([:pick $c 0 3] = "up-")) do={/ip hotspot user set $u comment=$x}}`;
}

/**
 * The line the router script reads: pkg|job|source|action|name|devices|down|up|validity|uptime|bytes|price|onlogin.
 * Every field is a plain number, a RouterOS duration or a checked name; the on-login text is last so it can hold anything we built.
 */
export function packageJobLine(id: string, p: PkgInput): string | null {
  if (checkPackage(p)) return null;
  const f = [p.devices ?? 0, rosRate(p.downKbps), rosRate(p.upKbps), rosDuration(p.validityS), rosDuration(p.uptimeS), (p.dataMB ?? 0) * 1024 * 1024, p.price ?? 0];
  const ol = p.source === 'hotspot' && p.action !== 'del' ? hotspotOnLogin(p) : '-';
  return ['pkg', id, p.source, p.action, p.name, ...f, ol].join('|');
}

/** Bytes or "10G"/"500M" (RouterOS sizes) to bytes. */
export function sizeToBytes(v: string | null | undefined): number | null {
  if (!v) return null;
  const m = /^(\d+(?:\.\d+)?)\s*([kKmMgGtT]?)i?B?$/.exec(v.trim());
  if (!m) return null;
  const n = Number(m[1]) * ({ k: 1024, m: 1024 ** 2, g: 1024 ** 3, t: 1024 ** 4 }[m[2]!.toLowerCase()] ?? 1);
  return n > 0 ? Math.round(n) : null;
}

/** "1 جيجا" / "500 ميجا" — how an owner says a data allowance. */
export function humanData(bytes: number | null | undefined, ar: boolean): string | null {
  if (!bytes) return null;
  const mb = bytes / 1024 / 1024;
  if (mb >= 1024) { const g = +(mb / 1024).toFixed(1); return ar ? `${g} جيجا` : `${g} GB`; }
  return ar ? `${Math.round(mb)} ميجا` : `${Math.round(mb)} MB`;
}

/** The commonest non-empty value in a list (Hotspot keeps time and data on each card, so the package value is what most of its cards have). */
export function commonest(values: (number | null | undefined)[]): number | null {
  const m = new Map<number, number>();
  for (const v of values) if (v) m.set(v, (m.get(v) ?? 0) + 1);
  let best: number | null = null, n = 0;
  for (const [v, c] of m) if (c > n) { best = v; n = c; }
  return best;
}

export type PkgFacts = { price: string | null; sell: string | null; dataBytes: number | null; uptimeS: number | null; validityS: number | null; rate: string | null; devices: string | null; fromCards: boolean };

/** One package in owner terms. User Manager has its limits on the package; Hotspot time and data come from its cards. */
export function packageFacts(p: { source: string; price: string | null; sell_price?: string | null; validity: string | null; rate_limit: string | null; shared_users: string | null; extra?: Record<string, string> | null } | undefined, cards: { limit_uptime_s: number | null; limit_bytes: number | null }[]): PkgFacts {
  const x = p?.extra ?? {};
  const um = p?.source === 'usermanager';
  const fromCardsBytes = commonest(cards.map((c) => c.limit_bytes));
  const fromCardsTime = commonest(cards.map((c) => c.limit_uptime_s));
  const umBytes = sizeToBytes(x['transferLimit']);
  const umTime = durationToSeconds(x['uptimeLimit']) || null;
  return {
    price: p?.price ?? null, sell: p?.sell_price && p.sell_price !== p.price ? p.sell_price : null,
    dataBytes: um ? umBytes : fromCardsBytes, uptimeS: um ? umTime : fromCardsTime,
    validityS: durationToSeconds(p?.validity) || null, rate: p?.rate_limit ?? null, devices: p?.shared_users ?? null,
    fromCards: !um && !!(fromCardsBytes || fromCardsTime),
  };
}
