// Offline support: pages come from the network when possible (so updates
// arrive), everything else from the cache first. Bump VERSION to drop old caches.
const VERSION = 'spark-chain-v5';

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(['./', 'manifest.webmanifest', 'icon-192.png'])));
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k)))),
  );
  self.clients.claim();
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;
  // Pages and the daily puzzle list: network first, so they're never stale.
  if (req.mode === 'navigate' || req.url.endsWith('daily.json')) {
    e.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          const key = req.mode === 'navigate' ? './' : req;
          caches.open(VERSION).then((c) => c.put(key, copy));
          return res;
        })
        .catch(() => caches.match(req.mode === 'navigate' ? './' : req)),
    );
    return;
  }
  e.respondWith(
    caches.match(req).then(
      (hit) =>
        hit ||
        fetch(req).then((res) => {
          if (res.ok) {
            const copy = res.clone();
            caches.open(VERSION).then((c) => c.put(req, copy));
          }
          return res;
        }),
    ),
  );
});
