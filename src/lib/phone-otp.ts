// Pure helpers for phone verification codes (browser- and worker-safe).
import { parsePhoneNumberFromString } from 'libphonenumber-js/max';

export const OTP_LENGTH = 6;
export const OTP_TTL_MS = 10 * 60_000;
export const OTP_MAX_ATTEMPTS = 5;
export const OTP_MAX_SENDS_PER_WINDOW = 3;
export const OTP_SEND_WINDOW_MS = 10 * 60_000;
export const OTP_RESEND_AFTER_S = 60;
export const PROOF_TTL_MS = 30 * 60_000;

export const COUNTRIES = [
  { code: 'YE', dial: '+967', flag: '🇾🇪', ar: 'اليمن', en: 'Yemen' },
  { code: 'EG', dial: '+20', flag: '🇪🇬', ar: 'مصر', en: 'Egypt' },
  { code: 'SY', dial: '+963', flag: '🇸🇾', ar: 'سوريا', en: 'Syria' },
  { code: 'SA', dial: '+966', flag: '🇸🇦', ar: 'السعودية', en: 'Saudi Arabia' },
] as const;

/** Returns E.164 (+967...) for a valid mobile number, else null. */
export function normalizePhone(input: string, dial = '+967'): string | null {
  const raw = input.trim().replace(/[\s()-]/g, '').replace(/^00/, '+');
  const full = raw.startsWith('+') ? raw : dial + raw.replace(/^0+/, '');
  const p = parsePhoneNumberFromString(full);
  if (!p || !p.isValid()) return null;
  const type = p.getType();
  if (type && type !== 'MOBILE' && type !== 'FIXED_LINE_OR_MOBILE') return null;
  return p.number as string;
}

export function newOtp(): string {
  const n = crypto.getRandomValues(new Uint32Array(1))[0] % 10 ** OTP_LENGTH;
  return String(n).padStart(OTP_LENGTH, '0');
}

async function hmac(secret: string, msg: string): Promise<string> {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(msg));
  return Array.from(new Uint8Array(sig), (b) => b.toString(16).padStart(2, '0')).join('');
}

export const hashOtp = (secret: string, phone: string, code: string) => hmac(secret, `otp:${phone}:${code}`);

/** Signed, short-lived proof that a phone number was verified. */
export async function signProof(secret: string, phone: string, now = Date.now()): Promise<string> {
  const exp = now + PROOF_TTL_MS;
  return `${phone}.${exp}.${await hmac(secret, `proof:${phone}:${exp}`)}`;
}

export async function verifyProof(secret: string, proof: string, now = Date.now()): Promise<string | null> {
  const [phone, expStr, sig] = proof.split('.');
  const exp = Number(expStr);
  if (!phone || !sig || !Number.isFinite(exp) || exp < now) return null;
  const expected = await hmac(secret, `proof:${phone}:${exp}`);
  if (expected.length !== sig.length) return null;
  let diff = 0;
  for (let i = 0; i < sig.length; i++) diff |= expected.charCodeAt(i) ^ sig.charCodeAt(i);
  return diff === 0 ? phone : null;
}
