const CACHE_NAME = 'nosso-time-blindado-v1';
const ASSETS = [
  './',
  './index.html'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  event.respondWith(
    fetch(event.request)
      .then(async (networkResponse) => {
        if (!networkResponse || !networkResponse.ok) {
          const cached = await caches.match(event.request);
          return cached || networkResponse;
        }

        const clone = networkResponse.clone();
        const contentType = clone.headers.get('content-type') || '';

        if (contentType.includes('text/html')) {
          const bodyText = await clone.text();
          // Bloqueia cachear HTML quebrado ou com placeholder de build
          if (bodyText.includes('PLACEHOLDER_WILL_REPLACE') || !bodyText.includes('Nosso Time')) {
            const cached = await caches.match(event.request) || await caches.match('./index.html');
            if (cached) return cached;
          }
          const cache = await caches.open(CACHE_NAME);
          await cache.put(event.request, new Response(bodyText, {
            status: networkResponse.status,
            statusText: networkResponse.statusText,
            headers: networkResponse.headers
          }));
          return new Response(bodyText, {
            status: networkResponse.status,
            statusText: networkResponse.statusText,
            headers: networkResponse.headers
          });
        }

        const cache = await caches.open(CACHE_NAME);
        cache.put(event.request, clone);
        return networkResponse;
      })
      .catch(async () => {
        const cached = await caches.match(event.request) || await caches.match('./index.html');
        return cached || new Response('Offline sem cache', { status: 503 });
      })
  );
});
