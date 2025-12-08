const CACHE_NAME = "fo76-ifm-v76.7.8";   // ← BUMPED — FORCES FRESH LOAD

self.addEventListener("install", e => {
  e.waitUntil(self.skipWaiting());
});

self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys.map(key => {
          if (key !== CACHE_NAME) {
            console.log('Deleting old cache:', key);
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", e => {
  const url = e.request.url;
  // Always get fresh community data
  if (url.includes('communitymap.json') || url.includes('githubusercontent.com')) {
    e.respondWith(fetch(e.request));
    return;
  }
  // Cache everything else — but will be blown away on next update
  e.respondWith(
    caches.match(e.request).then(cached => cached || fetch(e.request))
  );
});

