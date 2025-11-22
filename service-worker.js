const CACHE = "fo76-ifm-service-worker-v3.0";   // ← NEW NAME = forces EVERY old device to update

// List ONLY files that 100% exist
const FILES_TO_CACHE = [
  "/",
  "/fallout76-itemfindermap/",
  "/fallout76-itemfindermap/index.html",
  "/fallout76-itemfindermap/manifest.json",
  "/fallout76-itemfindermap/icon-192-v2.png",
  "/fallout76-itemfindermap/icon-512-v2.png"
];

self.addEventListener("install", e => {
  e.waitUntil(
    caches.open(CACHE).then(cache => cache.addAll(FILES_TO_CACHE))
  );
  self.skipWaiting();                     // ← forces immediate activation
});

self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(
      keys.map(key => {
        if (key !== CACHE) {
          console.log('Deleting old cache:', key);
          return caches.delete(key);
        }
      })
    )).then(() => self.clients.claim())   // ← takes control immediately
  );
});

self.addEventListener("fetch", e => {
  // NEVER cache communitymap.json — always go to network
  if (e.request.url.includes('communitymap.json')) {
    e.respondWith(fetch(e.request));
    return;
  }
  e.respondWith(
    caches.match(e.request).then(response => response || fetch(e.request))
  );
});
