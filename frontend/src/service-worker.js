const CACHE_NAME = 'sports-cache-v1';
const STATIC = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icons/icon-192.png',
  '/icons/icon-512.png'
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(STATIC)));
  self.skipWaiting();
});
self.addEventListener('activate', e => {
  e.waitUntil(self.clients.claim());
});
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  if (url.origin === location.origin) {
    // static-first
    event.respondWith(caches.match(event.request).then(cached => cached || fetch(event.request)));
  } else if (url.pathname.startsWith('/api/')) {
    // network-first for API, fallback to cache
    event.respondWith(fetch(event.request).then(resp => {
      // optionally clone and cache GET responses
      return resp;
    }).catch(()=> caches.match(event.request)));
  } else {
    event.respondWith(fetch(event.request).catch(()=> caches.match(event.request)));
  }
});
