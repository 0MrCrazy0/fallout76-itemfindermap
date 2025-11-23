// service-worker.js — BULLETPROOF FINAL VERSION
const CACHE_NAME = "fo76-ifm-v4.0";   // ← new name forces immediate update

self.addEventListener("install", e => {
  // Cache literally nothing on install → zero chance of failure
  e.waitUntil(self.skipWaiting());
});

self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys.map(key => {
          if (key !== CACHE_NAME) {
            console.log("Deleting old cache:", key);
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", e => {
  const url = e.request.url;

  // Never touch these — always go straight to network
  if (url.includes('communitymap.json') ||
      url.includes('tmpfiles.org') ||
      url.includes('transfer.sh') ||
      url.includes('file.io') ||
      url.includes('githubusercontent.com')) {
    e.respondWith(fetch(e.request));
    return;
  }

  // For everything else: try cache first, then network (standard PWA behavior)
  e.respondWith(
    caches.match(e.request).then(cached => cached || fetch(e.request))
  );
});
