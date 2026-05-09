// Service Worker desactivado temporalmente para evitar conflictos de caché
// Se reactivará en producción
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(keys.map(k => caches.delete(k))))
  );
  self.clients.claim();
});
self.addEventListener('fetch', (e) => {
  // No caching: pasa todo al network
  e.respondWith(fetch(e.request).catch(() => new Response('', { status: 503 })));
});
