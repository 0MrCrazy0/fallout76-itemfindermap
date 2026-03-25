// ——— SERVICE WORKER ———
// Update this version string on EVERY deployment that changes HTML/JS/CSS
const CACHE_NAME = "fo76-ifm-v76.READY-25032026-build41";

self.addEventListener("install", (e) => {
  console.log("Service Worker installing:", CACHE_NAME);
  e.waitUntil(self.skipWaiting());   // Activate as soon as possible
});

self.addEventListener("activate", (e) => {
  console.log("Service Worker activating:", CACHE_NAME);
  e.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            console.log("Deleting old cache:", key);
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  const url = e.request.url;

  // Always bypass cache for these critical files
  if (url.includes("communitymap.json") ||
      url.includes("pending.html") ||
      url.includes("githubusercontent.com") ||
      url.includes("service-worker.js")) {
    e.respondWith(fetch(e.request));
    return;
  }

  // Normal cache-first strategy for everything else
  e.respondWith(
    caches.match(e.request).then((cached) => {
      return cached || fetch(e.request);
    })
  );
});
