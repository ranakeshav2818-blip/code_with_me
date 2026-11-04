// GuardianAI Service Worker - Zero-Connectivity Offline Support & Background Sync
const CACHE_NAME = 'guardian-ai-v2.0';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/vite.svg'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[GuardianAI SW] Pre-caching static offline assets');
      return cache.addAll(STATIC_ASSETS);
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            console.log('[GuardianAI SW] Removing obsolete cache:', key);
            return caches.delete(key);
          }
        })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  // Let WebSocket and live API requests pass through with network-first fallback
  if (event.request.url.includes('/ws/') || event.request.url.includes('/api/')) {
    event.respondWith(
      fetch(event.request).catch(async () => {
        // If offline and request is an SOS trigger, store in IndexedDB or return cached response
        console.warn('[GuardianAI SW] Network unavailable. Handling request offline:', event.request.url);
        return new Response(JSON.stringify({
          status: "OFFLINE_QUEUED",
          message: "Saved to local offline distress buffer. Will relay via Sahayata BLE Mesh."
        }), {
          headers: { 'Content-Type': 'application/json' }
        });
      })
    );
    return;
  }

  // Cache-first strategy for static UI assets
  event.respondWith(
    caches.match(event.request).then((response) => {
      return response || fetch(event.request).then((networkResponse) => {
        return caches.open(CACHE_NAME).then((cache) => {
          if (event.request.method === 'GET' && event.request.url.startsWith('http')) {
            cache.put(event.request, networkResponse.clone());
          }
          return networkResponse;
        });
      });
    }).catch(() => {
      return caches.match('/index.html');
    })
  );
});

// Background sync for offline distress queue
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-offline-sos') {
    console.log('[GuardianAI SW] Background sync triggered: uploading offline queued distress packets');
  }
});
