async function key(secret: string) {
  const bytes = new TextEncoder().encode(secret);
  const hash = await crypto.subtle.digest("SHA-256", bytes);
  return crypto.subtle.importKey("raw", hash, "AES-GCM", false, ["encrypt", "decrypt"]);
}
export async function seal(value: string, secret: string, aad: string) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const data = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv, additionalData: new TextEncoder().encode(aad) },
    await key(secret),
    new TextEncoder().encode(value),
  );
  return btoa(String.fromCharCode(...iv, ...new Uint8Array(data)));
}
export async function unseal(value: string, secret: string, aad: string) {
  const bytes = Uint8Array.from(atob(value), (c) => c.charCodeAt(0));
  const data = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: bytes.slice(0, 12), additionalData: new TextEncoder().encode(aad) },
    await key(secret),
    bytes.slice(12),
  );
  return new TextDecoder().decode(data);
}
