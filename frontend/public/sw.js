/**
 * Med44 Service Worker v2
 * - Fixed: localStorage not available in SW scope → use IndexedDB (via idbKeyval-style inline)
 * - Offline queue stored in IDB, replayed on sync or reconnect message
 */

const CACHE_NAME = 'med44-v2';
const APP_SHELL = [
  '/',
  '/index.html',
  '/logo.jpg',
  '/bg1.jpg',
  '/bg2.jpg',
  '/manifest.json',
];

// ─── Minimal IDB queue helpers (no dependency, inline) ───────────────────────
const IDB_NAME = 'med44-sw-db';
const IDB_STORE = 'offline-queue';

function openIDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(IDB_NAME, 1);
    req.onupgradeneeded = (e) => {
      e.target.result.createObjectStore(IDB_STORE, { autoIncrement: true });
    };
    req.onsuccess = (e) => resolve(e.target.result);
    req.onerror = () => reject(req.error);
  });
}

async function enqueueOfflineRequest(entry) {
  const db = await openIDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(IDB_STORE, 'readwrite');
    tx.objectStore(IDB_STORE).add(entry);
    tx.oncomplete = resolve;
    tx.onerror = () => reject(tx.error);
  });
}

async function drainQueue() {
  const db = await openIDB();
  const store = db.transaction(IDB_STORE, 'readwrite').objectStore(IDB_STORE);
  const all = await new Promise((resolve) => {
    const req = store.getAll();
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => resolve([]);
  });
  if (!all.length) return;

  // Replay each queued request
  for (const entry of all) {
    try {
      await fetch(entry.url, {
        method: entry.method,
        headers: { 'Content-Type': 'application/json', ...(entry.auth ? { Authorization: entry.auth } : {}) },
        body: JSON.stringify(entry.body),
      });
    } catch {
      // Still offline — stop drain
      return;
    }
  }

  // Clear after successful replay
  const clearTx = db.transaction(IDB_STORE, 'readwrite');
  clearTx.objectStore(IDB_STORE).clear();
}

// ─── SW lifecycle ─────────────────────────────────────────────────────────────
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// ─── Fetch: network-first for /api, cache-first for assets ───────────────────
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(event.request.clone()).catch(async () => {
        if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(event.request.method)) {
          try {
            const body = await event.request.clone().json();
            const authHeader = event.request.headers.get('Authorization') || '';
            await enqueueOfflineRequest({
              url: event.request.url,
              method: event.request.method,
              body,
              auth: authHeader,
              queuedAt: Date.now(),
            });
          } catch { /* binary or unserializable body — skip queue */ }
        }
        return new Response(JSON.stringify({ offline: true, error: 'You are offline' }), {
          headers: { 'Content-Type': 'application/json' },
          status: 503,
        });
      })
    );
  } else {
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

// ─── Background sync ─────────────────────────────────────────────────────────
self.addEventListener('sync', (event) => {
  if (event.tag === 'med44-sync') {
    event.waitUntil(drainQueue());
  }
});

// ─── Message: clients can trigger drain when they detect reconnection ─────────
self.addEventListener('message', (event) => {
  if (event.data?.type === 'DRAIN_QUEUE') {
    drainQueue().then(() => {
      self.clients.matchAll().then((clients) =>
        clients.forEach((c) => c.postMessage({ type: 'QUEUE_DRAINED' }))
      );
    });
  }
});
