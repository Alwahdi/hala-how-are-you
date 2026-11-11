// Browser side of phone alerts: permission, notifications worker, subscription. Call enablePush from a tap.
export type PushStatus = 'registered' | 'unsupported' | 'ios-install' | 'open-in-new-tab' | 'denied' | 'not-configured' | 'error';

export function isIos() { return /iphone|ipad|ipod/i.test(navigator.userAgent); }
export function isStandalone() { return window.matchMedia('(display-mode: standalone)').matches || (navigator as unknown as { standalone?: boolean }).standalone === true; }

/** Current state without prompting. */
export async function pushState(): Promise<'on' | 'off' | 'denied' | 'unsupported' | 'ios-install'> {
  if (isIos() && !isStandalone()) return 'ios-install';
  if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) return 'unsupported';
  if (Notification.permission === 'denied') return 'denied';
  const reg = await navigator.serviceWorker.getRegistration('/');
  const sub = await reg?.pushManager.getSubscription();
  return sub && Notification.permission === 'granted' ? 'on' : 'off';
}

const toKey = (b64: string) => { const s = atob(b64.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((b64.length + 3) % 4)); return Uint8Array.from(s, (c) => c.charCodeAt(0)); };
const b64u = (buf: ArrayBuffer | null) => (buf ? btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '') : '');

export async function enablePush(publicKey: string | null, save: (s: { endpoint: string; p256dh: string; auth: string; userAgent: string }) => Promise<{ ok: boolean }>): Promise<PushStatus> {
  if (!publicKey) return 'not-configured';
  if (window.top !== window.self) return 'open-in-new-tab';
  if (isIos() && !isStandalone()) return 'ios-install';
  if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) return 'unsupported';
  const permission = Notification.permission === 'granted' ? 'granted' : await Notification.requestPermission();
  if (permission !== 'granted') return 'denied';
  try {
    const reg = await navigator.serviceWorker.register('/push-sw.js', { scope: '/' });
    await navigator.serviceWorker.ready;
    const sub = (await reg.pushManager.getSubscription()) ?? (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: toKey(publicKey) as BufferSource }));
    const r = await save({ endpoint: sub.endpoint, p256dh: b64u(sub.getKey('p256dh')), auth: b64u(sub.getKey('auth')), userAgent: navigator.userAgent.slice(0, 200) });
    return r.ok ? 'registered' : 'error';
  } catch (e) {
    console.error('push subscribe failed', e);
    return 'error';
  }
}
