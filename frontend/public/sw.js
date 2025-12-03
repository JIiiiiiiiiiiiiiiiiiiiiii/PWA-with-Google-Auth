const CACHE_NAME = 'sports-pwa-v2';
const STATIC_CACHE = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png'
];

// Install event - cache static assets
self.addEventListener('install', (e) => {
  console.log('[SW] Installing...');
  e.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[SW] Caching static assets');
        return cache.addAll(STATIC_CACHE);
      })
      .then(() => self.skipWaiting())
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (e) => {
  console.log('[SW] Activating...');
  e.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => {
            console.log('[SW] Deleting old cache:', name);
            return caches.delete(name);
          })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch event - network first, fallback to cache
self.addEventListener('fetch', (e) => {
  const { request } = e;
  const url = new URL(request.url);

  // API requests - cache first with background refresh (stale-while-revalidate)
  if (url.pathname.startsWith('/api/')) {
    // For GET requests: cache first, then refresh in background
    if (request.method === 'GET') {
      e.respondWith(
        caches.match(request).then((cached) => {
          // Start fetching fresh data in background (don't wait)
          const fetchPromise = fetch(request).then((response) => {
            // Clone the response for caching
            const responseClone = response.clone();
            if (response.ok) {
              caches.open(CACHE_NAME).then((cache) => {
                cache.put(request, responseClone);
              });
            }
            return response;
          }).catch(() => {
            // Background fetch failed - that's okay
            return null;
          });
          
          // Return cached data immediately if available
          if (cached) {
            // Don't wait for fetch, return cache immediately
            // The fresh data will update the cache for next time
            return cached;
          }
          
          // No cache - wait for network
          return fetchPromise.then((response) => {
            if (response) {
              return response;
            }
            // Network failed and no cache
            return new Response(
              JSON.stringify({ error: 'Offline', message: 'No internet connection', offline: true }),
              {
                status: 503,
                headers: { 'Content-Type': 'application/json' }
              }
            );
          });
        })
      );
      return;
    }
    // For POST/PUT/DELETE: let the app handle offline via IndexedDB
    // Don't intercept, let it fail so the app can queue it
    return;
  }

  // Static assets - cache first, network fallback
  e.respondWith(
    caches.match(request)
      .then((cached) => {
        if (cached) {
          return cached;
        }
        return fetch(request)
          .then((response) => {
            // Don't cache non-successful responses
            if (!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }
            const responseClone = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, responseClone);
            });
            return response;
          })
          .catch(() => {
            // If it's a navigation request and we're offline, return index.html
            if (request.mode === 'navigate') {
              return caches.match('/index.html');
            }
            return new Response('Offline', { status: 503 });
          });
      })
  );
});
