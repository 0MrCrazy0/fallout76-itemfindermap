// ——— SERVICE WORKER ———
// Update this version string on EVERY deployment that changes HTML/JS/CSS
const CACHE_NAME = "fo76-ifm-v76.READY-25032026-build42";

self.addEventListener("install", (event) => {
  console.log("Service Worker installing:", CACHE_NAME);
  event.waitUntil(self.skipWaiting());
});

self.addEventListener("activate", (event) => {
  console.log("Service Worker activating:", CACHE_NAME);
  event.waitUntil(
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

self.addEventListener("fetch", (event) => {
  const url = event.request.url;

  // Always fetch fresh for community data and pending list
  if (url.includes("communitymap.json") ||
      url.includes("pending.html") ||
      url.includes("githubusercontent.com")) {
    event.respondWith(fetch(event.request));
    return;
  }

  // Cache-first for everything else
  event.respondWith(
    caches.match(event.request).then((cached) => {
      return cached || fetch(event.request);
    })
  );
});
