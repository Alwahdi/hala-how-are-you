// Standard Web Push (RFC 8291 aes128gcm + RFC 8292 VAPID) on Web Crypto + noble curves, so it runs on the Worker.
// No Firebase or outside account: the VAPID key pair is derived from one server secret.
import { p256 } from '@noble/curves/nist.js';

const enc = new TextEncoder();
export const b64u = (b: Uint8Array) => btoa(String.fromCharCode(...b)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
export const unb64u = (s: string) => Uint8Array.from(atob(s.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((s.length + 3) % 4)), (c) => c.charCodeAt(0));
const concat = (...parts: Uint8Array[]) => { const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0)); let o = 0; for (const p of parts) { out.set(p, o); o += p.length; } return out; };

/** VAPID key pair from a seed secret (sha256 of the seed is the private scalar). */
export async function vapidKeys(seed: string) {
  const secretKey = new Uint8Array(await crypto.subtle.digest('SHA-256', enc.encode(`vapid:${seed}`)));
  return { secretKey, publicKey: p256.getPublicKey(secretKey, false) };
}

async function hkdf(salt: Uint8Array, ikm: Uint8Array, info: Uint8Array, bytes: number) {
  const key = await crypto.subtle.importKey('raw', ikm as BufferSource, 'HKDF', false, ['deriveBits']);
  return new Uint8Array(await crypto.subtle.deriveBits({ name: 'HKDF', hash: 'SHA-256', salt: salt as BufferSource, info: info as BufferSource }, key, bytes * 8));
}

/** Encrypts one message for a subscription (single record, aes128gcm). Ephemeral key and salt are injectable for tests. */
export async function encryptPayload(payload: string, uaPublic: Uint8Array, authSecret: Uint8Array, eph?: { secretKey: Uint8Array; salt: Uint8Array }) {
  const asSecret = eph?.secretKey ?? p256.utils.randomSecretKey();
  const asPublic = p256.getPublicKey(asSecret, false);
  const salt = eph?.salt ?? crypto.getRandomValues(new Uint8Array(16));
  const ecdh = p256.getSharedSecret(asSecret, uaPublic, true).slice(1);
  const ikm = await hkdf(authSecret, ecdh, concat(enc.encode('WebPush: info\0'), uaPublic, asPublic), 32);
  const cek = await hkdf(salt, ikm, enc.encode('Content-Encoding: aes128gcm\0'), 16);
  const nonce = await hkdf(salt, ikm, enc.encode('Content-Encoding: nonce\0'), 12);
  const key = await crypto.subtle.importKey('raw', cek as BufferSource, 'AES-GCM', false, ['encrypt']);
  const cipher = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv: nonce as BufferSource }, key, concat(enc.encode(payload), new Uint8Array([2])) as BufferSource));
  const header = new Uint8Array(21); header.set(salt, 0); new DataView(header.buffer).setUint32(16, 4096); header[20] = 65;
  return concat(header, asPublic, cipher);
}

export async function vapidJwt(endpoint: string, secretKey: Uint8Array, subject = 'mailto:support@alwahdi.com', now = Date.now()) {
  const head = b64u(enc.encode(JSON.stringify({ typ: 'JWT', alg: 'ES256' })));
  const body = b64u(enc.encode(JSON.stringify({ aud: new URL(endpoint).origin, exp: Math.floor(now / 1000) + 12 * 3600, sub: subject })));
  const sig = p256.sign(enc.encode(`${head}.${body}`), secretKey);
  return `${head}.${body}.${b64u(sig)}`;
}

export type PushSub = { endpoint: string; p256dh: string; auth: string };
export type PushMessage = { title: string; body: string; path?: string; tag?: string };

/** Sends one push. Returns 'gone' when the browser dropped the subscription (delete it). */
export async function sendPush(sub: PushSub, msg: PushMessage, seed: string, urgency: 'normal' | 'high' = 'normal'): Promise<'ok' | 'gone' | 'error'> {
  const { secretKey, publicKey } = await vapidKeys(seed);
  const body = await encryptPayload(JSON.stringify(msg), unb64u(sub.p256dh), unb64u(sub.auth));
  const res = await fetch(sub.endpoint, {
    method: 'POST',
    headers: { Authorization: `vapid t=${await vapidJwt(sub.endpoint, secretKey)}, k=${b64u(publicKey)}`, 'Content-Encoding': 'aes128gcm', 'Content-Type': 'application/octet-stream', TTL: '86400', Urgency: urgency, ...(msg.tag ? { Topic: msg.tag.replace(/[^A-Za-z0-9_-]/g, '').slice(0, 32) } : {}) },
    body: body as BodyInit,
  }).catch(() => null);
  if (!res) return 'error';
  if (res.status === 404 || res.status === 410) return 'gone';
  if (!res.ok) console.error('push failed', res.status, await res.text().catch(() => ''));
  return res.ok ? 'ok' : 'error';
}
