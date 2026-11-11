import { describe, it, expect } from 'vitest';
import { p256 } from '@noble/curves/nist.js';
import { b64u, encryptPayload, unb64u, vapidJwt, vapidKeys } from '@/lib/web-push';

// Decrypts like a browser would (RFC 8291), to prove the message is readable by the phone.
async function decrypt(body: Uint8Array, uaSecret: Uint8Array, uaPublic: Uint8Array, auth: Uint8Array) {
  const salt = body.slice(0, 16); const asPublic = body.slice(21, 86); const cipher = body.slice(86);
  const enc = new TextEncoder();
  const h = async (s: Uint8Array, ikm: Uint8Array, info: Uint8Array, n: number) => new Uint8Array(await crypto.subtle.deriveBits({ name: 'HKDF', hash: 'SHA-256', salt: s as BufferSource, info: info as BufferSource }, await crypto.subtle.importKey('raw', ikm as BufferSource, 'HKDF', false, ['deriveBits']), n * 8));
  const ecdh = p256.getSharedSecret(uaSecret, asPublic, true).slice(1);
  const ikm = await h(auth, ecdh, new Uint8Array([...enc.encode('WebPush: info\0'), ...uaPublic, ...asPublic]), 32);
  const cek = await h(salt, ikm, enc.encode('Content-Encoding: aes128gcm\0'), 16);
  const nonce = await h(salt, ikm, enc.encode('Content-Encoding: nonce\0'), 12);
  const plain = new Uint8Array(await crypto.subtle.decrypt({ name: 'AES-GCM', iv: nonce as BufferSource }, await crypto.subtle.importKey('raw', cek as BufferSource, 'AES-GCM', false, ['decrypt']), cipher as BufferSource));
  return new TextDecoder().decode(plain.slice(0, plain.lastIndexOf(2)));
}

describe('web push', () => {
  it('encrypts a message the phone can decrypt', async () => {
    const ua = p256.utils.randomSecretKey(); const uaPub = p256.getPublicKey(ua, false); const auth = crypto.getRandomValues(new Uint8Array(16));
    const body = await encryptPayload('{"title":"Router down"}', uaPub, auth);
    expect(body[20]).toBe(65);
    expect(await decrypt(body, ua, uaPub, auth)).toBe('{"title":"Router down"}');
  });
  it('signs a VAPID token for the push service origin', async () => {
    const { secretKey, publicKey } = await vapidKeys('seed');
    const jwt = await vapidJwt('https://fcm.googleapis.com/fcm/send/abc', secretKey, 'mailto:x@y.z', 0);
    const [h, b, s] = jwt.split('.');
    expect(JSON.parse(new TextDecoder().decode(unb64u(b!))).aud).toBe('https://fcm.googleapis.com');
    expect(p256.verify(unb64u(s!), new TextEncoder().encode(`${h}.${b}`), publicKey)).toBe(true);
    expect(b64u(publicKey)).toHaveLength(87);
  });
});
