const CACHE = "fo76-ifm-service-worker-v2.0";

self.addEventListener("install", e => {
  e.waitUntil(
    caches.open(CACHE).then(cache => cache.addAll([
      "/fallout76-itemfindermap/",
      "/fallout76-itemfindermap/index.html",
      "/fallout76-itemfindermap/manifest.json",
      "/fallout76-itemfindermap/icon-192-v2.png",
      "/fallout76-itemfindermap/icon-512-v2.png"
    ]))
  );
});
self.addEventListener("fetch", e => {
  e.respondWith(
    caches.match(e.request).then(response => response || fetch(e.request))
  );
});









