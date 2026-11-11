// Short router setup codes: the router downloads its full setup with one short command instead of an 11k-character paste.
// The payload (token + API password) is sealed with a key derived from the code; only the code's hash is stored.
const ALPHABET = '23456789ABCDEFGHJKMNPQRSTUVWXYZ'; // no 0/O, 1/I/L
export const CODE_LENGTH = 8;
export const SETUP_TTL_MS = 60 * 60_000;
export const SETUP_BASE = 'https://mikro.alwahdi.com/api/public/s/';
export const SETUP_FILE = 'mikro.rsc';
const enc = new TextEncoder();

export function newSetupCode(): string {
  const out: string[] = [];
  while (out.length < CODE_LENGTH) {
    for (const b of crypto.getRandomValues(new Uint8Array(16))) {
      if (b < 248 && out.length < CODE_LENGTH) out.push(ALPHABET.charAt(b % 31)); // 248 = 31*8, no modulo bias
    }
  }
  return out.join('');
}

export function normalizeSetupCode(raw: string): string | null {
  const c = raw.trim().toUpperCase().replace(/\.RSC$/, '');
  return c.length === CODE_LENGTH && [...c].every((ch) => ALPHABET.includes(ch)) ? c : null;
}

const hex = (b: ArrayBuffer) => Array.from(new Uint8Array(b), (x) => x.toString(16).padStart(2, '0')).join('');
export async function setupCodeHash(code: string) { return hex(await crypto.subtle.digest('SHA-256', enc.encode(`setup-id:${code}`))); }

async function keyFor(code: string) {
  const ikm = await crypto.subtle.importKey('raw', enc.encode(code), 'HKDF', false, ['deriveKey']);
  return crypto.subtle.deriveKey({ name: 'HKDF', hash: 'SHA-256', salt: enc.encode('mikro-setup-v1'), info: new Uint8Array() }, ikm, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
}
const b64 = (u: Uint8Array) => btoa(String.fromCharCode(...u));
const unb64 = (s: string) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));

export type SetupPayload = { token: string; password: string };
export async function sealSetup(code: string, p: SetupPayload): Promise<string> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, await keyFor(code), enc.encode(JSON.stringify(p))));
  return `${b64(iv)}.${b64(ct)}`;
}
export async function openSetup(code: string, sealed: string): Promise<SetupPayload | null> {
  try {
    const [iv = '', ct = ''] = sealed.split('.');
    const pt = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: unb64(iv) as BufferSource }, await keyFor(code), unb64(ct) as BufferSource);
    const p = JSON.parse(new TextDecoder().decode(pt));
    return typeof p.token === 'string' && typeof p.password === 'string' ? p : null;
  } catch { return null; }
}

/**
 * The short command shown to the owner (about 140 characters, one line for mobile terminals).
 * fetch → short pause so the file is written → import → delete the file (it holds the router token).
 */
export function buildShortCommand(code: string): string {
  return `/tool fetch url="${SETUP_BASE}${code}" dst-path=${SETUP_FILE}; :delay 2s; /import file-name=${SETUP_FILE}; /file remove ${SETUP_FILE}`;
}
