const CACHE_NAME = 'med44-v1';
const APP_SHELL = [
  '/',
  '/index.html',
  '/logo.jpg',
  '/bg1.jpg',
  '/bg2.jpg',
  '/manifest.json',
];

const OFFLINE_QUEUE_KEY = 'med44-offline-queue';

// Install: cache app shell
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL))
  );
  self.skipWaiting();
});

// Activate: clean old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Fetch: network-first for API, cache-first for assets
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  if (url.pathname.startsWith('/api/')) {
    // API: network-first, queue if offline
    event.respondWith(
      fetch(event.request.clone()).catch(() => {
        // Queue mutation requests
        if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(event.request.method)) {
          event.request.json().then((body) => {
            const queue = JSON.parse(localStorage.getItem(OFFLINE_QUEUE_KEY) || '[]');
            queue.push({ url: url.pathname, method: event.request.method, body });
            localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(queue));
          }).catch(() => {});
        }
        return new Response(JSON.stringify({ offline: true, error: 'You are offline' }), {
          headers: { 'Content-Type': 'application/json' },
          status: 503,
        });
      })
    );
  } else {
    // Static assets: cache-first
    event.respondWith(
      caches.match(event.request).then((cached) => {
        if (cached) return cached;
        return fetch(event.request).then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          }
          return response;
        }).catch(() => caches.match('/index.html'));
      })
    );
  }
});

// Sync: replay queued requests when online
self.addEventListener('sync', (event) => {
  if (event.tag === 'med44-sync') {
    event.waitUntil(replayQueue());
  }
});

async function replayQueue() {
  // Clients handle queue replay on reconnect
  const clients = await self.clients.matchAll();
  clients.forEach((client) => client.postMessage({ type: 'SYNC_QUEUE' }));
}
