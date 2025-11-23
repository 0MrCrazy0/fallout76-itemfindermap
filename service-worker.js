const CACHE = "fo76-ifm-v3.1";   // bump version so every device updates immediately

// ONLY cache files that 100% exist on GitHub Pages
const FILES_TO_CACHE = [
  "/",
  "/fallout76-itemfindermap/",
  "/fallout76-itemfindermap/index.html",
  "/fallout76-itemfindermap/manifest.json"
  // ← removed the two icon files that 404
];

self.addEventListener("install", e => {
  e.waitUntil(
    caches.open(CACHE).then(cache => cache.addAll(FILES_TO_CACHE))
  );
  self.skipWaiting();
});

self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(
      keys.map(key => {
        if (key !== CACHE) return caches.delete(key);
      })
    )).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", e => {
  // Never interfere with community map or shared map imports
  const url = e.request.url;
  if (url.includes('communitymap.json') || 
      url.includes('tmpfiles.org') || 
      url.includes('transfer.sh') || 
      url.includes('file.io')) {
    e.respondWith(fetch(e.request));
    return;
  }

  e.respondWith(
    caches.match(e.request).then(resp => resp || fetch(e.request))
  );
});
