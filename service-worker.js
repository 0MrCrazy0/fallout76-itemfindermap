const CACHE = "fo76-finder-v76.1.0";

self.addEventListener("install", e => {
  e.waitUntil(
    caches.open(CACHE).then(cache => cache.addAll([
      "/",
      "/fallout76-itemfindermap/",
      "/fallout76-itemfindermap/index.html"
      // add more files if you want, but your PWA already caches everything
    ]))
  );
});

self.addEventListener("fetch", e => {
  e.respondWith(
    caches.match(e.request).then(response => response || fetch(e.request))
  );
});