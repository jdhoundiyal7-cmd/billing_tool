// Simple offline-first service worker for the Billing Tool PWA.
// Bumping CACHE_NAME forces users to get fresh files on next visit.
const CACHE_NAME = 'billing-tool-v1';
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png'
];

// Install: pre-cache the core app shell
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(ASSETS_TO_CACHE))
      .then(() => self.skipWaiting())
  );
});

// Activate: clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((key) => key !== CACHE_NAME)
            .map((key) => caches.delete(key))
      )
    ).then(() => self.clients.claim())
  );
});

// Fetch: network-first for the sync/API calls, cache-first for app shell
self.addEventListener('fetch', (event) => {
  const req = event.request;

  // Only handle GET requests; let everything else (POST sync calls) pass through
  if (req.method !== 'GET') return;

  event.respondWith(
    caches.match(req).then((cachedResponse) => {
      const networkFetch = fetch(req)
        .then((networkResponse) => {
          // Update cache with the latest version in the background
          if (networkResponse && networkResponse.ok && req.url.startsWith(self.location.origin)) {
            const clone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(req, clone));
          }
          return networkResponse;
        })
        .catch(() => cachedResponse); // offline fallback

      // Serve cached version instantly if we have it, refresh cache in background
      return cachedResponse || networkFetch;
    })
  );
});
