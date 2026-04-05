// TRUE COST — Service Worker
// Cache version: bump this string to force all clients to refresh
const CACHE_NAME = 'truecost-pro-v8';

const PRECACHE_URLS = [
  '/',
  '/index.html',
  '/css/theme.css',
  '/css/layout.css',
  '/css/components.css',
  '/js/data/model.js',
  '/js/data/storage.js',
  '/js/data/defaults.js',
  '/js/data/australia.js',
  '/js/calc/engine.js',
  '/js/calc/depreciation.js',
  '/js/calc/fuel.js',
  '/js/calc/battery.js',
  '/js/calc/registration.js',
  '/js/calc/insurance.js',
  '/js/ui/database.js',
  '/js/ui/feedback.js',
  '/js/ui/app.js',
  '/js/ui/router.js',
  '/data/vehicles.js',
  '/js/ui/forms.js',
  '/js/ui/vehicle-card.js',
  '/js/data/rates-manager.js',
  '/js/ui/comparison.js',
  '/js/ui/import.js',
  '/js/ui/detail.js',
  '/data/rates.json',
  '/manifest.json',
];

// Install: precache all app shell files
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting())
  );
});

// Activate: delete old caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(key => key !== CACHE_NAME)
            .map(key => caches.delete(key))
      )
    ).then(() => self.clients.claim())
  );
});

// Fetch: cache-first for app shell, network-first for API calls
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // Skip non-GET and cross-origin requests (e.g. CDN resources, APIs)
  if (event.request.method !== 'GET') return;
  if (url.origin !== self.location.origin &&
      !url.hostname.includes('api.redbook')) return;

  // Network-first for rates.json (always want fresh pricing data)
  if (url.pathname.includes('rates.json')) {
    event.respondWith(
      fetch(event.request, { cache: 'no-store' })
        .then(response => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
          }
          return response;
        })
        .catch(() => caches.match(event.request))
    );
    return;
  }

  // Network-first for API endpoints
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(event.request)
        .catch(() => caches.match(event.request))
    );
    return;
  }

  // Cache-first for app shell (with offline fallback for navigations)
  event.respondWith(
    caches.match(event.request)
      .then(cached => cached || fetch(event.request)
        .then(response => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
          }
          return response;
        })
        .catch(() => {
          // Offline fallback for navigation requests
          if (event.request.mode === 'navigate') {
            return caches.match('/index.html');
          }
          return new Response('', { status: 408, statusText: 'Offline' });
        })
      )
  );
});
