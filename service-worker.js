// ——— SERVICE WORKER ———
// Cache busting: Update this line on EVERY deployment that changes HTML, JS, or CSS.
// Format: "fo76-ifm-v{VERSION}-{DDMMYYYY}" or "fo76-ifm-v{VERSION}-{DDMMYYYY}-buildN"
const CACHE_NAME = "fo76-ifm-v76-C-74-1-04-2026";

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

  // Always get fresh pending.html and community data
  if (url.includes('pending.html') || 
      url.includes('communitymap.json') || 
      url.includes('githubusercontent.com')) {
    e.respondWith(fetch(e.request));
    return;
  }

  // Normal caching for everything else
  e.respondWith(
    caches.match(e.request).then(cached => cached || fetch(e.request))
  );
});
