const CACHE = "fo76-finder-v76.1.0";
self.addEventListener("install", e => {
  e.waitUntil(
    caches.open(CACHE).then(cache => cache.addAll([
      "/0mrcrazy0.github.io/fallout76-itemfindermap/",
      "/0mrcrazy0.github.io/fallout76-itemfindermap/index.html",
      "/0mrcrazy0.github.io/fallout76-itemfindermap/manifest.json",
      "/0mrcrazy0.github.io/fallout76-itemfindermap/icon-192-v2.png",
      "/0mrcrazy0.github.io/fallout76-itemfindermap/icon-512-v2.png"
    ]))
  );
});
self.addEventListener("fetch", e => {
  e.respondWith(
    caches.match(e.request).then(response => response || fetch(e.request))
  );
});

