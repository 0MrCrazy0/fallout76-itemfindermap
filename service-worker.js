// ——— SERVICE WORKER ———
// Cache busting: Update this line on EVERY deployment that changes HTML, JS, CSS, or communitymap.json
// Format: "fo76-ifm-v{VERSION}-{DDMMYYYY}" or "fo76-ifm-v{VERSION}-{DDMMYYYY}-buildN"
const CACHE_NAME = "76-Vault-Stable-13-05-2026-Build-B-75-619";

// ── Precache the two large map images for instant loading after first visit ──
// Added cache-buster so jsDelivr + service worker always get the latest version
const MAP_IMAGES = [
    'https://cdn.jsdelivr.net/gh/0MrCrazy0/fallout76-itemfindermap@main/map-named.jpg?v=' + Date.now(),
    'https://cdn.jsdelivr.net/gh/0MrCrazy0/fallout76-itemfindermap@main/map-noname.jpg?v=' + Date.now()
];

self.addEventListener("install", e => {
    e.waitUntil(
        caches.open(CACHE_NAME).then(cache => {
            console.log('🔄 Precaching map images for instant loading...');
            return cache.addAll(MAP_IMAGES);
        }).then(() => self.skipWaiting())
    );
});

self.addEventListener("activate", e => {
    e.waitUntil(
        caches.keys().then(keys => {
            return Promise.all(
                keys.map(key => {
                    if (key !== CACHE_NAME) {
                        console.log('🗑️ Deleting old cache:', key);
                        return caches.delete(key);
                    }
                })
            );
        }).then(() => self.clients.claim())
    );
});

self.addEventListener("fetch", e => {
    const url = e.request.url;

    // Always get fresh versions of dynamic files
    if (url.includes('pending.html') ||
        url.includes('communitymap.json') ||
        url.includes('githubusercontent.com') ||
        url.includes('index.html') || 
		url.includes('service-worker.js') ||
        e.request.mode === 'navigate') {
        e.respondWith(fetch(e.request));
        return;
    }

    // ── Cache-First for the two large map images (instant after first visit) ──
    if (MAP_IMAGES.some(mapUrl => url === mapUrl)) {
        e.respondWith(
            caches.match(e.request).then(cached => {
                return cached || fetch(e.request).then(response => {
                    if (response && response.status === 200) {
                        const responseClone = response.clone();
                        caches.open(CACHE_NAME).then(cache => cache.put(e.request, responseClone));
                    }
                    return response;
                });
            })
        );
        return;
    }

    // Normal cache-first fallback for everything else
    e.respondWith(
        caches.match(e.request).then(cached => cached || fetch(e.request))
    );
});
