const CACHE_NAME = 'nosso-time-inteligencia-v4';
const CORE = ['./', './index.html'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(CORE)).then(() => self.skipWaiting())
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
      .then(async (res) => {
        if (!res || !res.ok) {
          const cached = await caches.match(event.request);
          return cached || res;
        }
        const clone = res.clone();
        const type = clone.headers.get('content-type') || '';
        if (type.includes('text/html')) {
          const html = await clone.text();
          if (html.includes('PLACEHOLDER_WILL_REPLACE') || !html.includes('Nosso Time')) {
            const cached = await caches.match(event.request) || await caches.match('./index.html');
            if (cached) return cached;
          }
          const cache = await caches.open(CACHE_NAME);
          await cache.put(event.request, new Response(html, {
            status: res.status,
            statusText: res.statusText,
            headers: res.headers
          }));
          return new Response(html, {
            status: res.status,
            statusText: res.statusText,
            headers: res.headers
          });
        }
        const cache = await caches.open(CACHE_NAME);
        cache.put(event.request, clone);
        return res;
      })
      .catch(async () => {
        const cached = await caches.match(event.request) || await caches.match('./index.html');
        return cached || new Response('Offline', { status: 503 });
      })
  );
});
