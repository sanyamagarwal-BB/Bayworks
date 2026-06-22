/* BAYWORKS — service worker (offline support for the marketing site + portals).
 *
 * Strategy:
 *  - API calls (/crm-api/*) and non-GET requests: always go to the network,
 *    never cached. Portal data must stay live and scoped per user.
 *  - Page navigations: network-first, falling back to the last cached copy of
 *    that page, then to a friendly /offline.html.
 *  - Static assets (same-origin GET): stale-while-revalidate — instant from
 *    cache, refreshed in the background.
 *
 * Bump CACHE to invalidate everything on the next visit.
 */
const CACHE = 'bayworks-v1';
const PRECACHE = ['/offline.html', '/pwa-192.png', '/pwa-512.png', '/manifest.webmanifest'];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((c) => c.addAll(PRECACHE)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Only handle same-origin GETs. Never touch the API or cross-origin requests.
  if (request.method !== 'GET' || url.origin !== self.location.origin) return;
  if (url.pathname.startsWith('/crm-api')) return;

  // Page navigations → network-first with offline fallback.
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(request, copy));
          return res;
        })
        .catch(() => caches.match(request).then((hit) => hit || caches.match('/offline.html'))),
    );
    return;
  }

  // Static assets → stale-while-revalidate.
  event.respondWith(
    caches.match(request).then((cached) => {
      const network = fetch(request)
        .then((res) => {
          if (res && res.status === 200 && res.type === 'basic') {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(request, copy));
          }
          return res;
        })
        .catch(() => cached);
      return cached || network;
    }),
  );
});
