// Mikro notifications worker: shows pushed alerts and opens the related page on tap. No caching, no offline mode.
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));
self.addEventListener('push', (event) => {
  let msg = { title: 'Mikro', body: '', path: '/alerts', tag: 'mikro' };
  try { msg = { ...msg, ...event.data.json() }; } catch (_) { if (event.data) msg.body = event.data.text(); }
  event.waitUntil((async () => {
    let shown = true;
    try { await self.registration.showNotification(msg.title, { body: msg.body, tag: msg.tag, renotify: true, icon: '/icon-192.png', badge: '/icon-192.png', dir: 'auto', data: { path: msg.path } }); }
    catch (_) { shown = false; await self.registration.showNotification(msg.title, { body: msg.body }).then(() => { shown = true; }, () => {}); }
    // Tell open Mikro pages the alert arrived, so the phone check can confirm delivery.
    const all = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    all.forEach((c) => c.postMessage({ type: 'mikro-push', tag: msg.tag, shown }));
  })());
});
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = new URL(event.notification.data?.path || '/alerts', self.location.origin).href;
  event.waitUntil((async () => {
    const all = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    const open = all.find((c) => new URL(c.url).origin === self.location.origin);
    if (open) { await open.focus(); return open.navigate(url); }
    return self.clients.openWindow(url);
  })());
});
