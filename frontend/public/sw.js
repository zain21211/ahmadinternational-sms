const CACHE_NAME_PAGES = 'pages-v1';
const CACHE_NAME_ASSETS = 'assets-v1';
const CACHE_NAME_IMAGES = 'images-v1';

// Files to precache — add your build output files here manually or dynamically
const PRECACHE_URLS = [
  '/',          // index.html
  '/index.html',
  // add more static files here
];

// Install event: cache static assets
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME_ASSETS).then(cache => {
      return cache.addAll(PRECACHE_URLS);
    })
  );
  self.skipWaiting();
});

// Activate event: cleanup old caches
self.addEventListener('activate', event => {
  const cacheWhitelist = [CACHE_NAME_PAGES, CACHE_NAME_ASSETS, CACHE_NAME_IMAGES];
  event.waitUntil(
    caches.keys().then(cacheNames => 
      Promise.all(
        cacheNames.map(cacheName => {
          if (!cacheWhitelist.includes(cacheName)) {
            return caches.delete(cacheName);
          }
        })
      )
    )
  );
  self.clients.claim();
});

// Fetch event: Routing and caching strategy
self.addEventListener('fetch', event => {
  const request = event.request;

  // Only handle GET requests
  if (request.method !== 'GET') {
    return;
  }

  // Navigation requests (HTML pages) - NetworkFirst strategy
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then(response => {
          return caches.open(CACHE_NAME_PAGES).then(cache => {
            cache.put(request, response.clone());
            return response;
          });
        })
        .catch(() => caches.match(request).then(cached => cached || caches.match('/index.html')))
    );
    return;
  }

  // Static assets (CSS, JS, workers) - StaleWhileRevalidate strategy
  if (['style', 'script', 'worker'].includes(request.destination)) {
    event.respondWith(
      caches.match(request).then(cachedResponse => {
        const fetchPromise = fetch(request).then(networkResponse => {
          caches.open(CACHE_NAME_ASSETS).then(cache => {
            cache.put(request, networkResponse.clone());
          });
          return networkResponse;
        });
        return cachedResponse || fetchPromise;
      })
    );
    return;
  }

  // Images - CacheFirst strategy
  if (request.destination === 'image') {
    event.respondWith(
      caches.match(request).then(cachedResponse => {
        if (cachedResponse) {
          return cachedResponse;
        }
        return fetch(request).then(networkResponse => {
          caches.open(CACHE_NAME_IMAGES).then(cache => {
            cache.put(request, networkResponse.clone());
          });
          return networkResponse;
        });
      })
    );
    return;
  }

  // Default: just fetch normally
});
