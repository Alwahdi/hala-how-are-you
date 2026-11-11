// Browser-safe rules for card actions and package details. The router script only understands these fixed actions.

export const CARD_ACTIONS = ['pw', 'name', 'off', 'on', 'kick', 'del'] as const;
export type CardAction = (typeof CARD_ACTIONS)[number];
export type CardSource = 'hotspot' | 'usermanager';

/** Names and passwords travel inside a RouterOS command, so only characters that can never break out of it are allowed. */
export const SAFE_VALUE = /^[A-Za-z0-9._@-]{1,32}$/;

export function needsValue(a: CardAction): boolean {
  return a === 'pw' || a === 'name';
}

/** Validates an action request; returns an error code or null when it can be sent to the router. */
export function checkCardAction(i: { source: string; action: string; name: string; value?: string | null | undefined }): 'bad_action' | 'bad_name' | 'bad_value' | 'same_name' | null {
  if (!(CARD_ACTIONS as readonly string[]).includes(i.action) || (i.source !== 'hotspot' && i.source !== 'usermanager')) return 'bad_action';
  if (!SAFE_VALUE.test(i.name)) return 'bad_name';
  if (needsValue(i.action as CardAction)) {
    if (!i.value || !SAFE_VALUE.test(i.value)) return 'bad_value';
    if (i.action === 'name' && i.value === i.name) return 'same_name';
  }
  return null;
}

/** The single line the router script reads: card|job|source|action|name|value ("-" when the action has no value). */
export function cardJobLine(id: string, p: { source: string; action: string; name: string; value?: string | null | undefined }): string | null {
  if (checkCardAction(p)) return null;
  return ['card', id, p.source, p.action, p.name, needsValue(p.action as CardAction) ? p.value : '-'].join('|');
}

export const ROUTER_RESULTS = ['ok', 'missing', 'exists', 'error'] as const;
export type RouterResult = (typeof ROUTER_RESULTS)[number];

/** A random password that is easy to read aloud and type: no 0/O/1/l/I. */
export function suggestPassword(len = 6): string {
  const a = '23456789abcdefghjkmnpqrstuvwxyz';
  const b = crypto.getRandomValues(new Uint8Array(len));
  return Array.from(b, (x) => a[x % a.length]).join('');
}

/** Mikhmon keeps price and validity in the hotspot profile on-login script as `:put (",rem,1000,1d,1500,,Enable,")`. */
export function parseMikhmon(s: string | null | undefined): { mode: string; price: string; validity: string; sellPrice: string; lock: string } | null {
  if (!s) return null;
  const m = /:put \("(,[^"]*)"\)/.exec(s);
  const body = m ? m[1]! : s.startsWith(',') ? s : null;
  if (!body) return null;
  const p = body.split(',');
  const mode = p[1] ?? '';
  if (!/^(rem|ntf|remc|ntfc|0)?$/.test(mode)) return null;
  const clean = (v?: string) => (v && v !== '0' ? v.trim() : '');
  const out = { mode, price: clean(p[2]), validity: clean(p[3]), sellPrice: clean(p[4]), lock: (p[6] ?? '').trim() };
  return out.price || out.validity || out.sellPrice ? out : null;
}

/** "384k/1536k" (upload/download) to what an owner says: "1.5 ميجا تنزيل · 384 ك رفع". */
export function humanRate(rate: string | null | undefined, ar: boolean): string | null {
  if (!rate) return null;
  const [up, down] = rate.trim().split(/\s+/)[0]!.split('/');
  const fmt = (v?: string) => {
    if (!v) return null;
    const m = /^(\d+(?:\.\d+)?)([kKmMgG]?)$/.exec(v);
    if (!m) return v;
    let bps = Number(m[1]) * ({ k: 1e3, m: 1e6, g: 1e9 }[m[2]!.toLowerCase()] ?? 1);
    if (bps === 0) return null;
    if (bps >= 1e6) { bps /= 1e6; return `${+bps.toFixed(1)} ${ar ? 'ميجا' : 'Mbps'}`; }
    return `${Math.round(bps / 1e3)} ${ar ? 'ك' : 'kbps'}`;
  };
  const d = fmt(down ?? up), u = down ? fmt(up) : null;
  if (!d && !u) return null;
  return [d && `${d}${ar ? ' تنزيل' : ' down'}`, u && `${u}${ar ? ' رفع' : ' up'}`].filter(Boolean).join(' · ');
}

/** "1d" / "30d" / "4w2d" / "01:00:00" to words. Returns the raw text when it cannot be read. */
export function humanValidity(v: string | null | undefined, ar: boolean): string | null {
  if (!v || v === '0s' || v === 'unlimited') return null;
  const hms = /^(?:(\d+)d\s*)?(\d+):(\d+):(\d+)$/.exec(v);
  let s = 0;
  if (hms) s = Number(hms[1] ?? 0) * 86400 + Number(hms[2]) * 3600 + Number(hms[3]) * 60 + Number(hms[4]);
  else { const u: Record<string, number> = { w: 604800, d: 86400, h: 3600, m: 60, s: 1 }; for (const m of v.matchAll(/(\d+)(w|d|h|m|s)(?!s)/g)) s += Number(m[1]) * u[m[2]!]!; }
  if (!s) return v;
  const d = Math.floor(s / 86400), h = Math.floor((s % 86400) / 3600), m = Math.floor((s % 3600) / 60);
  const parts = ar
    ? [d && (d === 1 ? 'يوم' : d === 2 ? 'يومين' : d <= 10 ? `${d} أيام` : `${d} يوم`), h && (h === 1 ? 'ساعة' : h === 2 ? 'ساعتين' : h <= 10 ? `${h} ساعات` : `${h} ساعة`), m && `${m} دقيقة`]
    : [d && `${d} day${d > 1 ? 's' : ''}`, h && `${h} h`, m && `${m} min`];
  return parts.filter(Boolean).join(ar ? ' و' : ' ');
}

/** "1" shared user → "جهاز واحد". */
export function humanDevices(v: string | null | undefined, ar: boolean): string | null {
  if (!v) return null;
  if (v === 'unlimited') return ar ? 'أجهزة بلا حد' : 'Unlimited devices';
  const n = Number(v); if (!n) return null;
  if (ar) return n === 1 ? 'جهاز واحد' : n === 2 ? 'جهازين' : `${n} أجهزة`;
  return n === 1 ? '1 device' : `${n} devices`;
}

/** User Manager v7 card state from user-profile: waiting (unused), running / running-active (in use), used (finished). */
export function umStateToCard(state: string | null | undefined): 'unused' | 'active' | 'finished' | null {
  if (!state) return null;
  if (state === 'waiting') return 'unused';
  if (state.startsWith('running')) return 'active';
  if (state === 'used') return 'finished';
  return null;
}

/** Is User Manager there and on? From the report: umi = "pkg" (installed) plus ",true|false" on v7; umr = reader script count. */
export function umStatus(s: { umi?: string; umr?: number } | null | undefined): 'unknown' | 'missing' | 'off' | 'on_no_reader' | 'on' {
  if (!s || s.umi === undefined) return 'unknown';
  const [pkg, en] = s.umi.split(',');
  if (pkg !== 'pkg') return 'missing';
  if (en === 'false') return 'off';
  return s.umr ? 'on' : 'on_no_reader';
}
