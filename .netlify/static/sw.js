const CACHE_NAME = 'onewaygda-v1';
const STATIC_ASSETS = [
  '/',
  '/workspace',
  '/community',
  '/modules',
  '/manifest.json',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png',
  '/icons/favicon-32x32.png',
  '/icons/favicon-16x16.png',
];

// Install: cache critical static assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    })
  );
  self.skipWaiting();
});

// Activate: clean old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      );
    })
  );
  self.clients.claim();
});

// Fetch: cache-first for static assets ONLY — never intercept page navigation
// This ensures the browser back/forward button works correctly without
// the service worker serving stale or cached page content on navigation.
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip API calls, non-GET requests, and navigation requests entirely
  if (url.pathname.startsWith('/api/') || request.method !== 'GET') return;

  // Never intercept navigation requests — let the browser handle them
  // so that back/forward buttons work normally
  if (request.mode === 'navigate') return;

  // Cache-first for static assets ONLY (icons, fonts, images, stylesheets, scripts)
  if (
    url.pathname.startsWith('/icons/') ||
    url.pathname.startsWith('/images/') ||
    url.pathname.endsWith('.css') ||
    url.pathname.endsWith('.js') ||
    url.pathname.endsWith('.woff2') ||
    url.pathname.endsWith('.woff')
  ) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached;
        return fetch(request).then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          }
          return response;
        });
      })
    );
    return;
  }

  // Do not intercept any other requests (pages, etc.)
  // Let them pass through to the network normally
});
