const CACHE_NAME = 'moathen-static-v3';
const CORE = [
  '/', '/manifest.webmanifest', '/precache-manifest.json',
  '/icons/moathen-mark-192.png', '/icons/moathen-mark-512.png',
  '/audio/beautiful-adhan.mp3', '/audio/azan-andrewler.mp3'
];

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const manifestResponse = await fetch('/precache-manifest.json');
    if (!manifestResponse.ok) throw new Error('PWA precache manifest unavailable');
    const manifest = await manifestResponse.json();
    const cache = await caches.open(CACHE_NAME);
    await cache.addAll([...new Set([...CORE, ...(manifest.assets ?? [])])]);
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET' || new URL(request.url).origin !== self.location.origin) return;

  if (request.mode === 'navigate') {
    event.respondWith(fetch(request).then(async (response) => {
      if (response.ok) {
        const cache = await caches.open(CACHE_NAME);
        await cache.put('/', response.clone());
      }
      return response;
    }).catch(() => caches.match('/')));
    return;
  }

  event.respondWith(caches.match(request).then((cached) => {
    if (cached) return cached;
    return fetch(request).then(async (response) => {
      const path = new URL(request.url).pathname;
      if (response.ok && path.startsWith('/assets/')) {
        const cache = await caches.open(CACHE_NAME);
        await cache.put(request, response.clone());
      }
      return response;
    });
  }));
});
