// ——— SERVICE WORKER — v76.7.8 → v76.8.0+ — SAFE FOR ALL PLAYERS ———
const CACHE_NAME = "fo76-ifm-v76.7.9"; // ← CHANGE THIS EVERY UPDATE

// Keep old cache names so players don't lose assets during transition
const OLD_CACHES_TO_KEEP = [
  "fo76-ifm-v76.7.8",
  "fo76-ifm-v76.7.7"
  // Add previous versions here if you want — optional
];

self.addEventListener("install", e => {
  e.waitUntil(self.skipWaiting());
});

self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          // Delete any cache that is NOT the current one AND NOT in the safe list
          if (cacheName !== CACHE_NAME && !OLD_CACHES_TO_KEEP.includes(cacheName)) {
            console.log('🧹 Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      console.log('Service Worker activated — ready for offline use');
      return self.clients.claim();
    })
  );
});

self.addEventListener("fetch", e => {
  const url = e.request.url;

  // ——— ALWAYS GET FRESH COMMUNITY DATA ———
  if (url.includes('communitymap.json') || url.includes('githubusercontent.com')) {
    e.respondWith(fetch(e.request));
    return;
  }

  // ——— CACHE EVERYTHING ELSE (map images, JS, CSS, etc.) ———
  e.respondWith(
    caches.match(e.request).then(cached => {
      return cached || fetch(e.request).then(response => {
        // Cache new assets for next load
        if (response.status === 200) {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then(cache => {
            cache.put(e.request, responseClone);
          });
        }
        return response;
      });
    })
  );
});
