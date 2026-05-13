const CURRENT_APP_VERSION = '76.Vault.Stable';

// ── Core version identifier — change this single value to bump the entire app version ──
const CURRENT_UPDATE_VERSION = 'v' + CURRENT_APP_VERSION;
const APP_VERSION = "v" + CURRENT_APP_VERSION;

// Prevent legacy version string conflicts with the new community system
const currentVer = localStorage.getItem('fo76_map_version');
if (currentVer === CURRENT_APP_VERSION) {
    localStorage.setItem('fo76_map_version', '1.0');
}

// ── PWA update system — forces fresh service worker on every launch ──
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/fallout76-itemfindermap/service-worker.js', { updateViaCache: 'none' })
        .then(reg => {
            reg.update(); // Force immediate check for updates
            reg.addEventListener('updatefound', () => {
                const newWorker = reg.installing;
                if (newWorker) {
                    newWorker.addEventListener('statechange', () => {
                        if (newWorker.state === 'installed') {
                            showUpdateNotice();
                            newWorker.postMessage({ action: 'skipWaiting' });
                        }
                    });
                }
            });
        })
        .catch(err => console.warn('Service Worker registration failed:', err));
}

// Auto-reload when a new service worker takes control (critical for iOS PWA stability)
navigator.serviceWorker.addEventListener('controllerchange', () => window.location.reload());

// ── One-time recovery for very old installs (pre-v76) — cleans caches and forces fresh start ──
if ('serviceWorker' in navigator && !sessionStorage.getItem('recoveryDone')) {
    setTimeout(async () => {
        const storedVersion = localStorage.getItem('fo76_map_version') || '0';
        if (parseFloat(storedVersion) < 10 && storedVersion !== CURRENT_APP_VERSION) {
            const registrations = await navigator.serviceWorker.getRegistrations();
            for (const reg of registrations) await reg.unregister();
            const cacheNames = await caches.keys();
            for (const name of cacheNames) await caches.delete(name);
            localStorage.setItem('postRefreshMessage', '☢ SYSTEM SYNC COMPLETE — APP UPDATED — FOR COMMUNITY MARKERS CLICK THE UPDATE COMMUNITY MAP BUTTON! ☢');
        }
        sessionStorage.setItem('recoveryDone', 'true');
    }, 1200);
}

// ── Load latest Community Map version automatically from communitymap.json (GitHub workflow) ──
let latestCommunityVersion = "1.0";   // fallback value

async function loadLatestCommunityVersion() {
    try {
        // Use the EXACT same full URL that the Update button already uses (most reliable)
        const response = await fetch(
            'https://0mrcrazy0.github.io/fallout76-itemfindermap/communitymap.json?' + Date.now()
        );
        
        if (!response.ok) throw new Error('Network error');
        
        const data = await response.json();
        latestCommunityVersion = String(data.communityVersion || data.version || "1.0");
        
        // ── Nicer Fallout-themed console message ──
console.log(
    '%c✅ COMMUNITY MAP LOADED — v' + latestCommunityVersion,
    'color:#00ff88; font-family:monospace; font-size:13px; font-weight:bold; background:#001a00; padding:4px 12px; border-left:4px solid #00ff00;'
);
    } catch (e) {
        console.warn("Could not load latest community map version – using fallback", e);
    }
}

// ── Update banner — shows latest + user's current version when outdated ──
function showUpdateNotice() {
    if (document.getElementById('updateBanner')) return;

    const communityVer = localStorage.getItem('fo76_map_version') || "1.0";

    let communityLine = `Community Map: v${latestCommunityVersion}`;
    
    let extraLine = '';
    let ctaLine = '';

    // Only when the user is behind
    if (parseFloat(communityVer) < parseFloat(latestCommunityVersion)) {
        communityLine += ' <span style="color:#ffff00; font-weight:bold;">(Update Available!)</span>';
        extraLine = `<br><span style="color:#88ccff; font-size:13px;">Your current Community Map: v${communityVer}</span>`;
        ctaLine = `<span style="color:#88ff88; font-size:13px;">📡 Tap "Update Community Map" for latest markers</span>`;
    }

    const banner = document.createElement('div');
    banner.id = 'updateBanner';
    banner.style.cssText = `
        position: fixed; bottom: 0; left: 50%; transform: translateX(-50%);
        background: #001a00; color: #00ff88; padding: 14px 20px; text-align: center;
        font: bold 15px 'Courier New', monospace; z-index: 999999;
        box-shadow: 0 -4px 15px rgba(0, 255, 0, 0.4); border-top: 2px solid #00ff00;
        max-width: 96%; width: 96%; line-height: 1.5; text-shadow: 0 0 8px #00ff00;
        opacity: 0; transition: opacity 0.6s ease-out;
    `;
    banner.innerHTML = `
        App updated to v${CURRENT_APP_VERSION}<br>
        ${communityLine}
        ${extraLine}<br>
        ${ctaLine}
    `;

    // Small delay to avoid flash during service worker reload
    setTimeout(() => {
        document.body.appendChild(banner);
        banner.style.opacity = '1';
    }, 300);

    // Stay visible for 7 seconds then fade out cleanly
    setTimeout(() => {
        banner.style.opacity = '0';
        setTimeout(() => {
            if (banner && banner.parentNode) banner.parentNode.removeChild(banner);
        }, 1400);
    }, 8000);
}

// ── DOM Ready — main entry point for the entire application ──
document.addEventListener('DOMContentLoaded', async () => {
    const APP_VERSION_KEY = 'fo76_app_version';
    const storedAppVersion = localStorage.getItem(APP_VERSION_KEY) || '0';

    // ── Load latest Community Map version BEFORE showing the banner ──
    await loadLatestCommunityVersion();

    showUpdateNotice();
	createStartupAnimation();

    if (sessionStorage.getItem('returnFromPending') === 'true') {
        sessionStorage.removeItem('returnFromPending');
        setTimeout(() => {
            instructionsModal.style.display = 'block';
            document.body.classList.add('modal-open');
            playSound('click');
        }, 800);
    }

    // Post-refresh welcome message (used after nuclear reset or major update)
    const postRefreshMsg = localStorage.getItem('postRefreshMessage');
    if (postRefreshMsg && !sessionStorage.getItem('postRefreshShown')) {
        sessionStorage.setItem('postRefreshShown', 'true');
        setTimeout(() => {
            if (typeof showTempMessage === 'function') showTempMessage(postRefreshMsg, 5000);
            setTimeout(() => localStorage.removeItem('postRefreshMessage'), 4000);
        }, 1200);
    }

    // ── Main application IIFE — everything lives inside here for clean scoping ──
// ── STARTUP ANIMATION ──
function createStartupAnimation() {
    const splash = document.getElementById('startupSplash');
    if (!splash) return;

    const canvas = document.getElementById('startupCanvas');
    const ctx = canvas.getContext('2d');
    const title1 = document.getElementById('splashTitle1');
    const title2 = document.getElementById('splashTitle2');
    const skipPrompt = document.getElementById('skipPrompt');

    function resizeCanvas() {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    }
    window.addEventListener('resize', resizeCanvas);
    resizeCanvas();

    let doorProgress = 0;

    function drawVaultDoor() {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.08)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        const cx = canvas.width / 2;
        const cy = canvas.height / 2;
        const r = Math.min(canvas.width, canvas.height) * 1.20;

        ctx.strokeStyle = '#00ff88';
        ctx.lineWidth = 36;
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.stroke();

        ctx.lineWidth = 16;
        ctx.beginPath();
        ctx.arc(cx, cy, r * 0.78, 0, Math.PI * 2);
        ctx.stroke();

        ctx.lineWidth = 10;
        ctx.beginPath();
        ctx.arc(cx, cy, r * 0.55, 0, Math.PI * 2);
        ctx.stroke();

        const split = r * 0.82 * doorProgress;
        ctx.lineWidth = 22;
        ctx.beginPath();
        ctx.moveTo(cx - split, 0);
        ctx.lineTo(cx - split, canvas.height);
        ctx.moveTo(cx + split, 0);
        ctx.lineTo(cx + split, canvas.height);
        ctx.stroke();

        if (doorProgress < 1) doorProgress += 0.009;
    }

    let frame;
    function animate() {
        drawVaultDoor();
        frame = requestAnimationFrame(animate);
    }
    animate();

    // ── Long continuous raining celebration ──
    function startRainingConfetti() {
        const container = splash;
        const colors = ['#00ff88', '#88ff88', '#ffff88', '#00ff00', '#ffcc00'];
        const emojis = ['✨', '⭐', '🟢', '⚡', '🎈', '🎉', '🎊', '🌟', '💥', '🪅', '🏆', '🔥', '☢️', '🛡️', '💖'];
        let rainInterval = null;

        rainInterval = setInterval(() => {
            for (let i = 0; i < 5; i++) {
                const particle = document.createElement('div');
                particle.style.position = 'absolute';
                particle.style.left = Math.random() * 100 + 'vw';
                particle.style.top = '-30px';
                particle.style.fontSize = (9 + Math.random() * 19) + 'px';
                particle.style.color = colors[Math.floor(Math.random() * colors.length)];
                particle.style.opacity = '0.9';
                particle.style.pointerEvents = 'none';
                particle.style.zIndex = '5';
                particle.style.transition = `all ${2.8 + Math.random() * 3.2}s linear`;
                particle.textContent = emojis[Math.floor(Math.random() * emojis.length)];
                container.appendChild(particle);

                setTimeout(() => {
                    const xDrift = (Math.random() * 90 - 45);
                    const yDrift = window.innerHeight + 120;
                    particle.style.transform = `translate(${xDrift}px, ${yDrift}px) rotate(${Math.random() * 720}deg)`;
                    particle.style.opacity = '0';
                }, 30);

                setTimeout(() => particle.remove(), 6800);
            }
        }, 38);

        setTimeout(() => {
            if (rainInterval) clearInterval(rainInterval);
        }, 6200);
    }

    // Typewriter for titles
    async function typeText(element, text, delay = 38) {
        element.textContent = '';
        element.style.opacity = '1';
        for (let i = 0; i < text.length; i++) {
            element.textContent += text[i];
            if (typeof playSound === 'function') playSound('type');
            await new Promise(r => setTimeout(r, delay));
        }
    }

    async function startSequence() {
        await typeText(title1, 'FALLOUT 76', 42);
        await new Promise(r => setTimeout(r, 280));
        await typeText(title2, 'ITEM FINDER MAP', 36);

        skipPrompt.style.opacity = '1';
        startRainingConfetti();

        // Text fade (titles + skip prompt) while rain continues
        setTimeout(() => {
            title1.style.transition = 'opacity 800ms ease-out';
            title2.style.transition = 'opacity 800ms ease-out';
            skipPrompt.style.transition = 'opacity 800ms ease-out';
            title1.style.opacity = '0';
            title2.style.opacity = '0';
            skipPrompt.style.opacity = '0';

            // After all text is gone → clean zoom into center of open door
            setTimeout(() => {
                splash.style.transition = 'transform 1700ms cubic-bezier(0.25, 0.1, 0.25, 1)';
                splash.style.transformOrigin = 'center center';
                splash.style.transform = 'scale(3.2) translate(0, -12vh)';
                
                // ── ULTRA-SMOOTH FINAL FADE ── starts later and fades more gently
                setTimeout(() => endAnimation(), 950);
            }, 950);
        }, 2100);
    }

    function endAnimation() {
        cancelAnimationFrame(frame);

        splash.style.transition = 'opacity 1000ms cubic-bezier(0.4, 0, 0.2, 1)';
        splash.style.opacity = '0';

        setTimeout(() => {
            if (splash && splash.parentNode) splash.remove();
        }, 1050);
    }

    // Reliable tap anywhere to skip
    const skipHandler = (e) => {
        e.preventDefault();
        e.stopImmediatePropagation();
        endAnimation();
    };

    splash.addEventListener('click', skipHandler, { once: true });
    splash.addEventListener('pointerdown', skipHandler, { once: true, passive: false });
    splash.addEventListener('touchstart', skipHandler, { once: true, passive: false });

    startSequence();
}

    (function() {
        // ── Constants & Storage Keys ──
        const STORAGE_KEY = 'fo76_locations';
        const CUSTOM_CATEGORIES_KEY = '76_custom_categories';
        const MAP_VERSION_KEY = 'fo76_map_version';

        let soundsEnabled = localStorage.getItem('soundsEnabled') !== 'false';

        // ── Self-hosted audio system with volume control and unlock mechanism ──
let audioContext = null;
let audioUnlocked = false;

const baseSounds = {
    click:      new Audio("./sounds/click.ogg"),
    type:       new Audio("./sounds/type.ogg"),
    error:      new Audio("./sounds/error.ogg"),
    duplicate:  new Audio("./sounds/duplicate.ogg"),
    saving:     new Audio("./sounds/saving.ogg"),
    undo:       new Audio("./sounds/undo.ogg"),
    delete:     new Audio("./sounds/delete.ogg"),
    levelUp:    new Audio("./sounds/levelup.ogg"),
    modalClose: new Audio("./sounds/modalclose.ogg"),
    selectcategory: new Audio("./sounds/selectcategory.ogg"),
    postcard:   new Audio("./sounds/postcard.ogg"),
    dust:       new Audio("./sounds/dust.ogg")
};

const soundVolumes = {
    click: 0.45, type: 0.35, error: 0.48, duplicate: 0.40,
    saving: 0.55, undo: 0.35, delete: 0.48, levelUp: 0.65,
    modalClose: 0.32, selectcategory: 0.42, postcard: 0.58, dust: 0.45
};
Object.keys(baseSounds).forEach(key => {
    const sound = baseSounds[key];
    sound.volume = soundVolumes[key] || 0.40;
    sound.preload = 'auto';
});

function unlockAudio() {
    if (audioUnlocked) return;

    if (!audioContext) {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
    }

    // Stronger iOS resume
    if (audioContext.state === 'suspended') {
        audioContext.resume().catch(() => {});
    }

    // Force a silent oscillator to fully unlock Safari
    try {
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        gainNode.gain.value = 0.001;
        oscillator.connect(gainNode).connect(audioContext.destination);
        oscillator.start(0);
        oscillator.stop(audioContext.currentTime + 0.001);
    } catch (e) {}

    audioUnlocked = true;
}

function playSound(type) {
    // ── UNIVERSAL SOUNDS GATE (respects toggle on PC / Android / iOS) ──
    if (!soundsEnabled) return;

    if (!audioUnlocked || !baseSounds[type]) return;

    // Force resume on every play attempt (critical for stubborn iOS cases)
    if (audioContext && audioContext.state === 'suspended') {
        audioContext.resume().catch(() => {});
    }

    const sound = baseSounds[type];
    sound.currentTime = 0;
    const playPromise = sound.play();

    if (playPromise) {
        playPromise.catch(err => {
            console.warn(`Play failed for ${type}:`, err);
            // One final unlock attempt
            if (!audioUnlocked) unlockAudio();
        });
    }
}

function attachAudioUnlockListeners() {
    const events = ['touchstart', 'click', 'pointerdown', 'keydown', 'mousedown'];
    const handler = () => {
        unlockAudio();
        events.forEach(ev => {
            document.documentElement.removeEventListener(ev, handler, { passive: true });
            const mapEl = document.getElementById('map');
            if (mapEl) mapEl.removeEventListener(ev, handler, { passive: true });
        });
    };
    events.forEach(ev => {
        document.documentElement.addEventListener(ev, handler, { once: true, passive: true });
        const mapEl = document.getElementById('map');
        if (mapEl) mapEl.addEventListener(ev, handler, { once: true, passive: true });
    });
}

attachAudioUnlockListeners();

// ── Comprehensive Android Type Sound Fix v2 (ALL fields + prevents stacking) ──
baseSounds.type.playbackRate = 0.78;

let lastTypeSoundTime = 0;
const TYPE_THROTTLE_MS = 200;

function addThrottledTypeSound(input) {
    if (!input) return;
    
    // Remove any previous listener to prevent stacking/duplicates
    if (input._typeHandler) {
        input.removeEventListener('input', input._typeHandler);
    }
    
    input._typeHandler = () => {
        const now = Date.now();
        if (now - lastTypeSoundTime < TYPE_THROTTLE_MS) return;
        lastTypeSoundTime = now;
        playSound('type');
    };
    
    input.addEventListener('input', input._typeHandler);
    
    // Reset throttle on focus (essential for Android virtual keyboard)
    input.addEventListener('focus', () => {
        lastTypeSoundTime = 0;
    });
}

function attachTypeSoundsToAllFields() {
    addThrottledTypeSound(document.getElementById('playerNameInput'));
    addThrottledTypeSound(document.getElementById('itemDesc'));
    addThrottledTypeSound(document.getElementById('combinedSearch'));
    addThrottledTypeSound(document.getElementById('postcardMessage'));
    addThrottledTypeSound(document.getElementById('newCategoryName'));   // Category Name field
}

// Initial attachment + observer for dynamically created fields
attachTypeSoundsToAllFields();
const typeSoundObserver = new MutationObserver(attachTypeSoundsToAllFields);
typeSoundObserver.observe(document.body, { childList: true, subtree: true });

        // ── Utility: Fetch with built-in timeout to prevent hanging requests ──
        async function fetchWithTimeout(url, timeout = 12000) {
            const controller = new AbortController();
            const id = setTimeout(() => controller.abort(), timeout);
            try {
                const response = await fetch(url, { signal: controller.signal, cache: 'no-store' });
                clearTimeout(id);
                return response;
            } catch (err) {
                clearTimeout(id);
                throw err;
            }
        }

        function generateUniqueId() { return 'id-' + crypto.randomUUID(); }

                // ── IMPROVED CID GENERATION ──
        // Prevents collisions on very similar markers (e.g. treasure maps)
        function generateCid(loc) {
            const desc = (loc.desc || '').toString().toLowerCase()
                .replace(/[^a-z0-9\s]/g, '')
                .replace(/\s+/g, '_')
                .substring(0, 60);                    // safe length limit

            const lat = loc.lat.toFixed(5);
            const lng = loc.lng.toFixed(5);

            // Add unique suffix from the marker's own ID (makes CID 100% unique)
            let idSuffix = '';
            if (loc.id && typeof loc.id === 'string' && loc.id.length > 8) {
                idSuffix = loc.id.slice(-8);
            } else {
                idSuffix = Math.random().toString(36).substring(2, 10);
            }

            return `${loc.category}_${desc}_${lat}_${lng}_${idSuffix}`;
        }

        function hasBeenSubmitted(id) {
            const submitted = JSON.parse(localStorage.getItem('submitted_ids') || '[]');
            return submitted.includes(id);
        }

        function markAsSubmitted(id) {
            let submitted = JSON.parse(localStorage.getItem('submitted_ids') || '[]');
            if (!submitted.includes(id)) {
                submitted.push(id);
                localStorage.setItem('submitted_ids', JSON.stringify(submitted));
            }
        }

        function utf8ToBase64(str) {
            return btoa(unescape(encodeURIComponent(str)));
        }

        function base64ToUtf8(str) {
            return decodeURIComponent(escape(atob(str)));
        }

        // ── Core data store — loaded from localStorage on startup ──
        let locations = JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];

        // ── One-time data cleanup for invalid markers (v76 migration) ──
        if (!localStorage.getItem('nanCleanupDone_v76')) {
            const beforeCount = locations.length;
            locations = locations.filter(loc => {
                const latOk = typeof loc.lat === 'number' && !isNaN(loc.lat);
                const lngOk = typeof loc.lng === 'number' && !isNaN(loc.lng);
                if (!latOk || !lngOk) console.warn('Removing invalid marker during cleanup:', loc);
                return latOk && lngOk;
            });
            const removed = beforeCount - locations.length;
            if (removed > 0) {
                localStorage.setItem(STORAGE_KEY, JSON.stringify(locations));
                if (typeof showTempMessage === 'function') showTempMessage(`🧼 CLEANED UP ${removed} INVALID MARKER${removed === 1 ? '' : 'S'}`, 8000);
            }
            localStorage.setItem('nanCleanupDone_v76', 'true');
        }

        // ── Data migration & default values for legacy markers ──
        locations.forEach(loc => {
            if (!loc.id) loc.id = generateUniqueId();
            if (!loc.cid) loc.cid = generateCid(loc);
            if (loc.locked === undefined) loc.locked = false;
            if (loc.isTemp === undefined) loc.isTemp = false;
            if (loc.postcardExpire === undefined && loc.isTemp) loc.postcardExpire = Date.now() + 300000;
            if (loc.isPostcard === undefined) loc.isPostcard = loc.isTemp;
            if (loc.startTime === undefined) loc.startTime = loc.postcardExpire - 300000;
            if (loc.keepBtnBound === undefined) loc.keepBtnBound = false;
            if (loc.userEdited === undefined) loc.userEdited = true;
            if (loc.userEdited && loc.isCommunity === false && loc.wasCommunityKept === undefined) loc.wasCommunityKept = true;
            if (loc.wasCommunityKept === undefined) loc.wasCommunityKept = false;
        });

        localStorage.setItem(STORAGE_KEY, JSON.stringify(locations));

        let postcardTicker = null;
// ── GENTLE FLOATING DUST WARNING (final 30 seconds) ──
let floatingDustTimers = {};

function createGentleDustParticles(latlng) {
    const mapContainer = document.getElementById('map');
    if (!mapContainer) return;

    const point = map.latLngToContainerPoint(latlng);
    const particleCount = 4;   // thinner & smaller

    for (let i = 0; i < particleCount; i++) {
        const dust = document.createElement('div');
        dust.style.position = 'absolute';
        dust.style.left = `${point.x + (Math.random() * 16 - 8)}px`;   // tighter around marker
        dust.style.top = `${point.y + (Math.random() * 16 - 8)}px`;
        dust.style.fontSize = `${5 + Math.random() * 6}px`;           // noticeably smaller
        dust.style.opacity = '0.70';
        dust.style.pointerEvents = 'none';
        dust.style.zIndex = '999999';
        dust.style.transition = `all ${1.4 + Math.random() * 0.9}s cubic-bezier(0.4, 0, 1, 1)`;
        dust.textContent = ['💨', '🟢', '⚪', '🟡'][Math.floor(Math.random() * 4)];

        mapContainer.appendChild(dust);

        // Shorter, tighter upward drift
        setTimeout(() => {
            const angle = Math.random() * Math.PI * 2;
            const distance = 22 + Math.random() * 38;
            dust.style.transform = `translate(${Math.cos(angle) * distance}px, ${Math.sin(angle) * distance - 78}px)`;
            dust.style.opacity = '0';
        }, 40);

        // Cleanup
        setTimeout(() => dust.remove(), 2800);
    }
}

function startFloatingDust(id) {
    if (floatingDustTimers[id]) return;

    floatingDustTimers[id] = setInterval(() => {
        const marker = [...nonClusteredMarkers.getLayers(), ...clusteredMarkers.getLayers()]
            .find(m => m.options && m.options.id === id);

        if (marker) {
            createGentleDustParticles(marker.getLatLng());
        }
    }, 480);
}

function stopFloatingDust(id) {
    if (floatingDustTimers[id]) {
        clearInterval(floatingDustTimers[id]);
        delete floatingDustTimers[id];
    }
}
        function startPostcardTicker() {
            if (postcardTicker) return;
            postcardTicker = setInterval(() => {
                const now = Date.now();
                const postcards = locations.filter(l => l.isPostcard);
                if (!postcards.length) { clearInterval(postcardTicker); postcardTicker = null; return; }
                postcards.forEach(loc => {
                    const start = loc.startTime || (loc.postcardExpire ? (loc.postcardExpire - 300000) : now);
                    const timeLeft = Math.max(0, 300000 - (now - start));
                    const timerEl = document.getElementById(`postcardTimer_${loc.id}`);
                    if (timerEl) {
                        const mins = Math.floor(timeLeft / 60000);
                        const secs = Math.floor((timeLeft % 60000) / 1000).toString().padStart(2, '0');
                        timerEl.textContent = `${mins}:${secs}`;
                    }
                    if (timeLeft <= 0) {
                        if (timerEl) timerEl.textContent = '0:00';
                        setTimeout(() => dustPostcard(loc.id), 300);
                    }
                });
            }, 1000);
        }
        function stopPostcardTicker() {
            if (postcardTicker) { clearInterval(postcardTicker); postcardTicker = null; }
        }

function updatePostcardTimers() {
    document.querySelectorAll('.postcard-timer').forEach(el => {
        const id = el.getAttribute('data-id');
        const loc = locations.find(l => l.id === id);
        if (!loc || !loc.isPostcard) return;

        const start = loc.startTime || Date.now();
        const timeLeft = Math.max(0, 300000 - (Date.now() - start));

        const mins = Math.floor(timeLeft / 60000);
        const secs = Math.floor((timeLeft % 60000) / 1000).toString().padStart(2, '0');
        el.textContent = `${mins}:${secs}`;

        // ── GENTLE FLOATING DUST starts at 30 seconds remaining ──
        if (timeLeft <= 30000 && timeLeft > 0) {
            startFloatingDust(id);
        } else {
            stopFloatingDust(id);
        }

        if (timeLeft <= 0) {
            el.textContent = '0:00';
        }
    });
}

/**
 * Safe wrapper for map.invalidateSize() — eliminates the exact console error
 * during early initialization, orientation changes, fullscreen, etc.
 */
function safeInvalidateSize() {
    if (typeof map !== 'undefined' && map && typeof map.invalidateSize === 'function') {
        map.invalidateSize({ animate: false });
    }
}

// ── TEMPORARY CONTEXT MENU PIN — stays visible until modal closes ──
let tempContextPin = null;
let tempContextLatLng = null;
let tempPinRepositionHandler = null;

function showTempContextPin(latlng) {
    removeTempContextPin();
    tempContextLatLng = latlng;

    const mapContainer = document.getElementById('map');
    if (!mapContainer || !map) return;

    map.invalidateSize({ animate: false });
    repositionTempPin();

    // Re-position on any resize/rotation/move
    tempPinRepositionHandler = () => {
        if (tempContextLatLng && document.getElementById('mapContextMenu').style.display === 'block') {
            repositionTempPin();
        }
    };

    map.on('resize', tempPinRepositionHandler);
    map.on('moveend', tempPinRepositionHandler);
    window.addEventListener('resize', tempPinRepositionHandler, { passive: true });
}

function repositionTempPin() {
    if (!tempContextLatLng || !map) return;

    const point = map.latLngToContainerPoint(tempContextLatLng);

    if (!tempContextPin) {
        const mapContainer = document.getElementById('map');
        if (!mapContainer) return;

        tempContextPin = document.createElement('div');
        tempContextPin.className = 'temp-context-pin';
        tempContextPin.textContent = '📍';
        tempContextPin.style.position = 'absolute';
        tempContextPin.style.zIndex = '999999';
        tempContextPin.style.pointerEvents = 'none';
        tempContextPin.style.transition = 'none';
        mapContainer.appendChild(tempContextPin);
    }

    tempContextPin.style.left = `${point.x}px`;
    tempContextPin.style.top = `${point.y}px`;
}

function removeTempContextPin() {
    if (tempContextPin && tempContextPin.parentNode) {
        tempContextPin.parentNode.removeChild(tempContextPin);
    }
    tempContextPin = null;

    if (tempPinRepositionHandler && map) {
        map.off('resize', tempPinRepositionHandler);
        map.off('moveend', tempPinRepositionHandler);
    }
    window.removeEventListener('resize', tempPinRepositionHandler);
    tempPinRepositionHandler = null;
    tempContextLatLng = null;
}

// ── STRONG CLEAN LANDSCAPE MODAL FIX — moves ALL modals much higher up (no extra styles) ──
function fixLandscapeModalPosition() {
    const modals = document.querySelectorAll('#mapContextMenu, .modal-content');

    modals.forEach(modal => {
        if (!modal || modal.style.display !== 'block') return;

        const vh = window.visualViewport ? window.visualViewport.height : window.innerHeight;

        modal.style.position = 'fixed';
        modal.style.top = '2vh';                    // ← pushed very high up
        modal.style.bottom = 'auto';
        modal.style.left = '50%';
        modal.style.transform = 'translateX(-50%)';
        modal.style.maxHeight = `${Math.floor(vh * 0.62)}px`;   // shorter so bottom buttons are visible
        modal.style.overflowY = 'auto';             // scroll if needed
        modal.style.width = '94%';
        modal.style.maxWidth = '420px';
    });
}

// ── CELEBRATORY CREATION BURST (when new marker or postcard is created) ──
function createCreationBurst(latlng) {
    const mapContainer = document.getElementById('map');
    if (!mapContainer) return;

    const point = map.latLngToContainerPoint(latlng);
    const particleCount = 14;

    for (let i = 0; i < particleCount; i++) {
        const burst = document.createElement('div');
        burst.style.position = 'absolute';
        burst.style.left = `${point.x + (Math.random() * 26 - 13)}px`;
        burst.style.top = `${point.y + (Math.random() * 26 - 13)}px`;
        burst.style.fontSize = `${7 + Math.random() * 11}px`;
        burst.style.opacity = '0.9';
        burst.style.pointerEvents = 'none';
        burst.style.zIndex = '999999';
        burst.style.transition = `all ${1.1 + Math.random() * 1.0}s cubic-bezier(0.25, 0.1, 0.25, 1)`;
        burst.textContent = ['✨', '⭐', '🟢', '🎉', '⚡'][Math.floor(Math.random() * 5)];

        mapContainer.appendChild(burst);

        setTimeout(() => {
            const angle = Math.random() * Math.PI * 2;
            const distance = 45 + Math.random() * 65;
            burst.style.transform = `translate(${Math.cos(angle) * distance}px, ${Math.sin(angle) * distance - 110}px)`;
            burst.style.opacity = '0';
        }, 30);

        setTimeout(() => burst.remove(), 2600);
    }
}

        function updateNewMarkerTimers() {
            document.querySelectorAll('.new-marker-timer').forEach(el => {
                const id = el.getAttribute('data-id');
                const loc = locations.find(l => l.id === id);
                if (!loc || !isGlowing(loc)) {
                    el.textContent = '';
                    return;
                }
                const timeLeft = Math.max(0, 120000 - (Date.now() - loc.addedTime));
                const mins = Math.floor(timeLeft / 60000);
                const secs = Math.floor((timeLeft % 60000) / 1000).toString().padStart(2, '0');
                el.innerHTML = `NEW! <span style="font-size:11px;">(${mins}:${secs})</span>`;
            });
        }

        let customCategories = JSON.parse(localStorage.getItem(CUSTOM_CATEGORIES_KEY)) || {};
        let communityVersion = "1.0";
        function getCurrentCommunityVersion() {
            return localStorage.getItem(MAP_VERSION_KEY) || "1.0";
        }
        communityVersion = getCurrentCommunityVersion();

        const defaultCategoryIcons = {
            'weapons': '🔫', 'armor': '🛡️', 'aid': '💉', 'food/drink': '🍽️', 'ammunition': '💥',
            'apparel': '👕', 'plans': '📜', 'junk': '🗑️', 'holotapes': '📀', 'misc': '📝',
            'plants': '🌿', 'eggs': '🥚', 'creatures': '🐺', 'vendors': '💰', 'exchanges': '⚖️',
            'vaults': '⚙️', 'power armor': '👨‍🚀', 'fusion core': '🔋', 'nuke drop zones': '☢️',
            'nuke silos': '🚀', 'magazines': '📚', 'bobbleheads': '🎎', 'safe locations': '🗄️',
            'terminal locations': '🖥️', 'treasure maps': '🗺️', 'resource deposits': '⛏️',
            'fishing locations': '🎣', 'workshops': '🔧', 'train stations': '🚂', 'town locations': '🏫',
            'event locations': '🎉', 'named locations': '🚩', 'regions': '📍'
        };

        // ── Category Icons & Colors Setup ──
let categoryIcons = { ...defaultCategoryIcons, ...customCategories };

const defaultCategoryColors = {
    'weapons': '#002F00', 'armor': '#002F00', 'aid': '#002F00', 'food/drink': '#002F00',
    'ammunition': '#002F00', 'apparel': '#002F00', 'plans': '#002F00', 'junk': '#002F00',
    'holotapes': '#002F00', 'misc': '#002F00', 'plants': '#002F00', 'eggs': '#002F00',
    'creatures': '#002F00', 'vendors': '#002F00', 'exchanges': '#002F00', 'vaults': '#002F00',
    'power armor': '#002F00', 'fusion core': '#002F00', 'nuke drop zones': '#002F00',
    'nuke silos': '#002F00', 'magazines': '#002F00', 'bobbleheads': '#002F00',
    'treasure maps': '#002F00', 'resource deposits': '#002F00', 'fishing locations': '#002F00',
    'workshops': '#002F00', 'train stations': '#002F00', 'town locations': '#002F00',
    'event locations': '#002F00', 'named locations': '#002F00', 'regions': '#002F00',
    'terminal locations': '#002F00', 'safe locations': '#002F00'
};

let categoryColors = { ...defaultCategoryColors };

// ── ROBUST REBUILD FOR ALL CUSTOM CATEGORIES (safe & future-proof) ──
function rebuildCategoryData() {
    categoryIcons = { ...defaultCategoryIcons, ...customCategories };
    
    // Force correct dark green background for EVERY custom category
    categoryColors = { ...defaultCategoryColors };
    Object.keys(customCategories || {}).forEach(cat => {
        categoryColors[cat] = '#002F00';
    });

}

// ── SELECTIVE STYLING ONLY FOR CUSTOM CATEGORIES (keeps them as revertible community markers) ──
function applyCustomCategoryStyling() {
    if (!customCategories || Object.keys(customCategories).length === 0) return;

    let styledCount = 0;
    locations.forEach(loc => {
        if (customCategories[loc.category]) {
            // Apply dark green background ONLY — do NOT change ownership flags
            categoryColors[loc.category] = '#002F00';
            styledCount++;
        }
    });

    if (styledCount > 0) {
    }
}

// ── AUTO-REGISTER NEW CUSTOM CATEGORIES FROM IMPORTED / KEPT MARKERS ──
// This fixes custom category markers disappearing after backup import or refresh
function registerUnknownCategories() {
    let added = 0;
    locations.forEach(loc => {
        const cat = loc.category;
        if (cat && 
            !defaultCategoryIcons[cat] &&      // not a built-in default category
            !customCategories[cat]) {          // not already registered
            
            customCategories[cat] = loc.icon || '📦';
            activeCategories.add(cat);
            added++;
        }
    });

    if (added > 0) {
        localStorage.setItem(CUSTOM_CATEGORIES_KEY, JSON.stringify(customCategories));
        localStorage.setItem('activeCategories', JSON.stringify([...activeCategories]));
    }
}

// Run it immediately on every app load
rebuildCategoryData();
applyCustomCategoryStyling();

        // ── Leaflet map initialization with optimized settings for performance ──
const map = L.map('map', {
    crs: L.CRS.Simple,
    minZoom: -3,
    maxZoom: 6,
    zoomControl: false,
    zoomAnimation: true,
    fadeAnimation: true,
    markerZoomAnimation: true,
    preferCanvas: true,
    updateWhenIdle: true,
    updateWhenZooming: false,
    inertia: false,
    keepBuffer: 2,
    renderer: L.canvas({ padding: 0.3 })
});

const imageBounds = [[0, 0], [4096, 4096]];
const mapUrls = {
    named: 'https://cdn.jsdelivr.net/gh/0MrCrazy0/fallout76-itemfindermap@main/map-named.jpg',
    noName: 'https://cdn.jsdelivr.net/gh/0MrCrazy0/fallout76-itemfindermap@main/map-noname.jpg'
};

let currentMap = localStorage.getItem('currentMap') || 'named';
let imageOverlay = L.imageOverlay(mapUrls[currentMap], imageBounds).addTo(map);

map.fitBounds(imageBounds);

L.control.zoom({ position: 'topleft' }).addTo(map);
// Clean tap-to-close (fires only on genuine tap, NOT on drag/pan)
map.on('click', function () {
    map.closePopup();
});

// Force container size calculation early for iOS (Safari + PWA)
const mapEl = document.getElementById('map');
if (mapEl) {
    mapEl.style.height = '100dvh';   // use dynamic viewport height
    setTimeout(() => { mapEl.style.height = ''; }, 80);
}

// ── Stronger iOS Render Safeguard (Safari browser + installed PWA) ──
function forceMapRender() {
    safeInvalidateSize();
    
    // Staggered calls — essential for iOS Safari + large ImageOverlay
    setTimeout(safeInvalidateSize, 50);
    setTimeout(safeInvalidateSize, 180);
    setTimeout(safeInvalidateSize, 420);
    setTimeout(safeInvalidateSize, 800);
    setTimeout(safeInvalidateSize, 1200);
    setTimeout(safeInvalidateSize, 1800);
}

// Initial render attempts
forceMapRender();

// Extra attempts after load, visibility change, and fullscreen events
setTimeout(forceMapRender, 300);
setTimeout(forceMapRender, 650);
setTimeout(forceMapRender, 1100);

document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
        setTimeout(forceMapRender, 120);
        setTimeout(forceMapRender, 450);   // extra for PWA resume from background
    }
});

// Trigger on fullscreen / maximized mode changes (Safari + PWA)
document.addEventListener('fullscreenchange', forceMapRender);
document.addEventListener('webkitfullscreenchange', forceMapRender);

// ── FULLSCREEN TOGGLE (🔭 button) — now uses unified manager
const fullscreenControl = L.control({ position: 'topleft' });
fullscreenControl.onAdd = function(map) {
    const container = L.DomUtil.create('div', 'leaflet-bar leaflet-control');
    const link = L.DomUtil.create('a', '', container);
    link.href = '#';
    link.title = 'Toggle fullscreen';
    link.innerHTML = '🔭';
    link.style.cssText = `display:block;width:34px;height:34px;line-height:34px;text-align:center;font-size:20px;background:#1a3c34;color:#00ff00;border:2px solid #00ff00;border-radius:6px;cursor:pointer;`;
    link.onmouseover = () => {
        link.style.background = '#00ff00';
        link.style.color = '#000';

    };
    link.onmouseout = () => {
        link.style.background = '#1a3c34';
        link.style.color = '#00ff00';

    };
    L.DomEvent.on(link, 'click', L.DomEvent.stopPropagation)
              .on(link, 'click', L.DomEvent.preventDefault)
              .on(link, 'click', () => {
        playSound('click');
        if (!isFullscreenActive()) {
            enterFullscreen();
            wasInFullscreenBeforeModal = false;
        } else {
            exitFullscreen();
        }
    });

    const updateIcon = () => {
        const isNativeFullscreen = document.fullscreenElement || document.webkitFullscreenElement;
        link.innerHTML = (isFullscreenActive() || isNativeFullscreen) ? '✖' : '🔭';
        link.title = (isFullscreenActive() || isNativeFullscreen) ? 'Exit fullscreen' : 'Toggle fullscreen';
    };

    document.addEventListener('fullscreenchange', updateIcon);
    document.addEventListener('webkitfullscreenchange', updateIcon);
    setTimeout(updateIcon, 50);
    return container;
};
fullscreenControl.addTo(map);

// ── Screenshot Button (📸) — only visible in fullscreen ──
const screenshotControl = L.control({ position: 'topleft' });
screenshotControl.onAdd = function(map) {
    const container = L.DomUtil.create('div', 'leaflet-bar leaflet-control');
    const link = L.DomUtil.create('a', '', container);
    link.href = '#';
    link.title = 'Capture fullscreen view';
    link.innerHTML = '📸';
    link.style.cssText = `display:block;width:34px;height:34px;line-height:34px;text-align:center;font-size:20px;background:#1a3c34;color:#00ff00;border:2px solid #00ff00;border-radius:6px;cursor:pointer;`;
    link.onmouseover = () => {
        link.style.background = '#00ff00';
        link.style.color = '#000';

    };
    link.onmouseout = () => {
        link.style.background = '#1a3c34';
        link.style.color = '#00ff00';

    };
    L.DomEvent.on(link, 'click', L.DomEvent.stopPropagation)
              .on(link, 'click', L.DomEvent.preventDefault)
              .on(link, 'click', captureHighResScreenshot);
    container.style.display = 'none';
    return container;
};
screenshotControl.addTo(map);

// ── FINAL iOS PWA Fix — Screenshot + X button visibility ──
const updateScreenshotVisibility = () => {
    if (typeof updateFullscreenControls !== 'function') return;
    updateFullscreenControls();
};

document.addEventListener('fullscreenchange', updateScreenshotVisibility);
document.addEventListener('webkitfullscreenchange', updateScreenshotVisibility);
setTimeout(updateScreenshotVisibility, 100);

// ── True Fullscreen Capture – FIXED for Chrome Android (exit BEFORE download prompt) ──
function captureHighResScreenshot() {
    playSound('saving');

    // ── IMMEDIATELY exit fullscreen (critical for Chrome Android) ──
    wasInFullscreenBeforeModal = false;
    if (document.fullscreenElement || document.webkitFullscreenElement) {
        if (document.exitFullscreen) document.exitFullscreen();
        else if (document.webkitExitFullscreen) document.webkitExitFullscreen();
    }
    exitFullscreen();                    // our unified exit
    updateFullscreenControls();

    const mapEl = document.getElementById('map');
    const originalHeight = mapEl.style.height;
    const originalMaxWidth = mapEl.style.maxWidth;

    mapEl.style.height = `${window.innerHeight}px`;
    mapEl.style.maxWidth = 'none';
    map.invalidateSize();

    setTimeout(() => {
        html2canvas(mapEl, {
            useCORS: true,
            scale: 2,
            logging: false,
            backgroundColor: '#000000',
			willReadFrequently: true
        }).then(canvas => {
            canvas.toBlob((blob) => {
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.download = `fo76_map_max_${new Date().toISOString().slice(0,10)}.jpg`;
                a.href = url;
                document.body.appendChild(a);
                a.click();

                // Cleanup
                setTimeout(() => {
                    document.body.removeChild(a);
                    URL.revokeObjectURL(url);
                }, 1200);

                // Restore styles
                mapEl.style.height = originalHeight;
                mapEl.style.maxWidth = originalMaxWidth || '95%';
                map.invalidateSize();

                showTempMessage('📸 FULLSCREEN MAP CAPTURE SAVED TO DOWNLOADS! ✅', 4000);

                // Final safety resync (Chrome Android sometimes needs this)
                setTimeout(() => {
                    updateFullscreenControls();
                }, 800);

            }, 'image/jpeg', 0.92);
        }).catch(err => {
            console.error('Capture failed:', err);
            showTempMessage('❌ CAPTURE FAILED — TRY AGAIN', 4000);
            playSound('error');
        });
    }, 350);   // small delay after exiting fullscreen
}

// ── FULLSCREEN RESTORE LOGIC (iOS-safe) ──
let wasInFullscreenBeforeModal = false;
// ── UNIFIED FULLSCREEN MANAGER (PC/Android native + iOS PWA CSS simulation) ──
let isIOSMaximized = false;

const isIOSDevice = () => /iPad|iPhone|iPod/.test(navigator.userAgent) ||
                       (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

const isStandalonePWA = () => (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) ||
                          (window.navigator && window.navigator.standalone === true);

const isIOSPWA = () => isIOSDevice() && isStandalonePWA();

function enterFullscreen() {
    const mapEl = document.getElementById('map');
    if (!mapEl) return;

    if (isIOSPWA()) {
        isIOSMaximized = true;
		document.body.classList.add('immersive-mode');
        mapEl.style.position = 'fixed';
        mapEl.style.top = '0';
        mapEl.style.left = '0';
        mapEl.style.width = '100vw';
        mapEl.style.height = '100dvh';
        mapEl.style.paddingTop = 'env(safe-area-inset-top)';
        mapEl.style.paddingBottom = 'env(safe-area-inset-bottom)';
        mapEl.style.zIndex = '999999';
        mapEl.style.border = 'none';
        mapEl.style.touchAction = 'pan-x pan-y pinch-zoom';
        mapEl.style.userSelect = 'none';
        mapEl.style.webkitTouchCallout = 'none';
        mapEl.style.overscrollBehavior = 'none';

        document.documentElement.style.overscrollBehavior = 'none';
        document.body.style.overflow = 'hidden';
        document.body.style.position = 'fixed';
        document.body.style.width = '100%';
        document.body.style.height = '100%';

        // Stronger force for installed PWA
        setTimeout(() => {
            map.invalidateSize({ animate: false });
            forceMapRender();
        }, 80);
		        // Stronger refresh for installed iOS PWA
        setTimeout(() => { map.invalidateSize({ animate: false }); forceMapRender(); }, 40);
        setTimeout(() => { map.invalidateSize({ animate: false }); forceMapRender(); }, 120);
        setTimeout(() => { map.invalidateSize({ animate: false }); forceMapRender(); }, 280);
        setTimeout(() => { map.invalidateSize({ animate: false }); forceMapRender(); }, 450);
    } else {
        if (mapEl.requestFullscreen) mapEl.requestFullscreen();
        else if (mapEl.webkitRequestFullscreen) mapEl.webkitRequestFullscreen();
    }

    map.invalidateSize({ animate: false });
    updateFullscreenControls();
}

function exitFullscreen() {
    const mapEl = document.getElementById('map');
    if (!mapEl) return;

    if (isIOSPWA() && isIOSMaximized) {
        isIOSMaximized = false;
		document.body.classList.remove('immersive-mode');
        mapEl.style.position = '';
        mapEl.style.top = '';
        mapEl.style.left = '';
        mapEl.style.width = '';
        mapEl.style.height = '';
        mapEl.style.paddingTop = '';
        mapEl.style.paddingBottom = '';
        mapEl.style.zIndex = '';
        mapEl.style.border = '';
        mapEl.style.touchAction = '';
        mapEl.style.userSelect = '';
        mapEl.style.webkitTouchCallout = '';
        mapEl.style.overscrollBehavior = '';

        document.documentElement.style.overscrollBehavior = '';
        document.body.style.overflow = '';
        document.body.style.position = '';
        document.body.style.width = '';
        document.body.style.height = '';
    } else if (document.fullscreenElement || document.webkitFullscreenElement) {
        if (document.exitFullscreen) document.exitFullscreen();
        else if (document.webkitExitFullscreen) document.webkitExitFullscreen();
    }

    map.invalidateSize({ animate: false });
    updateFullscreenControls();
}

function isFullscreenActive() {
    if (isIOSPWA()) return isIOSMaximized;
    return !!(document.fullscreenElement || document.webkitFullscreenElement);
}

// ── TARGETED iOS PWA FIX: Unified button updater ──
function updateFullscreenControls() {
    const isMax = isFullscreenActive();

    // Update main toggle button (X vs 🔭)
    const fsContainer = fullscreenControl.getContainer();
    if (fsContainer) {
        const link = fsContainer.querySelector('a');
        if (link) {
            link.innerHTML = isMax ? '✖' : '🔭';
            link.title = isMax ? 'Exit fullscreen' : 'Toggle fullscreen';
        }
    }

    const ssContainer = screenshotControl.getContainer();
    if (ssContainer) {
        const shouldShow = isMax && !isIOSPWA();
        ssContainer.style.display = shouldShow ? 'block' : 'none';
    }

    // Force layout refresh on iOS PWA
    if (isIOSPWA() && typeof map !== 'undefined' && map) {
        setTimeout(() => map.invalidateSize({ animate: false }), 80);
    }
}
let restoreFullscreenBtn = null;
let exitedForContextMenu = false;

function exitFullscreenIfActive() {
    if (isFullscreenActive()) {
        wasInFullscreenBeforeModal = true;
        exitFullscreen();
    }
}

function autoExitFullscreenForModal() {
    if (document.fullscreenElement || document.webkitFullscreenElement) {
        exitFullscreenIfActive();
    }
}

function showRestoreFullscreenButton() {
    if (restoreFullscreenBtn) return;
    restoreFullscreenBtn = document.createElement('div');
    restoreFullscreenBtn.style.cssText = `
        position:fixed; top:100px; left:50%; transform:translateX(-50%);
        background:#001a00; color:#00ff00; padding:12px 28px;
        border:2px solid #00ff00; border-radius:6px;
        font-family:'Courier New',monospace; font-size:15px; font-weight:bold;
        box-shadow:0 0 20px #00ff00; cursor:pointer; z-index:999999;
        white-space:nowrap; max-width:92vw; box-sizing:border-box;
        opacity:0; transition:opacity 0.6s;
    `;
    restoreFullscreenBtn.innerHTML = `🔭 Return to Fullscreen`;
    document.body.appendChild(restoreFullscreenBtn);

    setTimeout(() => { restoreFullscreenBtn.style.opacity = '1'; }, 10);

    const autoHide = setTimeout(() => {
        if (restoreFullscreenBtn) {
            restoreFullscreenBtn.style.opacity = '0';
            setTimeout(() => {
                if (restoreFullscreenBtn && restoreFullscreenBtn.parentNode) {
                    restoreFullscreenBtn.parentNode.removeChild(restoreFullscreenBtn);
                    restoreFullscreenBtn = null;
                }
            }, 600);
        }
    }, 8000);

    restoreFullscreenBtn.onclick = () => {
        clearTimeout(autoHide);
        enterFullscreen();                    // ← now uses the unified function
        restoreFullscreenBtn.style.opacity = '0';
        setTimeout(() => {
            if (restoreFullscreenBtn && restoreFullscreenBtn.parentNode) {
                restoreFullscreenBtn.parentNode.removeChild(restoreFullscreenBtn);
                restoreFullscreenBtn = null;
            }
        }, 600);
    };
}

// ── iOS Post-Capture Full Exit (forces clean exit on Safari + PWA) ──
function forceResetFullscreenLayout() {
    const mapEl = document.getElementById('map');
    if (!mapEl) return;
    document.body.classList.remove('immersive-mode');
    // ── Aggressively REMOVE all fullscreen CSS styles ──
    mapEl.style.position = '';
    mapEl.style.inset = '';
    mapEl.style.width = '';
    mapEl.style.height = '';
    mapEl.style.left = '';
    mapEl.style.top = '';
    mapEl.style.maxWidth = '';
    mapEl.style.transform = '';
    mapEl.style.zIndex = '';
    mapEl.style.paddingTop = '';
    mapEl.style.paddingBottom = '';
    mapEl.style.border = '';
    mapEl.style.touchAction = '';
    mapEl.style.userSelect = '';
    mapEl.style.webkitTouchCallout = '';
    mapEl.style.overscrollBehavior = '';

    // Also reset body/document styles that were changed for PWA fullscreen
    document.documentElement.style.overscrollBehavior = '';
    document.body.style.overflow = '';
    document.body.style.position = '';
    document.body.style.width = '';
    document.body.style.height = '';

    // Force layout recalculation
    window.dispatchEvent(new Event('resize'));
    map.invalidateSize({ animate: false });

    setTimeout(() => {
        window.dispatchEvent(new Event('resize'));
        map.invalidateSize({ animate: false });
    }, 80);

    setTimeout(() => {
        map.invalidateSize({ animate: false });
    }, 220);

    // ── Force exit state on ALL iOS environments ──
    isIOSMaximized = false;
    updateFullscreenControls();

    // Guarantee the "Return to Fullscreen" button appears
    wasInFullscreenBeforeModal = true;
    setTimeout(() => {
        showRestoreFullscreenButton();
    }, 150);
}
// ── FULLSCREEN-SAFE POPUP BUTTON WRAPPER (Keep / Report / Edit / Revert) ──
window.exitFullscreenThenDo = function(callback) {
    if (isFullscreenActive()) {
        wasInFullscreenBeforeModal = true;
        exitFullscreen();
        // Small delay ensures fullscreen exit completes cleanly on iOS
        setTimeout(() => {
            if (typeof callback === 'function') callback();
        }, 380);
    } else {
        if (typeof callback === 'function') callback();
    }
};

// ── MAP RENDER + INTELLIGENT LOADING BANNER ──
(function() {
    const mapContainer = document.getElementById('map');
    if (!mapContainer) return;

    // Must exactly match service-worker.js
    const CACHE_NAME = "76-Vault-Stable-13-05-2026-Build-B-75-619";

    const MAP_IMAGES = [
        'https://cdn.jsdelivr.net/gh/0MrCrazy0/fallout76-itemfindermap@main/map-named.jpg?v=' + Date.now(),
        'https://cdn.jsdelivr.net/gh/0MrCrazy0/fallout76-itemfindermap@main/map-noname.jpg?v=' + Date.now()
    ];

    // Check if both map images are already in cache
    async function areImagesCached() {
        try {
            const cache = await caches.open(CACHE_NAME);
            const results = await Promise.all(
                MAP_IMAGES.map(url => cache.match(url))
            );
            return results.every(response => response !== undefined);
        } catch (err) {
            return false;
        }
    }

    // Create banner only if needed
    let loadingBanner = document.getElementById('mapLoadingBanner');

    const createAndShowBanner = () => {
        if (!loadingBanner) {
            loadingBanner = document.createElement('div');
            loadingBanner.id = 'mapLoadingBanner';
            loadingBanner.style.cssText = `
                position: absolute; top: 12px; left: 50%; transform: translateX(-50%);
                background: rgba(0, 26, 0, 0.92); color: #00ff88; padding: 10px 24px;
                border: 2px solid #00ff00; border-radius: 6px; font: bold 15px 'Courier New', monospace;
                box-shadow: 0 0 15px #00ff00; z-index: 1000; white-space: nowrap;
                display: flex; align-items: center; gap: 12px; opacity: 0; transition: opacity 0.6s;
            `;
            loadingBanner.innerHTML = `
                <span style="font-size:18px;">📡</span>
                <span>Downloading Map Image…</span>
                <span class="spinner" style="display:inline-block;width:18px;height:18px;border:3px solid #00ff88;border-top-color:transparent;border-radius:50%;animation:spin 1s linear infinite;"></span>
            `;
            mapContainer.appendChild(loadingBanner);

            const style = document.createElement('style');
            style.textContent = `@keyframes spin { to { transform: rotate(360deg); } }`;
            document.head.appendChild(style);
        }
        loadingBanner.style.opacity = '1';
    };

    const hideBanner = () => {
        if (loadingBanner) {
            loadingBanner.style.opacity = '0';
            setTimeout(() => {
                if (loadingBanner && loadingBanner.parentNode) {
                    loadingBanner.parentNode.removeChild(loadingBanner);
                }
            }, 800);
        }
    };

    // Only show banner if images are NOT already cached
    areImagesCached().then(cached => {
        if (!cached) {
            createAndShowBanner();
        }
    });

    // Hide banner when image finishes loading
    const hideOverlay = () => { hideBanner(); };

    imageOverlay.on('load', hideOverlay);
    imageOverlay.on('error', hideOverlay);
    setTimeout(hideOverlay, 10000);

    // Keep existing iOS force-render logic (unchanged)
    const isIOS = () => /iPad|iPhone|iPod/.test(navigator.userAgent) ||
                       (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

    const forceFullRender = () => {
        map.invalidateSize({ animate: false });
        const currentZoom = map.getZoom();
        map.setZoom(currentZoom + 0.15, { animate: false });
        setTimeout(() => map.setZoom(currentZoom, { animate: false }), 40);
        setTimeout(() => map.invalidateSize({ animate: false }), 120);
        setTimeout(() => map.setZoom(currentZoom + 0.08, { animate: false }), 280);
        setTimeout(() => map.setZoom(currentZoom, { animate: false }), 360);
        setTimeout(() => map.invalidateSize({ animate: false }), 520);
        setTimeout(() => map.invalidateSize({ animate: false }), 820);
    };

    imageOverlay.on('load', () => {
        setTimeout(forceFullRender, 180);
        if (isIOS()) {
            setTimeout(forceFullRender, 650);
            setTimeout(forceFullRender, 1100);
        }
    });
})();

let isTransitioning = false;

// ── IMPROVED CLUSTERING — better than industry standard + smooth zoom-in restored ──
const clusteredMarkers = L.markerClusterGroup({
    disableClusteringAtZoom: 18,              // clusters disappear at a more usable zoom level
	maxClusterRadius: 10,                    // cleaner grouping, no false single-marker clusters
    spiderfyOnMaxZoom: true,                 // click small cluster → nicely spreads markers
    showCoverageOnHover: false,
    zoomToBoundsOnClick: false,              // ← MUST BE FALSE so custom smooth animation works
    removeOutsideVisibleBounds: false,
    animate: true,
    chunkedLoading: true,
    iconCreateFunction: function(cluster) {
        const count = cluster.getChildCount();
        return L.divIcon({
            html: `<div><span>${count}</span></div>`,
            className: 'marker-cluster',
            iconSize: L.point(42, 42)
        });
    }
});

clusteredMarkers.on('clusterclick', function (a) {
    const cluster = a.layer;
    const bounds = cluster.getBounds();

    if (isTransitioning) return;
    isTransitioning = true;

    const currentZoom = map.getZoom();
    const targetZoom = Math.min(currentZoom + 7, map.getMaxZoom());

    map.flyToBounds(bounds, {
        padding: [80, 80],
        maxZoom: targetZoom,
        duration: 1.35,
        easeLinearity: 0.28
    });

    map.once('moveend', () => {
        isTransitioning = false;
        setTimeout(() => {
            if (cluster && typeof cluster.zoomToShowLayer === 'function') {
                const childLayers = cluster.getLayers();
                if (childLayers.length > 0) {
                    cluster.zoomToShowLayer(childLayers[0]);
                }
            }
        }, 100);
    });
});
        const nonClusteredMarkers = L.layerGroup();
        map.addLayer(clusteredMarkers);
        map.addLayer(nonClusteredMarkers);
        let lastDeleted = null;
        let currentIndex = -1;
        let tempLatLng = { lat: 0, lng: 0 };
        let clusteringEnabled = localStorage.getItem('clusteringEnabled') !== 'false';
        let gridEnabled = localStorage.getItem('gridEnabled') === 'true' ? true : false;
        let activeCategories = new Set(
            localStorage.getItem('activeCategories')
                ? JSON.parse(localStorage.getItem('activeCategories'))
                : Object.keys(defaultCategoryIcons)
        );
		registerUnknownCategories();
		rebuildCategoryData();
		applyCustomCategoryStyling();
        let level = parseInt(localStorage.getItem('fo76_level')) || 1;
        let xp = parseInt(localStorage.getItem('fo76_xp')) || 0;
        const xpPerLevel = 1000;
        const xpPerMarker = 100;
        const pageSize = 100;
        let tablePage = parseInt(localStorage.getItem('tablePage')) || 1;
        let currentSearch = '';
        localStorage.removeItem('currentSearch');

        let currentCategoryFilter = localStorage.getItem('currentCategoryFilter') || '';

// ── DARK MODE IS NOW THE DEFAULT (users must toggle it OFF) ──
let darkMode = localStorage.getItem('darkMode');
if (darkMode === null) {
    // First time ever — force Dark Mode ON and save it
    darkMode = true;
    localStorage.setItem('darkMode', 'true');
} else {
    darkMode = darkMode === 'true';
}

if (darkMode) {
    document.body.classList.add('dark-mode');
}
        let gridLayer = L.layerGroup().addTo(map);
        let isDraggingAny = false;
let isDraggingAnyMarker = false;
        let titleVisible = localStorage.getItem('titleVisible') !== 'false';
        let toolsVisible = localStorage.getItem('toolsVisible') !== 'false';
        let currentPostcardLatLng = null;
        let lastMovedMarker = null;
        let lastLevel = level;
let currentPopupMarkerId = null;
let justClosedEditModal = false;
map.on('popupopen', e => {
    const marker = e.popup._source;
    if (!marker || !marker.options.id) return;
    if (marker._icon) {
        marker._icon.classList.add('popup-glow');
    }
    currentPopupMarkerId = marker.options.id;
    document.querySelectorAll('#locationsTable tbody tr').forEach(row => {
        row.classList.remove('table-row-popup-glow');
        const onclick = row.getAttribute('onclick') || '';
        if (onclick.includes(`'${marker.options.id}'`) || onclick.includes(`"${marker.options.id}"`)) {
            row.classList.add('table-row-popup-glow');
        }
    });
});
map.on('popupclose', () => {
    if (currentPopupMarkerId) {
        const marker = [...clusteredMarkers.getLayers(), ...nonClusteredMarkers.getLayers()]
            .find(m => m.options.id === currentPopupMarkerId);
        if (marker && marker._icon) {
            marker._icon.classList.remove('popup-glow');
        }
    }
    document.querySelectorAll('.table-row-popup-glow').forEach(row => {
        row.classList.remove('table-row-popup-glow');
    });
    currentPopupMarkerId = null;
	playSound('modalClose');
});

let undoTimerInterval = null;
let undoSecondsLeft = 0;

function showUndoButton() {
    const btn = document.getElementById('undoItemBtn');
    if (!btn) return;

    btn.style.display = 'inline-block';
    undoSecondsLeft = 120; // 2 minutes

    // Initial text with timer
    btn.innerHTML = `Undo Delete <span id="undoItemTimer">(${formatTime(undoSecondsLeft)})</span>`;

    if (undoTimerInterval) clearInterval(undoTimerInterval);

    undoTimerInterval = setInterval(() => {
        undoSecondsLeft--;
        const timerEl = document.getElementById('undoItemTimer');
        if (timerEl) {
            if (undoSecondsLeft > 0) {
                timerEl.textContent = `(${formatTime(undoSecondsLeft)})`;
            } else {
                timerEl.textContent = '';
                clearInterval(undoTimerInterval);
                btn.style.display = 'none';
                undoTimerInterval = null;
            }
        } else {
            // Fallback: update button text directly if span is missing
            btn.textContent = undoSecondsLeft > 0 
                ? `Undo Delete (${formatTime(undoSecondsLeft)})` 
                : 'Undo Delete';
            if (undoSecondsLeft <= 0) {
                btn.style.display = 'none';
                clearInterval(undoTimerInterval);
                undoTimerInterval = null;
            }
        }
    }, 1000);
}

// Helper to format seconds as mm:ss
function formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
}

        // ── INFO PANEL TOGGLE ──
        let infoPanelVisible = localStorage.getItem('infoPanelVisible') !== 'false';

        function syncInfoPanelToggle() {
            const btn = document.getElementById('toggleInfoPanelBtn');
            const panel = document.getElementById('infoPanel');
            if (!btn || !panel) return;
            
            panel.classList.toggle('hidden', !infoPanelVisible);
            btn.textContent = infoPanelVisible ? 'Hide Info' : 'Show Info';
        }

        // Toggle handler
        const infoToggleBtn = document.getElementById('toggleInfoPanelBtn');
        if (infoToggleBtn) {
            infoToggleBtn.addEventListener('click', () => {
                infoPanelVisible = !infoPanelVisible;
                localStorage.setItem('infoPanelVisible', infoPanelVisible);
                syncInfoPanelToggle();
                playSound('click');
            });
        }

let showOnlyMyMarkers = false;
document.getElementById('toggleMyMarkersBtn').onclick = () => {
    showOnlyMyMarkers = !showOnlyMyMarkers;
    document.getElementById('toggleMyMarkersBtn').textContent =
        showOnlyMyMarkers ? 'My Markers: ON' : 'My Markers: All';
   
    loadData(combinedSearch.value, categoryFilter.value);
    playSound('click');
};
        const itemModal = document.getElementById('itemModal');
        const deleteBtn = document.getElementById('deleteItemBtn');
        const undoBtn = document.getElementById('undoItemBtn');
        const duplicateBtn = document.getElementById('duplicateItemBtn');
        const shareItemBtn = document.getElementById('shareItemBtn');
        const exportOneBtn = document.getElementById('exportOneBtn');
        const modalTitle = document.getElementById('modalTitle');
        const itemCategorySelect = document.getElementById('itemCategory');
        const itemDescInput = document.getElementById('itemDesc');
        const toggleSoundsBtn = document.getElementById('toggleSoundsBtn');
        const toggleClusterBtn = document.getElementById('toggleClusterBtn');
        const toggleMapBtn = document.getElementById('toggleMapBtn');
        const toggleGridBtn = document.getElementById('toggleGridBtn');
        const combinedSearch = document.getElementById('combinedSearch');
        const categoryFilter = document.getElementById('categoryFilter');
        const toggleCategoryModalBtn = document.getElementById('toggleCategoryModalBtn');
        const levelSpan = document.getElementById('levelSpan');
        const xpProgress = document.getElementById('xpProgress');
        const xpText = document.getElementById('xpText');
        const prevPageBtn = document.getElementById('prevPageBtn');
        const nextPageBtn = document.getElementById('nextPageBtn');
        const pageInfo = document.getElementById('pageInfo');
        const counter = document.getElementById('counter');
        const exportBtn = document.getElementById('exportJsonBtn');
        const importBtn = document.getElementById('importBtn');
        const downloadCommunityBtn = document.getElementById('downloadCommunityBtn');

// ── Revert All Outdated button (now perfectly responsive like other buttons) ──
let revertAllBtn = null;

function updateRevertAllButton() {
    const outdatedCount = locations.filter(l => l.wasCommunityKept && l.communityUpdateAvailable).length;

    if (outdatedCount > 0) {
        if (!revertAllBtn) {
            revertAllBtn = document.createElement('button');
            revertAllBtn.id = 'revertAllOutdatedBtn';
            revertAllBtn.style.cssText = `
                background:#0066ff;
                color:#00ff00;
                border:2px solid #00ff00;
                font-weight:bold;
                font-size:13px;
                border-radius:4px;
                cursor:pointer;
                margin-left:8px;
                box-sizing:border-box;
                text-align:center;
                line-height:1.3;
                padding:8px 12px;
                white-space:normal;
            `;
            revertAllBtn.innerHTML = `↩ Revert All Outdated <span style="font-size:12px;">(0)</span>`;

            // Insert right after the Update Community Map button
            if (downloadCommunityBtn && downloadCommunityBtn.parentNode) {
                downloadCommunityBtn.parentNode.insertBefore(revertAllBtn, downloadCommunityBtn.nextSibling);
            }

            revertAllBtn.onclick = window.revertAllOutdatedMarkers;
        }
        revertAllBtn.querySelector('span').textContent = `(${outdatedCount})`;
        revertAllBtn.style.display = 'inline-block';
    } else if (revertAllBtn) {
        revertAllBtn.style.display = 'none';
    }
}

// Safe integration — update button after any data change
function safeUpdateRevertAll() {
    setTimeout(updateRevertAllButton, 150);
}

// Hook into existing functions safely
if (typeof forceReload === 'function') {
    const oldForceReload = forceReload;
    forceReload = function() {
        oldForceReload.call(this);
        safeUpdateRevertAll();
    };
}
if (typeof saveLocations === 'function') {
    const oldSaveLocations = saveLocations;
    saveLocations = function() {
        oldSaveLocations.call(this);
        safeUpdateRevertAll();
    };
}

// Initial check
setTimeout(updateRevertAllButton, 1500);

        const saveJpegBtn = document.getElementById('saveMapJpegBtn');
        const resetAppBtn = document.getElementById('resetAppBtn');
        const toggleDarkModeBtn = document.getElementById('toggleDarkModeBtn');
        const voiceSearchBtn = document.getElementById('voiceSearchBtn');
        const lockAllBtn = document.getElementById('lockAllBtn');
        const mainTitle = document.getElementById('mainTitle');
        const titleToggleBtn = document.getElementById('toggleTitleBtn');
        const toolsToggleBtn = document.getElementById('toggleButtonGroup');
        const buttonGroup = document.getElementById('buttonGroup');
        const searchRow = document.createElement('div');
        searchRow.style.cssText = `
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 12px;
            margin: 12px 0;
            flex-wrap: wrap;
            width: 100%;
        `;
        const clearBtn = document.createElement('span');
        clearBtn.textContent = '×';
        clearBtn.style.cssText = 'cursor:pointer;font-size:26px;color:#0f0;display:none;user-select:none;margin-left:-38px;z-index:2;';
        combinedSearch.parentNode.insertBefore(searchRow, combinedSearch);
        searchRow.appendChild(combinedSearch);
        searchRow.appendChild(clearBtn);
        searchRow.appendChild(categoryFilter);
        searchRow.appendChild(toggleCategoryModalBtn);
        combinedSearch.style.cssText += 'width:260px;height:42px;font-size:16px;padding-right:40px;box-sizing:border-box;';
        categoryFilter.style.cssText += 'height:42px;font-size:16px;min-width:160px;';
        toggleCategoryModalBtn.style.cssText += 'height:42px;min-width:150px;padding:0 8px;font 14px;white-space:nowrap;';

        // ── CLEAR BUTTON (×) — clears only the search text, keeps selected category
        clearBtn.onclick = () => {
            combinedSearch.value = '';
            clearBtn.style.display = 'none';
            combinedSearch.focus();
            refreshTable(combinedSearch.value, categoryFilter.value || currentCategoryFilter);
            loadData(combinedSearch.value, categoryFilter.value || currentCategoryFilter);
            playSound('modalClose');
        };

        combinedSearch.addEventListener('input', () => {
        const val = combinedSearch.value.trim();
if (showOnlyMyMarkers === true) {
        showOnlyMyMarkers = false;
        document.getElementById('toggleMyMarkersBtn').textContent = 'My Markers: All';
    }
    clearBtn.style.display = val ? 'block' : 'none';

    // === GRID SEARCH ===
    const gridMatch = val.toUpperCase().match(/^([A-J])\s*([1-9]|10)$/);
    if (gridMatch) {
        const gridStr = `${gridMatch[1]}${gridMatch[2]}`;
        const center = gridToCenter(gridStr);
        if (center) {
            safeFlyTo(center.lat, center.lng, 4);
            showGridNotification(gridStr);
            const inGrid = locations.filter(l => getGridFromLatLng(l.lat, l.lng) === gridStr);
            if (inGrid.length) {
                setTimeout(() => {
                    const m = [...clusteredMarkers.getLayers(), ...nonClusteredMarkers.getLayers()].find(m => inGrid.some(ig => ig.id === m.options.id));
                    if (m) m.openPopup();
                }, 800);
            }
        }
    }
    // === TEXT SEARCH + SUGGESTIONS DROPDOWN (loose/predictive — matches draw window) ===
    const q = val.toLowerCase();
    suggestionsBox.innerHTML = '';
   
    if (q.length === 0) {
        suggestionsBox.style.display = 'none';
    } else {
        const matches = [];
        locations.forEach(loc => {
            const grid = (typeof getGridFromLatLng === 'function') ? (getGridFromLatLng(loc.lat, loc.lng) || '') : '';
            const text = normalizeString(loc.desc + ' ' + (loc.category || '') + ' ' + grid);
            const queryNorm = normalizeString(q);
            const terms = queryNorm.split(' ').filter(t => t.length > 0);
            
            const isMatch = terms.every(term => text.includes(term));
            
            if (isMatch) {
                const displayText = loc.desc.length > 50 ? loc.desc.substring(0,47) + '...' : loc.desc;
                matches.push({
                    display: displayText,
                    desc: loc.desc,
                    lat: loc.lat,
                    lng: loc.lng,
                    id: loc.id
                });
            }
        });
        const seen = new Set();
        const unique = matches.filter(item => {
            const key = item.desc + item.lat + item.lng;
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
        }).slice(0, 12);
        if (unique.length > 0) {
            unique.forEach(item => {
                const div = document.createElement('div');
                div.textContent = item.display;
                div.style.padding = '12px';
                div.style.cursor = 'pointer';
                div.style.borderBottom = '1px solid #00ff33';
                div.onclick = () => {
                    combinedSearch.value = '';
clearBtn.style.display = 'none';
                    suggestionsBox.style.display = 'none';
                    loadData('', categoryFilter.value);
                    safeFlyTo(item.lat, item.lng, 4);
                    map.once('moveend', () => {
                        setTimeout(() => {
                            const m = [...clusteredMarkers.getLayers(), ...nonClusteredMarkers.getLayers()]
                                .find(m => m.options.id === item.id);
                            if (m) {
                                m.openPopup();
                                playSound('click');
                            }
                        }, 200);
                    });
                    playSound('click');
                };
                suggestionsBox.appendChild(div);
            });
            suggestionsBox.style.display = 'block';
playSound('selectcategory');
        } else {
            suggestionsBox.style.display = 'none';
        }
    }
    // === ITEM LOCATED MESSAGE ===
    const terms = q.split(/\s+/).filter(t => t.length > 1);
    const found = terms.length > 0 && locations.some(l => {
        const text = (l.desc + ' ' + l.category).toLowerCase();
        return terms.every(term => text.includes(term));
    });
    if (found && val) {
        showTempMessage('🔎 ITEM LOCATED — CHECK DROP-DOWN SUGGESTIONS', 3000);
        combinedSearch.style.boxShadow = '0 0 8px #0f0';
        setTimeout(() => combinedSearch.style.boxShadow = '', 1500);
    }
    refreshTable(val, categoryFilter.value || currentCategoryFilter);
    loadData(combinedSearch.value, categoryFilter.value);

    // ── LOCAL THROTTLE — fixes double sound on PC & Android for search bar only ──
    const now = Date.now();
    if (now - lastTypeSoundTime >= 200) {
        lastTypeSoundTime = now;
        playSound('type');
    }
});
                // ── FIXED: Category Filter Change Handler (now correctly handles "All Categories") ──
        categoryFilter.addEventListener('change', function() {
            currentCategoryFilter = this.value || '';   // '' = All Categories
            localStorage.setItem('currentCategoryFilter', currentCategoryFilter);
            
            refreshTable(combinedSearch.value || '', currentCategoryFilter);
            loadData(combinedSearch.value || '', currentCategoryFilter);
            playSound('selectcategory');
        });
        function updateLockAllBtn() {
            const hasUnlocked = locations.some(l => !l.locked && !l.isPostcard);
            if (lockAllBtn) {
                lockAllBtn.style.display = hasUnlocked ? 'inline-block' : 'none';
                lockAllBtn.textContent = hasUnlocked ? 'LOCK ALL' : 'UNLOCK ALL';
            }
        }
        if (lockAllBtn) {
            lockAllBtn.onclick = () => {
                const hasUnlocked = locations.some(l => !l.locked && !l.isPostcard);
                locations.forEach(l => { if (!l.isPostcard) l.locked = hasUnlocked; });
                saveLocations();
                forceReload();
                showTempMessage(hasUnlocked ? 'ALL MARKERS LOCKED! 🔒' : 'ALL MARKERS UNLOCKED! 🔓', 4000);
                playSound('click');
            };
        }
        mainTitle.style.display = titleVisible ? 'block' : 'none';
        titleToggleBtn.textContent = titleVisible ? '-' : '+';
        titleToggleBtn.onclick = () => {
            titleVisible = !titleVisible;
            mainTitle.style.display = titleVisible ? 'block' : 'none';
            titleToggleBtn.textContent = titleVisible ? '-' : '+';
            localStorage.setItem('titleVisible', titleVisible);
            playSound('click');
        };
        buttonGroup.classList.toggle('hidden', !toolsVisible);
        toolsToggleBtn.textContent = toolsVisible ? 'Hide Tools' : 'Show Tools';
        toolsToggleBtn.onclick = () => {
            toolsVisible = !toolsVisible;
            buttonGroup.classList.toggle('hidden', !toolsVisible);
            toolsToggleBtn.textContent = toolsVisible ? 'Hide Tools' : 'Show Tools';
            localStorage.setItem('toolsVisible', toolsVisible);
            playSound('click');
        };
        shareItemBtn.textContent = 'Share Map View';
        shareItemBtn.onclick = () => {
    const loc = locations[currentIndex];
    if (!loc) return;
    const lat = Math.round(loc.lat);
    const lng = Math.round(loc.lng);

    const url = window.location.href.split('?')[0].split('#')[0] + 
                `?lat=${lat}&lng=${lng}`;

    navigator.clipboard.writeText(url).then(() => {
        showTempMessage('🔗 MAP VIEW LINK COPIED — SEND TO A FRIEND', 3000);
        playSound('click');
    });
};
        window.toggleLockFromPopup = i => {
            const loc = locations[i];
            if (loc.isPostcard) return;
            loc.locked = !loc.locked;
            loc.addedTime = Date.now();
            saveLocations();
            forceReload();
            map.closePopup();
            showTempMessage(loc.locked ? '🔐 LOCKED' : '🔓 UNLOCKED', 3000);
            playSound('click');
        };
		
		window.toggleLockFromTable = function(index) {
    const loc = locations[index];
    if (!loc || loc.isPostcard) return;

    // ── NEW PROTECTION ── Only owned markers can be unlocked
    if (!loc.userEdited && !loc.wasCommunityKept) {
        showTempMessage('❌ Only your own or KEPT markers can be unlocked', 4000);
        playSound('error');
        return;
    }

    loc.locked = !loc.locked;
    loc.addedTime = Date.now();           // resets NEW! glow timer
    saveLocations();
    forceReload();

    showTempMessage(loc.locked ? '🔐 LOCKED' : '🔓 UNLOCKED', 2000);
    playSound('click');
};

// ── DUPLICATE MARKER ──
duplicateBtn.onclick = () => {
    if (currentIndex < 0) return;
    const original = locations[currentIndex];
    if (original.locked) {
        showTempMessage('🔓 UNLOCK MARKER FIRST', 4000);
        playSound('error');
        return;
    }

    // Close Edit modal first
    closeModal(itemModal);

    // Stay in the SAME grid cell but move visibly inside it
    let newLat = original.lat;
    let newLng = original.lng;

    const grid = getGridFromLatLng(original.lat, original.lng);
    if (grid) {
        const letters = 'ABCDEFGHIJ';
        const col = letters.indexOf(grid[0]);
        const row = parseInt(grid.slice(1)) - 1;
        const cellSize = 4096 / 10;

        const centerLat = (row * cellSize) + (cellSize / 2);
        const centerLng = (col * cellSize) + (cellSize / 2);

        // Visible offset inside the same grid cell
        newLat = centerLat + (Math.random() * 260 - 130);
        newLng = centerLng + (Math.random() * 300 - 150);
    } else {
        newLat = original.lat + 0.00045 + (Math.random() * 0.00025);
        newLng = original.lng + 0.00055 + (Math.random() * 0.0003);
    }

    const newMarker = JSON.parse(JSON.stringify(original));
    newMarker.id = generateUniqueId();
    newMarker.cid = generateCid(newMarker);        // ← Guaranteed unique CID
    newMarker.lat = newLat;
    newMarker.lng = newLng;
    newMarker.addedTime = Date.now();
    newMarker.isTemp = false;
    newMarker.isPostcard = false;
    newMarker.locked = false;
    newMarker.isCommunity = false;
    newMarker.wasCommunityKept = false;
    newMarker.userEdited = true;

    locations.push(newMarker);

    // Re-lock the original marker
    original.locked = true;
    original.addedTime = Date.now();

    recalculateXP();
    saveLocations();
    forceReload();

    // Fly to new marker + open its popup
    setTimeout(() => {
        const newLeafletMarker = [...clusteredMarkers.getLayers(), ...nonClusteredMarkers.getLayers()]
            .find(m => m.options && m.options.id === newMarker.id);

        if (newLeafletMarker) {
            map.flyTo([newMarker.lat, newMarker.lng], Math.max(map.getZoom(), 4), { duration: 1.1 });
            newLeafletMarker.openPopup();
        }
    }, 850);

    showTempMessage('✅ DUPLICATE CREATED IN SAME GRID (original re-locked)', 4500);
    setTimeout(() => playSound('duplicate'), 180);
};

if (!map.getPane('gridPane')) {
    map.createPane('gridPane');
    const gridPane = map.getPane('gridPane');
    gridPane.style.zIndex = 450;
    gridPane.style.pointerEvents = 'none';
    gridPane.style.transform = 'translate3d(0,0,0)';
    gridPane.style.backfaceVisibility = 'hidden';
    gridPane.style.willChange = 'transform';
}

function drawGrid() {
    gridLayer.clearLayers();
    if (!gridEnabled) return;

    const gridSize = 10;
    const cellSize = 4096 / gridSize;
    const letters = 'ABCDEFGHIJ'.split('');

    for (let i = 0; i <= gridSize; i++) {
        const x = i * cellSize;
        L.polyline([[0, x], [4096, x]], {
            className: 'grid-line',
            color: '#0f0',
            weight: 1,
            opacity: 0.5,
            pane: 'gridPane' 
        }).addTo(gridLayer);

        const y = i * cellSize;
        L.polyline([[y, 0], [y, 4096]], {
            className: 'grid-line',
            color: '#0f0',
            weight: 1,
            opacity: 0.5,
            pane: 'gridPane'
        }).addTo(gridLayer);
    }

    for (let row = 0; row < gridSize; row++) {
        for (let col = 0; col < gridSize; col++) {
            const centerX = col * cellSize + cellSize / 2;
            const centerY = row * cellSize + cellSize / 2;
            const label = `${letters[col]}${row + 1}`;

            L.marker([centerY, centerX], {
                icon: L.divIcon({
                    className: 'grid-label',
                    html: label,
                    iconSize: [30, 30],
                    iconAnchor: [15, 15]
                }),
                zIndexOffset: 20000,   
                pane: 'gridPane',  
				interactive: false
            }).addTo(gridLayer);
        }
    }

    // Force redraw once after zoom/pan ends — eliminates any final flicker
    map.once('moveend', () => {
        gridLayer.eachLayer(layer => layer.redraw?.());
    });
}

// Keep your other grid helpers exactly as they are (they're perfect)
function getGridFromLatLng(lat, lng) {
    const gridSize = 10;
    const cellSize = 4096 / gridSize;
    const col = Math.floor(lng / cellSize);
    const row = Math.floor(lat / cellSize);
    const letters = 'ABCDEFGHIJ';
    if (col >= 0 && col < letters.length && row >= 0 && row < gridSize) {
        return `${letters[col]}${row + 1}`;
    }
    return null;
}

function gridToCenter(grid) {
    const letters = 'ABCDEFGHIJ';
    const match = grid.toUpperCase().match(/^([A-J])([1-9]|10)$/);
    if (!match) return null;
    const col = letters.indexOf(match[1]);
    const row = parseInt(match[2], 10) - 1;
    const gridSize = 10;
    const cellSize = 4096 / gridSize;
    const centerX = col * cellSize + cellSize / 2;
    const centerY = row * cellSize + cellSize / 2;
    return { lat: centerY, lng: centerX };
}

function showGridNotification(grid) {
    let notif = document.getElementById('gridNotification');
    if (!notif) {
        notif = document.createElement('div');
        notif.id = 'gridNotification';
        notif.style.position = 'fixed';
        notif.style.bottom = '20px';
        notif.style.right = '20px';
        notif.style.background = 'rgba(0,0,0,0.8)';
        notif.style.color = '#0f0';
        notif.style.padding = '10px 15px';
        notif.style.border = '1px solid #0f0';
        notif.style.borderRadius = '6px';
        notif.style.font = 'bold 16px monospace';
        notif.style.zIndex = '10000';
        notif.style.opacity = '0';
        notif.style.transition = 'opacity 0.5s';
        document.body.appendChild(notif);
    }
    notif.textContent = `Grid: ${grid}`;
    notif.style.opacity = '1';
    clearTimeout(notif.hideTimeout);
    notif.hideTimeout = setTimeout(() => { notif.style.opacity = '0'; }, 2000);
}
        function isValidEmoji(str) {
            if (!str || str.length === 0) return false;
            const emojiRegex = /^[\p{Emoji}]+$/u;
            return emojiRegex.test(str.trim());
        }
function updateDescWithGrid(desc, lat, lng) {
    const grid = getGridFromLatLng(lat, lng);
    
    // Full Fallout 76 map coordinates (0–4096 system) — rounded to 1 decimal place
    const x = Math.round(lng * 10) / 10;
    const y = Math.round(lat * 10) / 10;

    const newCoords = grid ? `Grid ${grid} (X: ${x}, Y: ${y})` : `X: ${x}, Y: ${y}`;

    const regex = /(Grid [A-J]\d+ \(X: [\d.]+, Y: [\d.]+\))|(X: [\d.]+, Y: [\d.]+)/i;
    
    if (regex.test(desc)) {
        return desc.replace(regex, newCoords);
    }
    return (desc ? desc + '\n' : '') + newCoords;
}
        function createNewLocation(lat, lng, category, desc, isTemp = false) {
            const now = Date.now();
            return {
                id: generateUniqueId(),
                lat, lng,
                category, desc,
                icon: isTemp ? '📬' : (categoryIcons[category] || '📝'),
                addedTime: isTemp ? null : now,
                userEdited: !isTemp,
				wasCommunityKept: false,
                locked: !isTemp,
                cid: generateCid({ category, desc, lat, lng }),
                isTemp: isTemp,
                isPostcard: isTemp,
                postcardExpire: isTemp ? now + 300000 : null,
                startTime: isTemp ? now : null,
                popupTimer: null,
                keepBtnBound: false
            };
        }
        const postcardModal = document.createElement('div');
postcardModal.className = 'modal';
postcardModal.id = 'postcardModal';
postcardModal.innerHTML = `
    <div class="modal-content">
        <span class="close">×</span>
        <h2>📬 Send Postcard</h2>
        
        <!-- Fixed: Proper label association for Lighthouse -->
        <label for="postcardMessage" style="display:block; margin:12px 0 6px; color:#00ff00; font-weight:bold;">
            Message: <span id="charCount">0/280</span>
        </label>
        
        <textarea
            id="postcardMessage"
            placeholder="Type your note..."
            maxlength="280"
            style="
                resize: none;
                width: 100%;
                min-height: 120px;
                max-height: 240px;
                background: #000000;
                color: #00ff88;
                border: 2px solid #00cc66;
                border-radius: 0;
                padding: 12px;
                font-family: 'Courier New', monospace;
                font-size: 14px;
                box-sizing: border-box;
                outline: none;
            "
        ></textarea>
        
        <div style="margin-top:12px; text-align:center;">
            <button id="createPostcardBtn" style="background:#00ff00 !important; color:#000000 !important; border:2px solid #00ff00; min-width:140px; padding:10px 20px; font-weight:bold;">Copy Link</button>
        </div>
    </div>
`;
document.body.appendChild(postcardModal);

// ── Extra calls to force the central throttled system to attach reliably ──
setTimeout(() => attachTypeSoundsToAllFields(), 200);
setTimeout(() => attachTypeSoundsToAllFields(), 600);
setTimeout(() => attachTypeSoundsToAllFields(), 1200);

// ── Dedicated local throttle for postcard message only (prevents double sound) ──
let lastPostcardTypeTime = 0;
const postcardMsg = document.getElementById('postcardMessage');
if (postcardMsg) {
    postcardMsg.addEventListener('input', () => {
        const now = Date.now();
        if (now - lastPostcardTypeTime >= 200) {
            lastPostcardTypeTime = now;
            playSound('type');
        }
    });
}

// ── Smart search helpers — makes search accurate and keeps dropdown in sync with map ──
function normalizeString(str) {
    return (str || '').toLowerCase()
        .replace(/[^a-z0-9\s]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

function matchesSearch(loc, query) {
    if (!query) return true;
    const q = normalizeString(query);
    if (!q) return true;

    const grid = (typeof getGridFromLatLng === 'function') ? (getGridFromLatLng(loc.lat, loc.lng) || '') : '';
    const text = normalizeString(loc.desc + ' ' + (loc.category || '') + ' ' + grid);

    const terms = q.split(' ').filter(t => t.length > 0);
    
    // ← Now uses the exact same loose matching as the suggestions dropdown
    return terms.every(term => text.includes(term));
}

// Live character counter + warning colors
const messageInput = postcardModal.querySelector('#postcardMessage');
const charCount = postcardModal.querySelector('#charCount');

if (messageInput && charCount) {
    messageInput.addEventListener('input', () => {
        const length = messageInput.value.length;
        charCount.textContent = `${length}/280`;

        if (length > 240) {
            charCount.style.color = '#ff4444';        // warning red near limit
            charCount.style.textShadow = '0 0 6px #ff4444';
        } else if (length > 200) {
            charCount.style.color = '#ffcc00';        // yellow caution
            charCount.style.textShadow = '0 0 4px #ffcc00';
        } else {
            charCount.style.color = '#00ff88';        // safe green
            charCount.style.textShadow = '0 0 4px #00ff88';
        }
    });
}

// Scrollbar for the textarea
const postcardStyle = document.createElement('style');
postcardStyle.textContent = `
    #postcardMessage::-webkit-scrollbar {
        width: 8px;
    }
    #postcardMessage::-webkit-scrollbar-track {
        background: #000;
        border-left: 1px solid #00cc66;
        border-right: 1px solid #00cc66;
        box-shadow: inset 0 0 6px rgba(0, 255, 102, 0.15);
    }
    #postcardMessage::-webkit-scrollbar-thumb {
        background: #00ff88;
        border: 2px solid #000;
        border-radius: 0;
        box-shadow: 0 0 8px rgba(0, 255, 136, 0.6);
    }
    #postcardMessage::-webkit-scrollbar-thumb:hover {
        background: #00ffcc;
        box-shadow: 0 0 12px rgba(0, 255, 204, 0.9);
    }
    /* Firefox scrollbar support */
    #postcardMessage {
        scrollbar-width: thin;
        scrollbar-color: #00ff88 #000;
    }
`;
document.head.appendChild(postcardStyle);

// ── POSTCARD CREATION ──
document.getElementById('createPostcardBtn').onclick = () => {
    const textarea = document.getElementById('postcardMessage');
    let msg = textarea ? textarea.value.trim() : 'Postcard Found!';
  
    if (msg.length > 280) msg = msg.substring(0, 280);
    if (!currentPostcardLatLng) return;

    const loc = createNewLocation(currentPostcardLatLng.lat, currentPostcardLatLng.lng, 'misc', msg, true);
    locations.push(loc);
    saveLocations();

    // ── ADD CELEBRATORY BURST FOR POSTCARD ──
    createCreationBurst(currentPostcardLatLng);

    window.justCreatedPostcardId = loc.id;
    currentIndex = -1;
    justClosedEditModal = false;
    forceReload();
    closeModal(postcardModal);
    postcardModal.style.display = 'none';

    const encodedMsg = encodeURIComponent(msg);
    const url = `${window.location.href.split('?')[0].split('#')[0]}?postcard=${loc.id}&lat=${Math.round(loc.lat)}&lng=${Math.round(loc.lng)}&msg=${encodedMsg}`;

    navigator.clipboard.writeText(url).then(() => {
        showTempMessage('📬 POSTCARD LINK COPIED — 🔗 SEND TO A FRIEND', 4000);
        setTimeout(() => playSound('postcard'), 180);
    }).catch(() => {
        showTempMessage('❌ CLIPBOARD COPY FAILED — POSTCARD CREATED', 5000);
        prompt('Copy this postcard link manually (works everywhere):', url);
        setTimeout(() => playSound('postcard'), 180);
    });

    setTimeout(() => showPostcardMarker(loc), 850);
    startPostcardTicker();
};
        const urlParams = new URLSearchParams(window.location.search);
        let pendingPostcard = null;
        if (urlParams.has('postcard')) {
            const id = urlParams.get('postcard');
            const lat = parseFloat(urlParams.get('lat'));
            const lng = parseFloat(urlParams.get('lng'));
            const msg = urlParams.has('msg')
                ? decodeURIComponent(urlParams.get('msg').replace(/\+/g, ' '))
                : 'Postcard from a friend!';
            if (!isNaN(lat) && !isNaN(lng)) {
                pendingPostcard = { id, lat, lng, msg };
            }
        }
        const originalLoadData = loadData;
        loadData = function (search = '', catFilter = '') {
            originalLoadData.call(this, search, catFilter);
            if (pendingPostcard && !pendingPostcard.processed) {
                const { id, lat, lng, msg } = pendingPostcard;
                pendingPostcard.processed = true;
                const existing = locations.find(l => l.id === id);
                let created = false;
                if (!existing || !existing.isPostcard || (existing.postcardExpire && Date.now() > existing.postcardExpire)) {
                    if (existing) {
                        const idx = locations.indexOf(existing);
                        if (idx > -1) locations.splice(idx, 1);
                    }
                    const loc = createNewLocation(lat, lng, 'misc', msg, true);
                    loc.id = id;
                    loc.startTime = Date.now();
                    loc.postcardExpire = Date.now() + 300000;
                    locations.push(loc);
                    saveLocations();
                    created = true;
                    showTempMessage('📬 POSTCARD RECEIVED FROM FRIEND', 5000);
                    playSound('postcard');
                }
                setTimeout(() => {
                    safeFlyTo(lat, lng, 1);
                    setTimeout(() => {
                        const marker = [...nonClusteredMarkers.getLayers(), ...clusteredMarkers.getLayers()]
                            .find(m => m.options.id === id);
                        if (marker || created) {
                            const displayMsg = created ? msg : 'CHECK THIS SPOT!';
                            marker?.unbindPopup();
                            marker?.bindPopup(createPopupContent({ desc: displayMsg, id: id }), { maxWidth: 320, offset: [0, -20] });
                            marker?.openPopup();
                        }
                    }, 1800);
                }, 600);
                pendingPostcard = null;
            }
        };
        if (!pendingPostcard && urlParams.has('lat') && urlParams.has('lng')) {
            const lat = parseFloat(urlParams.get('lat'));
            const lng = parseFloat(urlParams.get('lng'));
            if (!isNaN(lat) && !isNaN(lng)) {
                setTimeout(() => {
                    safeFlyTo(lat, lng, 4);
                    showTempMessage('👀 SHARED VIEW LOADED', 3000);
                    playSound('click');
                }, 1200);
            }
        }
        exportOneBtn.style.display = 'inline-block';
        exportOneBtn.textContent = 'Export Marker';
        function createPopupContent(loc) {
    const start = loc.startTime || Date.now();
    const timeLeft = Math.max(0, 300000 - (Date.now() - start));
    const mins = Math.floor(timeLeft / 60000);
    const secs = Math.floor((timeLeft % 60000) / 1000).toString().padStart(2, '0');

    // Always show "Postcard Found!" on top, then the custom message below
    let displayMsg = 'Postcard Found!';
    if (loc.desc && loc.desc !== 'Postcard Found!') {
        displayMsg += '\n\n' + loc.desc;
    }

    return `
        <div style="background:#000;color:#0f0;padding:14px;border:2px solid #0f0;border-radius:8px;font:bold 14px monospace;text-align:center;max-width:320px;word-wrap:break-word;">
            <div style="max-height:160px;overflow-y:auto;margin-bottom:10px;padding:0 4px;white-space:pre-wrap;">${escapeHtml(displayMsg)}</div>
            <div style="font-size:13px;">Expires in: <span id="postcardTimer_${loc.id}">${mins}:${secs}</span></div>
            <button id="keepPostcardBtn_${loc.id}" style="margin-top:10px;background:#00ff00;color:#000;border:none;padding:6px 14px;border-radius:4px;cursor:pointer;font-weight:bold;">Keep It</button>
        </div>
    `;
}

function showPostcardMarker(loc) {
    // Close any open popups first (strongest protection against jumping)
    map.closePopup();

    const existing = [...nonClusteredMarkers.getLayers()].find(m => m.options.id === loc.id);
    if (existing) existing.remove();

    const marker = L.marker([loc.lat, loc.lng], {
        icon: L.divIcon({
            className: 'custom-icon glowing',
            html: `<div class="marker-background" style="background-color:#002F00;"><span style="font-size:18px;">📬</span></div>`,
            iconSize: [30, 30],
            iconAnchor: [15, 15]
        })
    }).addTo(nonClusteredMarkers);

    marker.options.id = loc.id;

    const popup = L.popup({ maxWidth: 320, offset: [0, -20] });
    marker.bindPopup(popup);

    marker.on('popupopen', () => {
        popup.setContent(createPopupContent(loc));
        setTimeout(() => bindKeepButton(loc), 50);

        const timerEl = document.getElementById(`postcardTimer_${loc.id}`);
        if (timerEl) {
            const start = loc.startTime || Date.now();
            const timeLeft = Math.max(0, 300000 - (Date.now() - start));
            const mins = Math.floor(timeLeft / 60000);
            const secs = Math.floor((timeLeft % 60000) / 1000).toString().padStart(2, '0');
            timerEl.textContent = `${mins}:${secs}`;
        }
        startPostcardTicker();
    });

    // Strong priority for the newly created postcard only
    if (window.justCreatedPostcardId === loc.id) {
        setTimeout(() => {
            map.closePopup();           // extra safety
            marker.openPopup();
            window.justCreatedPostcardId = null;
        }, 650);
    } else {
        marker.openPopup();
    }
}
        function bindKeepButton(loc) {
    const keepBtn = document.getElementById(`keepPostcardBtn_${loc.id}`);
    if (!keepBtn) return;
    keepBtn.onclick = (e) => {
        e.stopPropagation();
        const index = locations.findIndex(l => l.id === loc.id);
        if (index === -1) return;
        locations[index].desc = updateDescWithGrid(loc.desc, loc.lat, loc.lng);
        locations[index].isPostcard = false;
        locations[index].isTemp = false;
        locations[index].locked = true;
        locations[index].userEdited = true;
        locations[index].postcardExpire = null;
        locations[index].addedTime = Date.now();
        locations[index].startTime = null;
        locations[index].icon = '📝';
        saveLocations();
        recalculateXP();
        forceReload();
        showTempMessage('✅ POSTCARD KEPT SUCCESSFULLY', 4000);
        setTimeout(() => {
            playSound('saving');
        }, 150);
    };
}
function dustPostcard(id) {
    const loc = locations.find(l => l.id === id);
    if (!loc) return;

    if (loc.dusting) return;
    loc.dusting = true;

    // ── IMMEDIATELY stop spinning BEFORE dust animation begins ──
    const spinningMarker = [...nonClusteredMarkers.getLayers()].find(m => m.options.id === id);
    if (spinningMarker && spinningMarker._icon) {
        spinningMarker._icon.classList.remove('postcard-spinning');
    }

    // Show message IMMEDIATELY when animation begins
    showTempMessage('💨 POSTCARD EXPIRED — TURNED TO DUST', 4000);
    playSound('dust');

    const marker = [...nonClusteredMarkers.getLayers()].find(m => m.options.id === id);
    if (marker) {
        let iconEl = marker._icon || (typeof marker.getElement === 'function' ? marker.getElement() : null);
        if (iconEl) {
            iconEl.style.transition = 'all 2.8s cubic-bezier(0.55, 0.085, 0.68, 0.53)';
            iconEl.style.willChange = 'transform, opacity';
            iconEl.style.transform = 'translateY(-110px) scale(0.05) rotate(1620deg)';
            iconEl.style.opacity = '0';
            createDustParticles(marker.getLatLng());
        }
    }

    setTimeout(() => {
        const index = locations.indexOf(loc);
        if (index !== -1) locations.splice(index, 1);

        saveLocations();

        const currentSearchVal = combinedSearch ? (combinedSearch.value || '') : '';
        const currentCat = categoryFilter ? (categoryFilter.value || currentCategoryFilter) : '';

        forceReload();
        refreshTable(currentSearchVal, currentCat);
        loadData(currentSearchVal, currentCat);

        if (!locations.some(l => l.isPostcard)) stopPostcardTicker();

        delete loc.dusting;
    }, 2900);
}

// ── Floating Dust Particles Helper ──
function createDustParticles(latlng) {
    const mapContainer = document.getElementById('map');
    if (!mapContainer) return;

    const point = map.latLngToContainerPoint(latlng);
    const particleCount = 18;

    for (let i = 0; i < particleCount; i++) {
        const dust = document.createElement('div');
        dust.style.position = 'absolute';
        dust.style.left = `${point.x + (Math.random() * 30 - 15)}px`;
        dust.style.top = `${point.y + (Math.random() * 30 - 15)}px`;
        dust.style.fontSize = `${8 + Math.random() * 12}px`;
        dust.style.opacity = '0.9';
        dust.style.pointerEvents = 'none';
        dust.style.zIndex = '999999';
        dust.style.transition = `all ${1.8 + Math.random() * 1.2}s cubic-bezier(0.4, 0, 1, 1)`;
        dust.textContent = ['💨', '🟢', '⚪', '🟡'][Math.floor(Math.random() * 4)];

        mapContainer.appendChild(dust);

        // Random upward movement + fade
        setTimeout(() => {
            const angle = Math.random() * Math.PI * 2;
            const distance = 60 + Math.random() * 90;
            dust.style.transform = `translate(${Math.cos(angle) * distance}px, ${Math.sin(angle) * distance - 120}px)`;
            dust.style.opacity = '0';
        }, 30);

        // Cleanup
        setTimeout(() => dust.remove(), 3200);
    }
}
        function isGlowing(loc) {
            if (loc.isPostcard) return true;
            return loc.addedTime && (Date.now() - loc.addedTime) < 120000;
        }
        function escapeHtml(text) {
            const div = document.createElement('div');
            div.textContent = text;
            return div.innerHTML;
        }
        function createMarkerIcon(loc) {
            const isTextOnly = ['named locations', 'regions'].includes(loc.category);
            const isUpdateAvailable = !!loc.communityUpdateAvailable;

            if (isTextOnly) {
                const iconToUse = loc.icon || categoryIcons[loc.category] || '📝';
                const words = loc.desc.split('\n')[0].trim().split(' ');
                const shortText = words.slice(0, 3).join(' ') + (words.length > 3 ? '...' : '');
                const width = Math.min(120, Math.max(60, shortText.length * 9));
                const glowClass = isGlowing(loc) ? 'glowing' : (isUpdateAvailable ? 'update-available' : '');
                const html = `<div class="${glowClass}" style="background:#000;color:#fff;padding:3px 6px;border:2px solid #0f0;border-radius:4px;font-weight:bold;font-size:11px;white-space:nowrap;width:${width}px;overflow:hidden;text-overflow:ellipsis;">${escapeHtml(shortText)}</div>`;
               
                return L.divIcon({
                    className: 'text-marker',
                    html,
                    iconSize: [width + 12, 26],
                    iconAnchor: [(width + 12)/2, 13],
                    zIndexOffset: 1000
                });
            } else {
                const base = `<div class="marker-background" style="background-color:${categoryColors[loc.category] || '#808080'};"><span style="font-size:18px;">${ loc.icon || categoryIcons[loc.category] || '📝' }</span></div>`;
                const glowClass = isGlowing(loc) ? 'glowing' : (isUpdateAvailable ? 'update-available' : '');
                return L.divIcon({
                    className: `custom-icon ${glowClass}`,
                    html: base,
                    iconSize: [30, 30],
                    iconAnchor: [15, 15]
                });
            }
        }
        const messageQueue = [];
        let activeMessageControl = null;
        function showTempMessage(html, ms = 3000) {
            messageQueue.push({ html, ms });
            if (!activeMessageControl) processMessageQueue();
        }
        function processMessageQueue() {
            if (messageQueue.length === 0 || activeMessageControl) return;
            const { html, ms } = messageQueue.shift();
            activeMessageControl = L.control({ position: 'bottomright' });
            activeMessageControl.onAdd = function() {
                const div = L.DomUtil.create('div', 'temp-message');
                div.innerHTML = html;
                div.style.background = 'rgba(0,0,0,0.85)';
                div.style.color = '#0f0';
                div.style.padding = '8px 12px';
                div.style.border = '1px solid #0f0';
                div.style.borderRadius = '6px';
                div.style.maxWidth = '300px';
                div.style.font = 'bold 13px/1.4 monospace';
                div.style.boxShadow = '0 0 10px #0f0';
                div.style.margin = '10px';
                div.style.pointerEvents = 'none';
                div.style.zIndex = '10000';
                L.DomEvent.disableClickPropagation(div);
                return div;
            };
            activeMessageControl.addTo(map);
            setTimeout(() => {
                if (activeMessageControl) {
                    map.removeControl(activeMessageControl);
                    activeMessageControl = null;
                    processMessageQueue();
                }
            }, ms);
        }
		
		// ── Community Update Glow Indicator ──
const COMMUNITY_UPDATE_URL = 'https://cdn.jsdelivr.net/gh/0MrCrazy0/fallout76-itemfindermap@main/communitymap.json';
const LAST_COMMUNITY_VERSION_KEY = 'fo76_community_last_version';

async function checkForCommunityUpdate() {
    const button = document.getElementById('downloadCommunityBtn');
    if (!button) return;

    try {
        const res = await fetch(COMMUNITY_UPDATE_URL + '?t=' + Date.now());
        if (!res.ok) return;
        const data = await res.json();
        const currentVersion = String(data.communityVersion || "1.0");

        const lastKnown = localStorage.getItem(LAST_COMMUNITY_VERSION_KEY);

        // Glow if: no previous version stored OR fetched version differs
        if (!lastKnown || lastKnown !== currentVersion) {
            button.classList.add('update-available');
            // Show tip on first load or actual update
            if (typeof showTempMessage === 'function') {
                showTempMessage('📡 New community markers available! Click "Update Community Map".', 10000);
            }
        } else {
            button.classList.remove('update-available');
        }

        // Always save the fetched version
        localStorage.setItem(LAST_COMMUNITY_VERSION_KEY, currentVersion);

    } catch (err) {
        console.warn('Community update check failed:', err);
    }
}

// Run once on load (after DOM is ready)
document.addEventListener('DOMContentLoaded', () => {
    checkForCommunityUpdate();
    // Re-check every 10 minutes
    setInterval(checkForCommunityUpdate, 600000);
	setInterval(updateMinervaGlow, 300000);
});

function showConfirmModal(title, content, onConfirm, restoreFullscreenOnClose = false) {
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.style.display = 'block';
    modal.innerHTML = `
        <div class="modal-content" style="max-width:520px;">
            <span class="close">X</span>
            <h2 style="margin-bottom:8px !important;">${title}</h2>
            <div style="margin:0 !important; padding:6px 22px 22px 22px; text-align:left !important; line-height:1.48; font-size:1.07em; word-break:break-word;">
                ${content}
            </div>
            <div style="text-align:center;">
                <button id="confirmModalBtn" style="background:#00ff00;color:#000;padding:11px 28px;border:none;border-radius:4px;cursor:pointer;font-weight:bold;">OK</button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
    document.body.classList.add('modal-open');

    const closeBtn = modal.querySelector('.close');
    const confirmBtn = modal.querySelector('#confirmModalBtn');

    const cleanup = () => {
        modal.remove();
        document.body.classList.remove('modal-open');
        playSound('modalClose');
        if (restoreFullscreenOnClose && wasInFullscreenBeforeModal) {
            wasInFullscreenBeforeModal = false;
            showRestoreFullscreenButton();
        }
    };

    closeBtn.onclick = cleanup;
    confirmBtn.onclick = () => {
        cleanup();
        if (typeof onConfirm === 'function') onConfirm();
    };
    playSound('levelUp');
}
        window.editMarkerFromPopup = function(index) {
            map.closePopup();
            openModal('Edit Item', index);
        };
        function attachDragHandler(marker, loc) {
    marker.on('add', () => {
        const icon = marker._icon;
        if (!icon) return;
        let isDragging = false;
        let originalLatLng = null;
        window.isDraggingAnyMarker = window.isDraggingAnyMarker || false;
        const onDragging = (e) => {
            if (!isDragging) return;
            let clientX, clientY;
            if (e.touches && e.touches.length > 0) {
                clientX = e.touches[0].clientX;
                clientY = e.touches[0].clientY;
            } else {
                clientX = e.clientX;
                clientY = e.clientY;
            }
            const latlng = map.mouseEventToLatLng({ clientX, clientY });
            marker.setLatLng(latlng);
        };
        const onDragEnd = () => {
            if (!isDragging) return;
            isDragging = false;
            window.isDraggingAnyMarker = false;
            map.dragging.enable();
            L.DomUtil.removeClass(icon, 'dragging');
            L.DomEvent.off(document, 'mousemove touchmove', onDragging);
            L.DomEvent.off(document, 'mouseup touchend', onDragEnd);
            const { lat, lng } = marker.getLatLng();
            loc.lat = lat;
            loc.lng = lng;
            loc.desc = updateDescWithGrid(loc.desc, lat, lng);
            loc.addedTime = Date.now();
            loc.userEdited = true;
            loc.locked = true;
            lastMovedMarker = marker;
            saveLocations();
            showTempMessage(`📍 MARKER MOVED — SAVED & RE-LOCKED ${loc.icon}`, 4000);
            setTimeout(() => {
                playSound('saving');
            }, 150);
            safeFlyTo(lat, lng);
            forceReload();
        };
        const onDragStart = (e) => {
            if (loc.locked || window.isDraggingAnyMarker) return;
            if (e.touches) L.DomEvent.preventDefault(e);
            originalLatLng = marker.getLatLng();
            isDragging = true;
            window.isDraggingAnyMarker = true;
            map.dragging.disable();
            L.DomUtil.addClass(icon, 'dragging');
            if (activeMessageControl) {
                map.removeControl(activeMessageControl);
                activeMessageControl = null;
            }
            L.DomEvent.on(document, 'mousemove', onDragging);
            L.DomEvent.on(document, 'mouseup', onDragEnd);
            L.DomEvent.on(document, 'touchmove', onDragging);
            L.DomEvent.on(document, 'touchend', onDragEnd);
        };
        if (!loc.locked && !loc.isPostcard) {
            marker.on('dragstart', onDragStart);
        }
        marker.on('click', (e) => {
            if (isDragging) return;
            icon.classList.add('marker-flash');
            setTimeout(() => icon.classList.remove('marker-flash'), 3000);
        });
        icon.addEventListener('mouseenter', () => icon.classList.add('marker-hover'));
        icon.addEventListener('mouseleave', () => icon.classList.remove('marker-hover'));
        if (loc.isPostcard) {
            marker.bindPopup(() => createPopupContent(loc), { maxWidth: 320, offset: [0, -20] });
            marker.on('popupopen', () => {
                const popup = marker.getPopup();
                if (popup) {
                    popup.setContent(createPopupContent(loc));
                    setTimeout(() => bindKeepButton(loc), 50);
                    const timerEl = document.getElementById(`postcardTimer_${loc.id}`);
                    if (timerEl) {
                        const start = loc.startTime || Date.now();
                        const timeLeft = Math.max(0, 300000 - (Date.now() - start));
                        const mins = Math.floor(timeLeft / 60000);
                        const secs = Math.floor((timeLeft % 60000) / 1000).toString().padStart(2, '0');
                        timerEl.textContent = `${mins}:${secs}`;
                    }
                    startPostcardTicker();
                }
            });
        } else {
marker.bindPopup(`
    <div style="font-family:monospace; max-width:300px; line-height:1.5; color:#00ff00;">
        <!-- Static title – minimal spacing -->
        <strong style="font-size:1.35em; display:block; margin-bottom:8px;">
            ${loc.icon || categoryIcons[loc.category] || 'Position'} ${loc.category.toUpperCase()}
        </strong>
       
        <!-- Scrollable description only -->
        <div style="
    max-height:180px;
    overflow-y:auto;
    margin-bottom:12px;
    padding-right:8px;
    white-space:pre-wrap;
    word-break:break-word;
    scrollbar-width:thin;
    scrollbar-color:#00ff00 #000;
    margin-left: -8px;
    padding-left: 8px;
">
    ${escapeHtml(loc.desc)}
</div>
       
<!-- Static footer/buttons -->
${loc.isCommunity && !loc.userEdited && !loc.wasCommunityKept ? `
<div style="text-align:center; display:flex; flex-direction:column; gap:10px;">
    <button onclick="exitFullscreenThenDo(() => keepCommunityMarker('${loc.id}'))"
            style="background:#00ff00; color:#000; border:none; padding:8px 16px; border-radius:4px; font-size:13px; font-weight:bold; cursor:pointer;">
        Keep This Marker
    </button>
    <button onclick="exitFullscreenThenDo(() => startReport('${loc.id}'))"
            style="background:#300; color:#f00; border:2px solid #f00; padding:8px 16px; border-radius:4px; font-size:13px; font-weight:bold; cursor:pointer;">
        Report Bad Marker
    </button>
    <div style="margin-top:8px; font-size:12px; color:#aaa;">
        Keep = save permanently (editable)<br>
        Report = ask a Moderator to review & remove if needed
    </div>
</div>` : ''}

${loc.wasCommunityKept ? `
<div style="text-align:center; display:flex; flex-direction:column; gap:8px; margin-top:8px;">
        ${loc.communityUpdateAvailable ? `
    <div style="background:#0066ff;color:#fff;padding:6px 12px;border-radius:4px;font-size:13px;margin-bottom:6px;line-height:1.25;">
        🔄 Community Marker Outdated!<br>
        <span style="font-size:12px;opacity:0.9;">Tap “Revert” then “Update Community Map”</span>
    </div>` : ''}
    <div style="margin:8px 0; text-align:center;">
        <span class="popup-lock-toggle" onclick="toggleLockFromPopup(${locations.indexOf(loc)})">${loc.locked ? '🔐 LOCKED' : '🔓 UNLOCKED'}</span>
    </div>
    <button onclick="exitFullscreenThenDo(() => editMarkerFromPopup(${locations.indexOf(loc)}))"
            style="background:#00ff00; color:#000; border:none; padding:8px 16px; border-radius:4px; font-size:13px; font-weight:bold; cursor:pointer;">
        Edit
    </button>
    <button onclick="exitFullscreenThenDo(() => revertToCommunityMarker('${loc.id}'))"
            style="background:#ffaa00; color:#000; border:none; padding:8px 16px; border-radius:4px; font-size:13px; font-weight:bold; cursor:pointer;">
        ↩ Revert back to Community
    </button>
    <div style="margin-top:6px; font-size:12px; color:#aaa; line-height:1.4;">
        Revert = return to community map (no longer editable)<br>will receive updates again
    </div>
</div>` : ''}

${loc.userEdited && !loc.isPostcard && !loc.wasCommunityKept ? `
<div style="text-align:center; margin:12px 0 8px;">
    <div style="margin:8px 0; text-align:center;">
        <span class="popup-lock-toggle" onclick="toggleLockFromPopup(${locations.indexOf(loc)})">${loc.locked ? '🔐 LOCKED' : '🔓 UNLOCKED'}</span>
    </div>
    <button onclick="exitFullscreenThenDo(() => editMarkerFromPopup(${locations.indexOf(loc)}))"
            style="background:#00ff00; color:#000; border:none; padding:8px 16px; border-radius:4px; font-size:13px; font-weight:bold; cursor:pointer;">
        Edit
    </button>
    <div style="margin-top:10px; font-size:12px; color:#88ff88; line-height:1.4;">
        You Created This Marker<br>
        Feel free to share to the Community Map
    </div>
</div>` : ''}
    </div>
`, {
    maxWidth: 280,
    minWidth: 220,
    autoPan: false,
    offset: [0, -25],
    autoPanPadding: [20, 80],
    autoClose: true,       // closes previous bubble when new marker is selected
    closeOnClick: false    // prevents Leaflet from closing on map tap (we control it manually)
});
        }
    });
}
function addMarkerToMap(loc) {
    if (!loc || typeof loc.lat !== 'number' || typeof loc.lng !== 'number' || isNaN(loc.lat) || isNaN(loc.lng)) {
        console.warn('Skipping marker — invalid coordinates:', loc);
        return;
    }

    // ── ULTRA-STRONG DEDUPLICATION (prevents the runtime duplicate layers that cause single-marker clusters) ──
    clusteredMarkers.eachLayer(function(m) {
        if (m.options && m.options.id === loc.id) m.remove();
    });
    nonClusteredMarkers.eachLayer(function(m) {
        if (m.options && m.options.id === loc.id) m.remove();
    });

    // ── Prevent random popup jumping on freshly created postcards ──
    if (window.justCreatedPostcardId && window.justCreatedPostcardId === loc.id) {
        // we will open it manually in the setTimeout above
        // (this guard stops any other code from opening a different marker)
    }

    const marker = L.marker([loc.lat, loc.lng], {
        icon: createMarkerIcon(loc),
        id: loc.id,
        draggable: !loc.locked && !loc.isPostcard,
        autoPan: true,
        autoPanPadding: [80, 80],
        autoPanSpeed: 30
    });

    attachDragHandler(marker, loc);

    const textOnly = ['named locations', 'regions'].includes(loc.category);
    
    // ── NEW RULE: Postcards are ALWAYS non-clustered (they expire) ──
    const targetGroup = loc.isPostcard || textOnly ? nonClusteredMarkers : 
                        (clusteringEnabled ? clusteredMarkers : nonClusteredMarkers);

    targetGroup.addLayer(marker);

    if (textOnly) {
        marker.setZIndexOffset(20000);
    } else if (isGlowing(loc)) {
        marker.setZIndexOffset(10000);
    } else {
        marker.setZIndexOffset(0);
    }

    if (isGlowing(loc)) {
        setTimeout(() => {
            if (textOnly) {
                marker.setZIndexOffset(20000);
            } else {
                marker.setZIndexOffset(10000);
            }
            marker.setIcon(createMarkerIcon(loc));
        }, 100);
    }

    if (lastMovedMarker && lastMovedMarker.options.id === loc.id) {
        setTimeout(() => {
            marker.openPopup();
            lastMovedMarker = null;
        }, 800);
    }

    if (marker._icon) {
        L.DomEvent.on(marker._icon, 'contextmenu', function(e) {
            e.preventDefault();
            e.stopPropagation();
        });
        L.DomEvent.on(marker._icon, 'contextmenu', function() {
            marker.openPopup();
        });
        let longPressTimer;
        L.DomEvent.on(marker._icon, 'touchstart', function(e) {
            if (e.touches.length === 8) {
                longPressTimer = setTimeout(() => {
                    marker.openPopup();
                }, 800);
            }
        });
        L.DomEvent.on(marker._icon, 'touchend touchmove touchcancel', function() {
            clearTimeout(longPressTimer);
        });
    }

    // ── Force immediate cluster resynchronisation after every addition ──
    if (clusteringEnabled && !textOnly && !loc.isPostcard) {
        clusteredMarkers.refreshClusters();
    }
}

function updateCounterDisplay() {
    const communityVer = localStorage.getItem(MAP_VERSION_KEY) || "1.0";

    const totalLogged = locations.filter(l => activeCategories.has(l.category)).length;

    const communityTotal = locations.filter(l =>
        l.isCommunity === true &&
        !l.userEdited &&
        !l.wasCommunityKept &&
        !l.isPostcard
    ).length;

    const created = locations.filter(l =>
        l.userEdited === true &&
        !l.approvedSubmission &&
        !l.wasCommunityKept &&
        !l.isPostcard
    ).length;

    const approved = locations.filter(l =>
        l.approvedSubmission === true &&
        !l.wasCommunityKept &&
        !l.isPostcard
    ).length;

    const kept = locations.filter(l =>
        l.wasCommunityKept === true &&
        !l.isPostcard
    ).length;

    // You Logged = Created + Approved + Kept (stable, no double-counting)
    const userLogged = created + approved + kept;

    counter.innerHTML = `
        <strong>Latest Version</strong><br>
        v${CURRENT_APP_VERSION}<br>
        Community Map v${communityVer}<br><br>
        <strong>Stats</strong><br>
        Total Logged: <strong style="color:#00ff88;">${totalLogged}</strong><br>
        Unexplored: <strong style="color:#88ccff;">${communityTotal}</strong><br>
        You Created: <strong style="color:#00ff88;">${created}</strong><br>
        Approved: <strong style="color:#ffcc00;">${approved}</strong><br>
        You Kept: <strong style="color:#00ff88;">${kept}</strong><br>
        You Logged: <strong style="color:#00ff88;">${userLogged}</strong><br>
        Explorer Level: <strong style="color:#00ff88;">${level}</strong>
    `;
}

function refreshTable(search = '', cat = '') {
    const tbody = document.querySelector('#locationsTable tbody');
    tbody.innerHTML = '';

    let list = locations.filter(l => activeCategories.has(l.category) && (!cat || l.category === cat));

    if (showOnlyMyMarkers) {
        list = list.filter(l => l.userEdited || l.wasCommunityKept);
    }

    if (search) {
        const q = normalizeString(search);
        if (q) {
            const terms = q.split(' ').filter(t => t.length > 0);
            list = list.filter(l => {
                const grid = (typeof getGridFromLatLng === 'function') ? (getGridFromLatLng(l.lat, l.lng) || '') : '';
                const text = normalizeString(l.desc + ' ' + (l.category || '') + ' ' + grid);
                return terms.every(term => text.includes(term));
            });
        }
    }

    const glow = list.filter(isGlowing).sort((a, b) => b.addedTime - a.addedTime);
    const rest = list.filter(l => !isGlowing(l)).sort((a, b) => a.category.localeCompare(b.category) || a.desc.localeCompare(b.desc));
    const sorted = [...glow, ...rest];

    const start = (tablePage - 1) * pageSize;
    sorted.slice(start, start + pageSize).forEach(loc => {
        const tr = document.createElement('tr');
        tr.dataset.id = loc.id;
        if (isGlowing(loc)) tr.classList.add('glowing');

        const short = loc.desc.split('\n')[0].trim();
                let lockCell = '';

        if (loc.isPostcard) {
            lockCell = `<span style="color:#ff0;font-size:13px;font-weight:bold;">Expire: </span><span class="postcard-timer" data-id="${loc.id}" style="color:#ff0;font-size:13px;font-weight:bold;"></span>`;
        } else if (isGlowing(loc)) {
            const isOwned = loc.userEdited || loc.wasCommunityKept;
            if (isOwned) {
                const lockText = loc.locked ? '🔐 Locked' : '🔓 Unlocked';
                lockCell = `<button class="lock-toggle-btn" style="margin-right:10px;cursor:pointer;background:none;border:none;color:inherit;font:inherit;padding:0;">${lockText}</button>`;
            } else {
                lockCell = `<span style="margin-right:10px;color:#666;">🔒</span>`;
            }
            lockCell += `<span class="new-marker-timer" data-id="${loc.id}" style="color:#ff0;font-size:13px;font-weight:bold;"></span>`;
        } else {
            const isOwned = loc.userEdited || loc.wasCommunityKept;
            if (isOwned) {
                const lockText = loc.locked ? '🔐 Locked' : '🔓 Unlocked';
                lockCell = `<button class="lock-toggle-btn" style="margin-right:10px;cursor:pointer;background:none;border:none;color:inherit;font:inherit;padding:0;">${lockText}</button>`;
            } else {
                lockCell = `<span style="margin-right:10px;color:#666;">🔒</span>`;
            }
        }

        // ── Blue UPDATE badge for kept markers with community update available ──
        if (loc.wasCommunityKept && loc.communityUpdateAvailable) {
            lockCell += ` <span style="background:#0066ff;color:#fff;padding:2px 2px;border-radius:2px;font-size:10px;font-weight:bold;">↩ UPDATE</span>`;
        }

        tr.innerHTML = `
            <td>${lockCell}</td>
            <td>${['named locations','regions'].includes(loc.category) ? `<div class="text-location">${escapeHtml(short)}</div>` : `<div class="icon-circle" style="background:${categoryColors[loc.category]||'#808080'}">${loc.icon}</div>`}</td>
            <td>${escapeHtml(loc.category)} ${loc.icon}</td>
            <td>${escapeHtml(short)}</td>
        `;

        // Attach real click listener to the lock button
        const lockBtn = tr.querySelector('.lock-toggle-btn');
        if (lockBtn) {
            lockBtn.addEventListener('click', function(e) {
                e.stopImmediatePropagation();
                e.preventDefault();
                toggleLockFromTable(locations.indexOf(loc));
            });
        }

        // Row click – only fires if NOT tapping the lock button or timers
        tr.onclick = e => {
            if (e.target.closest('.lock-toggle-btn') || 
                e.target.closest('.new-marker-timer') || 
                e.target.closest('.postcard-timer')) {
                return;
            }

            document.getElementById('map').scrollIntoView({ behavior: 'smooth' });
            const targetLatLng = [loc.lat, loc.lng];
            map.flyTo(targetLatLng, 4, { duration: 1.5 });
            map.once('moveend', () => {
                setTimeout(() => {
                    const m = [...clusteredMarkers.getLayers(), ...nonClusteredMarkers.getLayers()]
                        .find(m => m.options.id === loc.id);
                    if (m) m.openPopup();
					playSound('click');
                }, 650);
            });
        };

        // Right-click / long-press unchanged
        tr.oncontextmenu = e => {
            e.preventDefault();
            e.stopPropagation();
            map.closePopup();
            safeFlyTo(loc.lat, loc.lng, 4);
            map.once('moveend', () => {
                setTimeout(() => {
                    const marker = [...clusteredMarkers.getLayers(), ...nonClusteredMarkers.getLayers()]
                        .find(m => m.options && m.options.id === loc.id);
                    if (marker) marker.openPopup();
					playSound('click');
                }, 750);
            });
            if (loc.userEdited && !loc.isPostcard) {
                const index = locations.findIndex(l => l.id === loc.id);
                if (index !== -1) setTimeout(() => openModal('Edit Item', index), 1300);
            }
            return false;
        };

        tbody.appendChild(tr);
    });

    const pages = Math.ceil(sorted.length / pageSize);
    tablePage = Math.min(tablePage, pages || 1);
    pageInfo.textContent = `Page ${tablePage} of ${pages || 1}`;
    prevPageBtn.disabled = tablePage <= 1;
    nextPageBtn.disabled = tablePage >= pages;

    updateCounterDisplay();
    updatePostcardTimers();
    updateNewMarkerTimers();
}

// Changed from 1000ms → 3000ms
        function renderCategoryToggles() {
            const box = document.getElementById('categoryCheckboxes');
            box.innerHTML = '';
            [...Object.keys(defaultCategoryIcons), ...Object.keys(customCategories)].sort().forEach(cat => {
                const label = document.createElement('label');
                label.innerHTML = `<input type="checkbox" value="${cat}" ${activeCategories.has(cat)?'checked':''}><span>${cat} ${categoryIcons[cat]||''}</span>`;
                box.appendChild(label);
            });
            box.querySelectorAll('input').forEach(cb => cb.onchange = () => {
                cb.checked ? activeCategories.add(cb.value) : activeCategories.delete(cb.value);
                localStorage.setItem('activeCategories', JSON.stringify([...activeCategories]));
                loadData(combinedSearch.value, categoryFilter.value);
                playSound('click');
            });
        }
                function updateCategoryDropdowns() {
            const cats = [...Object.keys(defaultCategoryIcons), ...Object.keys(customCategories)].sort();
            const opt = c => `<option value="${c}">${c} ${categoryIcons[c]||''}</option>`;
            
            // Remember what the user currently had selected
            const currentSelected = categoryFilter.value;
            
            // Rebuild the dropdown
            categoryFilter.innerHTML = '<option value="">All Categories</option>' + cats.map(opt).join('');
            itemCategorySelect.innerHTML = cats.map(opt).join('');
            
            // Restore the user's previous selection
            if (currentSelected && cats.includes(currentSelected)) {
                categoryFilter.value = currentSelected;
            } else if (currentCategoryFilter && cats.includes(currentCategoryFilter)) {
                categoryFilter.value = currentCategoryFilter;
            }
        }
 
function openModal(title, idx = -1) {
    autoExitFullscreenForModal();
    const loc = idx >= 0 ? locations[idx] : null;
    const isCreateMode = idx < 0;                    // true when creating a new marker
    const isCurrentlyLocked = loc ? loc.locked : false;

    modalTitle.innerHTML = `${title} <span id="modalLockToggle" style="font-size:22px;cursor:pointer;margin-left:10px;">${isCurrentlyLocked ? '🔐 LOCKED' : '🔓 UNLOCKED'}</span>`;
    currentIndex = idx;

    itemCategorySelect.value = loc?.category || 'misc';
    itemDescInput.value = loc?.desc || '';

    itemCategorySelect.disabled = isCurrentlyLocked;
    itemDescInput.disabled = isCurrentlyLocked;

    // ── BUTTON VISIBILITY ──
    // Delete & Duplicate require unlock (or create mode)
    deleteBtn.style.display = isCurrentlyLocked || isCreateMode ? 'none' : 'inline-block';
    duplicateBtn.style.display = isCurrentlyLocked || isCreateMode ? 'none' : 'inline-block';

    // Export Marker, Share Marker, Share Map View, Submit to Community Map → hidden while creating
    exportOneBtn.style.display = isCreateMode ? 'none' : 'inline-block';
    shareOneBtn.style.display = isCreateMode ? 'none' : 'inline-block';
    shareItemBtn.style.display = 'none';
    submitCommunityBtn.style.display = 'none';

    // ── Smart Submit Button & Note Logic ──
    const submitBtn = document.getElementById('submitCommunityBtn');
    let noteHTML = '';
    if (loc && currentIndex >= 0) {
        const cid = loc.cid || generateCid(loc);
        if (loc.isCommunity || loc.wasCommunityKept) {
            noteHTML = '<p style="color:#00ff88; text-align:center; margin:12px 0 8px;">This marker is now part of the official community map — no resubmission needed.</p>';
            if (submitBtn) submitBtn.style.display = 'none';
        }
        else if (hasBeenSubmitted(cid)) {
            noteHTML = '<p style="color:#ffcc00; text-align:center; margin:12px 0 8px;">This marker was previously submitted.<br>If it does not appear in the Pending Submissions list, it was either merged or removed.<br>Delete this marker and create a new one if you wish to resubmit.</p>';
            if (submitBtn) submitBtn.style.display = 'none';
        }
        else if (loc.locked && !loc.isCommunity) {
            noteHTML = '<p style="color:#00ccff; text-align:center; margin:12px 0 8px;">Submit this marker to the community map for review by a Moderator.</p>';
            if (submitBtn) submitBtn.style.display = 'inline-block';
        }
        else {
            if (submitBtn) submitBtn.style.display = 'none';
        }
    } else {
        if (submitBtn) submitBtn.style.display = 'none';
    }

    // Insert or update the note safely
    let existingNote = document.getElementById('submitNote');
    const buttonsDiv = document.querySelector('#itemModal .modal-content > div:last-child');
    if (noteHTML) {
        if (!existingNote) {
            existingNote = document.createElement('div');
            existingNote.id = 'submitNote';
            if (buttonsDiv) buttonsDiv.appendChild(existingNote);
        }
        existingNote.innerHTML = noteHTML;
        existingNote.style.display = 'block';
    } else if (existingNote) {
        existingNote.style.display = 'none';
    }

    // Lock toggle handler
    const modalToggle = document.getElementById('modalLockToggle');
    if (modalToggle && loc) {
        modalToggle.onclick = (e) => {
            e.stopPropagation();
            loc.locked = !loc.locked;
            modalToggle.textContent = loc.locked ? '🔐 LOCKED' : '🔓 UNLOCKED';
            itemCategorySelect.disabled = loc.locked;
            itemDescInput.disabled = loc.locked;
            deleteBtn.style.display = loc.locked ? 'none' : 'inline-block';
            duplicateBtn.style.display = loc.locked ? 'none' : 'inline-block';
            saveLocations();
            forceReload();
            showTempMessage(loc.locked ? '🔐 LOCKED' : '🔓 UNLOCKED', 2000);
            playSound('click');
        };
    }

    // Hide ONLY Export and Share for kept community markers
    // Duplicate button remains visible (user tested and approved)
    if (loc && loc.wasCommunityKept) {
        const exportBtn = document.getElementById('exportOneBtn');
        const shareBtn = document.getElementById('shareOneBtn');
        if (exportBtn) exportBtn.style.display = 'none';
        if (shareBtn) shareBtn.style.display = 'none';
        // Duplicate button is deliberately left visible
    }

    itemModal.style.display = 'block';
    document.body.classList.add('modal-open');
    playSound('click');
}
		
function closeModal(m) {
    m.style.display = 'none';
    document.body.classList.remove('modal-open');
    playSound('modalClose');

    // ── SMART FULLSCREEN RESTORE LOGIC ──
    // Return to Fullscreen button appears ONLY after closing
    // Log Item modal or Send Postcard modal (not during creation)
    if (exitedForContextMenu) {
        exitedForContextMenu = false; // reset flag
        wasInFullscreenBeforeModal = false;
        setTimeout(() => {
            showRestoreFullscreenButton();
        }, 180); // small delay ensures modal is fully gone
    }
    else if (wasInFullscreenBeforeModal) {
        // Normal behaviour for all other modals
        wasInFullscreenBeforeModal = false;
        showRestoreFullscreenButton();
    }

    // ── Only reopen popup for the actual Edit/Log Item modal ──
    if (m && m.id === 'itemModal') {
        justClosedEditModal = true;
        setTimeout(() => { justClosedEditModal = false; }, 2000);
        reopenPopupAfterModalClose();
    }
}
		
		// ── Re-open popup when Edit modal is closed (STRONG VERSION — guarded) ──
function reopenPopupAfterModalClose() {
    if (currentIndex === -1 || !justClosedEditModal) return;
    const loc = locations[currentIndex];
    if (!loc) return;

    const marker = [...clusteredMarkers.getLayers(), ...nonClusteredMarkers.getLayers()]
        .find(m => m.options && m.options.id === loc.id);

    if (!marker) return;

    // Your original strong timing (kept exactly as you like it)
    setTimeout(() => {
        marker.openPopup();

        // First fallback
        setTimeout(() => {
            if (!marker.isPopupOpen()) {
                marker.fire('click', { latlng: marker.getLatLng() });
            }
        }, 400);

        // Final safety net (covers even very slow closes)
        setTimeout(() => {
            if (!marker.isPopupOpen()) {
                marker.fire('click', { latlng: marker.getLatLng() });
            }
        }, 1200);
    }, 650);
}
function recalculateXP() {
    const oldLevel = lastLevel;
    let totalXP = 0;

    locations.forEach(l => {
        if (l.isPostcard) return;

        // Permanent creator XP
        if (l.approvedSubmission === true) {
            totalXP += 100;                                 // approved markers keep creator XP forever
        } else if (l.userEdited === true && !l.wasCommunityKept) {
            totalXP += 100;                                 // pure user-created markers (not kept ones)
        }

        // Keep bonus (additional for any kept marker)
        if (l.wasCommunityKept === true) {
            totalXP += 100;
        }
    });

    xp = totalXP;
    level = 1 + Math.floor(xp / xpPerLevel);
    xp = xp % xpPerLevel;

    if (level > oldLevel) {
        playSound('levelUp');
        triggerConfetti();
        showTempMessage(`☢️ LEVEL UP! — NOW EXPLORER LEVEL ${level} 🎉`, 10000);
        const bar = document.getElementById('xpProgress');
        bar.classList.add('level-up');
        setTimeout(() => bar.classList.remove('level-up'), 18000);
        triggerNuke();
    }

    localStorage.setItem('fo76_level', level);
    localStorage.setItem('fo76_xp', xp);
    lastLevel = level;
    updateXPBar();
}
function triggerConfetti() {
    const fire = (options = {}) => {
        confetti({
            particleCount: 680,           // dense and full
            spread: 240,                  // very wide full-screen coverage
            origin: { y: 0.50 },
            colors: [
                '#00ff00', '#00cc00', '#33ff33', '#00ff99', '#88ff88',  // classic Fallout greens
                '#00ffff', '#00ddff', '#66ffff',                        // bright cyan / teal accents
                '#ffff00', '#ffdd00', '#ffee66',                        // glowing yellow highlights
                '#ff88ff', '#dd44dd'                                    // subtle magenta/pink pops
            ],
            ticks: 1350,
            gravity: 0.30,
            scalar: 0.65,                 // tiny confetti pieces
            ...options
        });
    };

    // Slight delay so confetti starts after the nuke screen appears
    setTimeout(() => {
        if (window.confettiReady) {
            // Left side burst
            fire({ origin: { x: 0.05, y: 0.55 }, angle: 55 });
            // Centre main explosion
            fire({ origin: { x: 0.50, y: 0.48 } });
            // Right side burst
            fire({ origin: { x: 0.95, y: 0.55 }, angle: 125 });
            
            // Extra full-screen bursts for a rich, dense look
            setTimeout(() => fire({ origin: { x: 0.25, y: 0.42 }, spread: 260 }), 140);
            setTimeout(() => fire({ origin: { x: 0.75, y: 0.42 }, spread: 260 }), 280);
            setTimeout(() => fire({ origin: { x: 0.50, y: 0.38 }, spread: 280 }), 420);
        } else {
            // Exact fallback you already had
            const start = Date.now();
            const wait = setInterval(() => {
                if (window.confettiReady || Date.now() - start > 12000) {
                    clearInterval(wait);
                    if (typeof confetti === 'function') {
                        fire();
                        setTimeout(fire, 380);
                    }
                }
            }, 100);
        }
    }, 2200);
}
		
// ── PERSISTENT UNDO (survives page refresh)
function savePendingUndo(type, beforeState, extraData = {}) {
    const undoData = {
        type: type,
        beforeState: beforeState,
        timestamp: Date.now(),
        ...extraData
    };
    localStorage.setItem('fo76_pendingUndo_' + type, JSON.stringify(undoData));
}

function restorePendingUndo() {
    const types = ['import', 'delete'];
    types.forEach(type => {
        const key = 'fo76_pendingUndo_' + type;
        const saved = localStorage.getItem(key);
        if (!saved) return;

        const data = JSON.parse(saved);
        const elapsed = Date.now() - data.timestamp;
        const remaining = Math.max(0, 120000 - elapsed);

        if (remaining <= 0) {
            localStorage.removeItem(key);
            return;
        }

        if (type === 'import') {
            const undoBtn = document.getElementById('undoImportBtn');
            if (undoBtn) {
                undoBtn.style.display = 'inline-block';
                let secondsLeft = Math.floor(remaining / 1000);
                const updateText = () => {
                    undoBtn.textContent = `UNDO LAST IMPORT (${data.count || 0} markers) (${Math.floor(secondsLeft / 60)}:${(secondsLeft % 60).toString().padStart(2, '0')})`;
                };
                updateText();
                window.undoImportTimer = setInterval(() => {
                    secondsLeft--;
                    if (secondsLeft <= 0) {
                        clearInterval(window.undoImportTimer);
                        window.undoImportTimer = null;
                        undoBtn.style.display = 'none';
                        localStorage.removeItem(key);
                    } else updateText();
                }, 1000);

                undoBtn.onclick = () => {
                    clearInterval(window.undoImportTimer);
                    window.undoImportTimer = null;
                    locations = JSON.parse(data.beforeState);
                    recalculateXP();
                    saveLocations();
                    forceReload();
                    undoBtn.style.display = 'none';
                    localStorage.removeItem(key);
                    showTempMessage('✅ IMPORT UNDONE', 4000);
                    playSound('undo');
                };
            }
        } else if (type === 'delete') {
            const undoBtn = document.getElementById('undoDeleteBtn');
            if (undoBtn && data.lastDeleted) {
                undoBtn.style.display = 'inline-block';
                let secondsLeft = Math.floor(remaining / 1000);
                const updateText = () => {
                    undoBtn.textContent = `UNDO LAST DELETE (${Math.floor(secondsLeft / 60)}:${(secondsLeft % 60).toString().padStart(2, '0')})`;
                };
                updateText();
                window.undoDeleteTimer = setInterval(() => {
                    secondsLeft--;
                    if (secondsLeft <= 0) {
                        clearInterval(window.undoDeleteTimer);
                        undoBtn.style.display = 'none';
                        localStorage.removeItem(key);
                    } else updateText();
                }, 1000);

                undoBtn.onclick = () => {
                    clearInterval(window.undoDeleteTimer);
                    locations.push({ ...data.lastDeleted });
                    recalculateXP();
                    saveLocations();
                    forceReload();
                    undoBtn.style.display = 'none';
                    localStorage.removeItem(key);
                    showTempMessage('✅ MARKER RESTORED', 3000);
                    playSound('undo');
                };
            }
        }
    });
}		
		
// ── LEVEL-UP CELEBRATION (subtitle text now smaller for mobile) ──
function triggerNuke() {
    lockUIDuringAnimation(11000);

    const overlay = document.createElement('div');
    overlay.style.cssText = `
        position:fixed;top:0;left:0;width:100vw;height:100vh;
        background:#000;z-index:9999999;display:flex;
        align-items:center;justify-content:center;flex-direction:column;
        gap:30px;font-family:'Courier New',monospace;color:#0f0;
        pointer-events:none;
    `;
    overlay.innerHTML = `
        <div id="rocketLaunch" style="font-size:clamp(80px,25vw,220px);">🚀</div>
        <h1 class="wipe-nuke-title">LEVEL UP INCOMING</h1>
        <p class="nuke-subtitle" style="font-size:clamp(18px,5vw,36px);">Explorer rank advancing...</p>
    `;
    document.body.appendChild(overlay);

    const style = document.createElement('style');
    style.textContent = `
        @keyframes rocketLaunch { 0% { transform: translateY(80px) scale(0.8); opacity: 0; } 30% { transform: translateY(-40px) scale(1.1); opacity: 1; } 70% { transform: translateY(-180px) scale(1); } 100% { transform: translateY(-300px) scale(0.6); opacity: 0; } }
        @keyframes rocketFall { 0% { transform: translateY(-420px) scale(0.5); opacity: 0; } 40% { transform: translateY(-60px) scale(1.2); opacity: 1; } 75% { transform: translateY(160px) scale(1.45); } 100% { transform: translateY(280px) scale(1.65); } }
        @keyframes groundImpact { 0%,100% { transform: translateY(280px) scale(1.65); } 25% { transform: translateY(305px) scale(1.9); } 55% { transform: translateY(265px) scale(1.5); } }
        @keyframes explosionPulse { 0% { transform: scale(1); opacity:1; } 40% { transform: scale(4.2); opacity:0.95; } 70% { transform: scale(2.8); opacity:1; } 100% { transform: scale(4.5); opacity:0; } }
        @keyframes fadeOut { 0% { opacity: 1; } 100% { opacity: 0; } }
    `;
    document.head.appendChild(style);

    const rocket = document.getElementById('rocketLaunch');
    const title = overlay.querySelector('h1');
    const subtitle = overlay.querySelector('p');

    rocket.style.animation = 'rocketLaunch 1.8s ease-out forwards';

    setTimeout(() => {
        // Fade out title + subtitle
        title.style.animation = 'fadeOut 0.8s ease-out forwards';
        subtitle.style.animation = 'fadeOut 0.8s ease-out forwards';

        setTimeout(() => {
            title.remove();
            subtitle.remove();
        }, 800);

        // Rocket falls and crashes
        rocket.remove();
        overlay.innerHTML += `<div id="fallingRocket" style="font-size:clamp(140px,38vw,460px);color:#ff0;text-shadow:0 0 80px #ff0;">🚀</div>`;
        const fallingRocket = document.getElementById('fallingRocket');
        fallingRocket.style.animation = 'rocketFall 1.2s cubic-bezier(0.42,0,1,1) forwards';

        setTimeout(() => {
            fallingRocket.style.animation = 'groundImpact 0.45s ease-out forwards';

            // Rocket turns into nuke
            setTimeout(() => {
                fallingRocket.remove();

                // Long white flash
                const flash = document.createElement('div');
                flash.style.cssText = `
                    position:fixed;top:0;left:0;width:100vw;height:100vh;
                    background:#fff;z-index:99999999;pointer-events:none;
                    animation:quickFlash 1.8s ease-out forwards;
                `;
                document.body.appendChild(flash);

                // Big centered explosions
                setTimeout(() => {
                    flash.remove();

                    const explosionContainer = document.createElement('div');
                    explosionContainer.style.cssText = `
                        position:absolute; top:50%; left:50%; transform:translate(-50%, -50%);
                        width:100%; height:100%; display:flex; align-items:center; justify-content:center;
                        pointer-events:none; z-index:99999999;
                    `;
                    overlay.appendChild(explosionContainer);

                    const explosions = ['💥','💥','💥','💥','💥','💥','💥'];
                    explosions.forEach((emoji, i) => {
                        const boom = document.createElement('div');
                        boom.style.cssText = `
                            position:absolute; font-size:clamp(160px,42vw,520px);
                            animation:explosionPulse 1.3s ease-out forwards; opacity:0;
                            text-shadow:0 0 60px #ffaa00;
                        `;
                        boom.textContent = emoji;
                        explosionContainer.appendChild(boom);
                        setTimeout(() => { boom.style.opacity = '1'; }, i * 65);
                    });

                    // Final dramatic screen – subtitle now smaller for mobile
                    setTimeout(() => {
                        explosionContainer.remove();

                        const subtitleText = (level % 5 === 0)
    ? '☢️ NUKE DETONATED! ☢️'
    : '🎉 EXPLORER RANK UP! 🎉';

overlay.innerHTML = `
    <div style="font-size:clamp(130px,32vw,250px);color:#ff0;text-shadow:0 0 90px #ff0;margin-bottom:15px;">☢️</div>
    <h1 class="wipe-nuke-title" style="font-size:clamp(36px,8vw,75px);text-align:center;margin:8px 0 18px 0;">LEVEL ${level} ACHIEVED!</h1>
    <p class="nuke-subtitle" style="font-size:clamp(20px,5vw,42px);text-align:center;max-width:94%;line-height:1.35;">
        ${subtitleText}
    </p>
                        `;

                        playSound('levelUp');

                        setTimeout(() => {
                            overlay.style.transition = 'opacity 1.4s';
                            overlay.style.opacity = '0';
                            setTimeout(() => overlay.remove(), 1400);
                        }, 2800);
                    }, 1650);
                }, 400);
            }, 420);
        }, 1220);
    }, 1900);
}
        // ── Nuke / Level-up animation styles (required for triggerNuke) ──
        const nukeStyle = document.createElement('style');
        nukeStyle.textContent = `
            @keyframes nukeFlash {
                0% { opacity: 0; }
                10% { opacity: 1; }
                100% { opacity: 0; }
            }
            @keyframes mushroomCloud {
                0% { font-size: 0; opacity: 0; }
                50% { font-size: 400px; opacity: 1; }
                100% { font-size: 600px; opacity: 0; }
            }
            @keyframes textAppear {
                to { opacity: 1; }
            }
            @keyframes quickFlash {
                0% { opacity: 0; }
                10% { opacity: 1; }
                100% { opacity: 0; }
            }
            .nuke-symbol {
                font-size: clamp(80px, 28vw, 300px);
                color: #0f0;
                animation: symbolDrop 1.2s ease-out forwards;
                text-shadow: 0 0 60px #0f0;
            }
            .nuke-title {
                font-size: clamp(32px, 8vw, 80px);
                color: #0f0;
                margin: 0;
                animation: textFadeIn 1.2s forwards;
                text-shadow: 0 0 35px #0f0;
                letter-spacing: 6px;
            }
            .nuke-subtitle {
                font-size: clamp(24px, 6vw, 60px);
                color: #0f0;
                margin: 0;
                font-weight: bold;
                animation: textFadeIn 1.2s 0.3s forwards;
                text-shadow: 0 0 30px #0f0;
            }
            @keyframes symbolDrop {
                0% { opacity: 0; transform: translateY(-60px); }
                100% { opacity: 1; transform: translateY(0); }
            }
            @keyframes textFadeIn {
                0% { opacity: 0; transform: translateY(20px); }
                100% { opacity: 1; transform: translateY(0); }
            }
            .popup-glow {
                filter: drop-shadow(0 0 12px #00ff00) brightness(0.6) !important;
                z-index: 10000 !important;
                animation: pulse-glow 2s infinite alternate;
            }
            .table-row-popup-glow {
                background: rgba(0, 255, 0, 0.15) !important;
                box-shadow: 0 0 12px #00ff00 !important;
                animation: pulse-glow 2s infinite alternate;
            }
            @keyframes pulse-glow {
                from { filter: drop-shadow(0 0 12px #00ff00) brightness(0.6); }
                to { filter: drop-shadow(0 0 18px #00ff80) brightness(1.2); }
            }
        `;
        document.head.appendChild(nukeStyle);
        function updateXPBar() {
            levelSpan.textContent = level;
            xpProgress.value = xp;
            xpText.textContent = `${xp} / ${xpPerLevel}`;
        }
        function loadData(search = '', catFilter = '') {
    clusteredMarkers.clearLayers();
    nonClusteredMarkers.clearLayers();

    const currentLocations = [...locations];

    // Filter out any markers with invalid coordinates before processing
    const validLocations = currentLocations.filter(loc => {
        const latOk = typeof loc.lat === 'number' && !isNaN(loc.lat);
        const lngOk = typeof loc.lng === 'number' && !isNaN(loc.lng);
        if (!latOk || !lngOk) {
            console.warn('Skipping invalid marker during load:', loc);
            return false;
        }
        return true;
    });

    let filtered = validLocations.filter(loc => {
        if (!activeCategories.has(loc.category)) return false;
        if (catFilter && loc.category !== catFilter) return false;
        if (showOnlyMyMarkers && loc.isCommunity && !loc.wasCommunityKept && !loc.userEdited) return false;
        if (!search) return true;
        const normalizedSearch = normalizeString(search);
        const normalizedDesc = normalizeString(loc.desc);
        const normalizedCat = loc.category ? normalizeString(loc.category) : '';
        return normalizedDesc.includes(normalizedSearch) ||
               normalizedSearch.includes(normalizedDesc) ||
               normalizedCat.includes(normalizedSearch);
    });

    filtered.forEach(addMarkerToMap);
    refreshTable(search, catFilter);
    updateXPBar();
    drawGrid();
    saveAppState();
    updateLockAllBtn();
    if (currentLocations.some(l => l.isPostcard)) startPostcardTicker();
	updateCounterDisplay();
}
function forceReload() {
    const modalOpen = itemModal.style.display === 'block';
    const currentModalCategory = modalOpen ? (locations[currentIndex]?.category || itemCategorySelect.value) : null;

    // ── Full reliable refresh for locking, export, share, permshare, duplicate, etc. ──
    clusteredMarkers.clearLayers();
    nonClusteredMarkers.clearLayers();
    saveAppState();

    // Only ONE call to loadData — it already re-renders every marker correctly
    loadData('', categoryFilter?.value || '');

    renderCategoryToggles();
    updateCategoryDropdowns();
    updateCounterDisplay();
    updateLockAllBtn();
    drawGrid();

    // Restore modal category if edit modal was open
    if (modalOpen && currentModalCategory) {
        setTimeout(() => {
            itemCategorySelect.value = currentModalCategory;
        }, 50);
    }

    updatePostcardTimers(); // Keeps table timers updated
    map.invalidateSize({ animate: false }); // Ensures correct rendering on all devices

    // Final safety refresh for perfect cluster counts after dynamic updates
    if (clusteringEnabled) clusteredMarkers.refreshClusters();
}

        function saveAppState() {
            localStorage.setItem('currentSearch', combinedSearch?.value || '');
            localStorage.setItem('currentCategoryFilter', categoryFilter?.value || '');
            localStorage.setItem('tablePage', tablePage);
            localStorage.setItem('clusteringEnabled', clusteringEnabled);
            localStorage.setItem('gridEnabled', gridEnabled);
            localStorage.setItem('currentMap', currentMap);
            localStorage.setItem('titleVisible', titleVisible);
            localStorage.setItem('toolsVisible', toolsVisible);
        }
        function saveLocations() {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(locations));
            saveAppState();
        }
        function normalizeString(s) {
            return (s || '').toLowerCase().trim();
        }
        let flyTO;
function safeFlyTo(lat, lng, z = map.getZoom()) {
    if (isNaN(lat) || isNaN(lng)) return;
    clearTimeout(flyTO);
    map.flyTo([lat, lng], z, {
        animate: true,
        duration: 1.5,
        easeLinearity: 0.25
    });
}
        
// ── RESET ANIMATION ──
resetAppBtn.onclick = () => {
    showConfirmModal(
        '☢ FULL APP RESET ☢',
        'This will wipe ALL data from your device, including:<br>' +
        '<strong style="color:#ff4444;">• Your personal markers and edits</strong><br>' +
        '<strong style="color:#ff4444;">• All community markers (they will be removed)</strong><br>' +
        '<strong style="color:#ff4444;">• Your XP, level, and app settings</strong><br><br>' +
        '<strong style="color:#00ff88;">A single backup of your personal markers and kept community markers, XP, level, and settings will be triggered first.</strong><br><br>' +
        'Other Community markers can be re-added later by clicking the "Update Community Map" button.<br><br>' +
        'Ready to initiate reset protocol?',
        () => {
            // Backup first — now includes player name
            const playerName = document.getElementById('playerNameInput')?.value.trim() || '';

            const userMarkers = locations.filter(l => (l.userEdited || l.wasCommunityKept) && !l.isPostcard);
            const personalBackup = {
                version: "personal-plus-kept-fullbackup",
                timestamp: new Date().toISOString(),
                communityVersion: localStorage.getItem(MAP_VERSION_KEY) || "1.0",
                playerName: playerName,                    // ← added for name restore
                customCategories,
                locations: userMarkers,
                level,
                xp,
                settings: {
                    clusteringEnabled, gridEnabled, currentMap, darkMode,
                    soundsEnabled, titleVisible, toolsVisible,
                    activeCategories: [...activeCategories]
                }
            };
            downloadBackupFile(personalBackup, `FO76_PersonalPlusKeptFullBackup_Level_${level}`);

            triggerEpicFlash("💾", "BACKUP COMPLETE", `${userMarkers.length} marker${userMarkers.length === 1 ? '' : 's'} saved!`, `Level ${level} + XP + All Settings`);

            // Safety modal
            setTimeout(() => {
                const safetyModal = document.createElement('div');
                safetyModal.className = 'modal';
                safetyModal.style.display = 'block';
                safetyModal.innerHTML = `
                    <div class="modal-content" style="max-width:520px; background:#1a3c34; border:3px solid #ff4444; box-shadow:0 0 25px #ff4444;">
                        <span class="close" style="color:#ff4444;">×</span>
                        <h2 style="color:#ff4444;text-shadow:0 0 15px #ff4444;text-align:center;margin-bottom:20px;">☢ FINAL WIPE AUTHORIZATION ☢</h2>
                        <div style="color:#00ff88;line-height:1.6;font-size:1.1em;text-align:center;margin:20px 0;">
                            <strong>Have you confirmed the backup file was saved?</strong><br><br>
                            Proceeding will <span style="color:#ff4444;font-weight:bold;">PERMANENTLY ERASE</span> all markers, XP, and settings.<br>
                            No recovery will be possible after this point.
                        </div>
                        <div style="text-align:center;margin-top:30px;display:flex;justify-content:center;gap:30px;flex-wrap:wrap;">
                            <button id="cancelSafetyBtn" style="background:#00ff00;color:#000;padding:12px 30px;border:none;border-radius:6px;font-weight:bold;font-size:1.2em;min-width:180px;cursor:pointer;">CANCEL — BACKUP NOT SAVED</button>
                            <button id="proceedWipeBtn" style="background:#ff4444;color:#000;padding:12px 30px;border:none;border-radius:6px;font-weight:bold;font-size:1.2em;min-width:180px;cursor:pointer;">PROCEED WITH WIPE (IRREVERSIBLE)</button>
                        </div>
                    </div>
                `;
                document.body.appendChild(safetyModal);
                document.body.classList.add('modal-open');

                const closeSafety = () => {
                    safetyModal.remove();
                    document.body.classList.remove('modal-open');
                };

                safetyModal.querySelector('.close').onclick = closeSafety;
                safetyModal.querySelector('#cancelSafetyBtn').onclick = closeSafety;

                // ── CLEAN COUNTDOWN FADE + BIG CENTERED EXPLOSIONS ──
                safetyModal.querySelector('#proceedWipeBtn').onclick = () => {
                    closeSafety();
                    lockUIDuringAnimation(11000);

                    const screen = document.createElement('div');
                    screen.style.cssText = `
                        position:fixed;top:0;left:0;width:100vw;height:100vh;
                        background:#000;z-index:9999999;display:flex;
                        align-items:center;justify-content:center;flex-direction:column;
                        gap:30px;font-family:'Courier New',monospace;color:#0f0;
                        pointer-events:none;
                    `;
                    screen.innerHTML = `
                        <div id="rocket" style="font-size:clamp(80px,25vw,220px);">🚀</div>
                        <h1 id="initTitle" class="wipe-nuke-title">NUCLEAR WIPE INITIATED</h1>
                        <p id="countdownText" class="nuke-subtitle" style="font-size:clamp(18px,5vw,36px);">Detonation in 3...</p>
                    `;
                    document.body.appendChild(screen);
                    playSound('levelUp');

                    const style = document.createElement('style');
                    style.textContent = `
                        @keyframes rocketLaunch { 0% { transform: translateY(80px) scale(0.8); opacity: 0; } 30% { transform: translateY(-40px) scale(1.1); opacity: 1; } 70% { transform: translateY(-180px) scale(1); } 100% { transform: translateY(-300px) scale(0.6); opacity: 0; } }
                        @keyframes rocketFall { 0% { transform: translateY(-420px) scale(0.5); opacity: 0; } 40% { transform: translateY(-60px) scale(1.2); opacity: 1; } 75% { transform: translateY(160px) scale(1.45); } 100% { transform: translateY(280px) scale(1.65); } }
                        @keyframes groundImpact { 0%,100% { transform: translateY(280px) scale(1.65); } 25% { transform: translateY(305px) scale(1.9); } 55% { transform: translateY(265px) scale(1.5); } }
                        @keyframes explosionPulse { 0% { transform: scale(1); opacity:1; } 40% { transform: scale(4.2); opacity:0.95; } 70% { transform: scale(2.8); opacity:1; } 100% { transform: scale(4.5); opacity:0; } }
                        @keyframes fadeOut { 0% { opacity: 1; } 100% { opacity: 0; } }
                    `;
                    document.head.appendChild(style);

                    const rocket = document.getElementById('rocket');
                    const title = document.getElementById('initTitle');
                    const countdownText = document.getElementById('countdownText');

                    rocket.style.animation = 'rocketLaunch 1.8s ease-out forwards';

                    let count = 3;
                    const countdown = setInterval(() => {
                        count--;
                        if (count > 0) {
                            countdownText.textContent = `Detonation in ${count}...`;
                        } else {
                            clearInterval(countdown);

                            // === FADE OUT BOTH TITLE AND COUNTDOWN ===
                            title.style.animation = 'fadeOut 0.8s ease-out forwards';
                            countdownText.style.animation = 'fadeOut 0.8s ease-out forwards';

                            setTimeout(() => {
                                title.remove();
                                countdownText.remove();
                            }, 800);

                            // Rocket falls and lands
                            rocket.remove();
                            screen.innerHTML += `<div id="fallingRocket" style="font-size:clamp(140px,38vw,460px);color:#ff0;text-shadow:0 0 80px #ff0;">🚀</div>`;
                            const fallingRocket = document.getElementById('fallingRocket');
                            fallingRocket.style.animation = 'rocketFall 1.2s cubic-bezier(0.42,0,1,1) forwards';

                            setTimeout(() => {
                                fallingRocket.style.animation = 'groundImpact 0.45s ease-out forwards';

                                // Rocket turns into nuke
                                setTimeout(() => {
                                    fallingRocket.remove();

                                    // White flash
                                    const flash = document.createElement('div');
                                    flash.style.cssText = `
                                        position:fixed;top:0;left:0;width:100vw;height:100vh;
                                        background:#fff;z-index:99999999;pointer-events:none;
                                        animation:quickFlash 1.8s ease-out forwards;
                                    `;
                                    document.body.appendChild(flash);

                                    // BIG CENTERED EXPLOSIONS
                                    setTimeout(() => {
                                        flash.remove();

                                        const explosionContainer = document.createElement('div');
                                        explosionContainer.style.cssText = `
                                            position:absolute; top:50%; left:50%; transform:translate(-50%, -50%);
                                            width:100%; height:100%; display:flex; align-items:center; justify-content:center;
                                            pointer-events:none; z-index:99999999;
                                        `;
                                        screen.appendChild(explosionContainer);

                                        const explosions = ['💥','💥','💥','💥','💥','💥','💥'];
                                        explosions.forEach((emoji, i) => {
                                            const boom = document.createElement('div');
                                            boom.style.cssText = `
                                                position:absolute; font-size:clamp(160px,42vw,520px);
                                                animation:explosionPulse 1.3s ease-out forwards; opacity:0;
                                                text-shadow:0 0 60px #ffaa00;
                                            `;
                                            boom.textContent = emoji;
                                            explosionContainer.appendChild(boom);
                                            setTimeout(() => { boom.style.opacity = '1'; }, i * 65);
                                        });

                                        // FINAL SCREEN
                                        setTimeout(() => {
                                            explosionContainer.remove();

                                            screen.innerHTML = `
                                                <div style="font-size:clamp(140px,35vw,260px);color:#ff0;text-shadow:0 0 100px #ff0;">☢️</div>
<h1 class="wipe-nuke-title" style="font-size:clamp(36px,8vw,72px);">EVERYTHING NUKED</h1>
<p class="nuke-subtitle" style="font-size:clamp(20px,5vw,42px);">APPALACHIA REBORN</p>
                                            `;

                                            setTimeout(() => {
                                                const savedReports = {};
                                                for (let i = 0; i < localStorage.length; i++) {
                                                    const key = localStorage.key(i);
                                                    if (key?.startsWith("reported_cid_")) savedReports[key] = localStorage.getItem(key);
                                                }
                                                localStorage.clear();
                                                Object.keys(savedReports).forEach(k => localStorage.setItem(k, savedReports[k]));
                                                localStorage.setItem('postResetMessageShown', 'true');
                                                if ('serviceWorker' in navigator) {
                                                    navigator.serviceWorker.getRegistrations().then(r => r.forEach(reg => reg.unregister()));
                                                }
                                                screen.style.transition = 'opacity 1.4s';
                                                screen.style.opacity = '0';
                                                setTimeout(() => location.reload(), 1400);
                                            }, 2800);
                                        }, 1650);
                                    }, 400);
                                }, 420);
                            }, 1220);
                        }
                    }, 1000);
                };
            }, 4000);
        }
    );
};

exportBtn.onclick = () => {
    playSound('click');
    const playerName = document.getElementById('playerNameInput')?.value.trim() || '';

    const purePersonalCount = locations.filter(l =>
        l.userEdited === true && !l.wasCommunityKept && !l.isPostcard
    ).length;

    const keptCount = locations.filter(l =>
        l.wasCommunityKept === true && !l.isPostcard
    ).length;

    const withKeptCount = purePersonalCount + keptCount;

    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.style.display = 'block';
    modal.innerHTML = `
        <div class="modal-content" style="max-width:560px;">
            <span class="close">×</span>
            <h2 style="text-align:center; margin-bottom:18px;">Choose Backup Type</h2>
        
            <div style="max-width:460px; margin:0 auto; padding:0 10px;">
                <button id="backupPersonalOnly" style="width:100%; padding:18px 12px; margin:10px 0; background:#00ff00; color:#000; font-weight:bold; font-size:1.05em; line-height:1.45; border-radius:4px;">
                    PERSONAL MARKERS YOU CREATED ONLY<br>
                    <small style="opacity:0.9; font-size:0.93em;">${purePersonalCount} markers + Level ${level} + All Settings</small>
                </button>
                
                <button id="backupWithKept" style="width:100%; padding:18px 12px; margin:10px 0; background:#00d4ff; color:#000; font-weight:bold; font-size:1.05em; line-height:1.45; border-radius:4px;">
                    PERSONAL + KEPT COMMUNITY MARKERS<br>
                    <small style="opacity:0.9; font-size:0.93em;">${purePersonalCount} markers + ${keptCount} kept = ${withKeptCount} total + Level ${level} + All Settings</small>
                </button>
            </div>
         
            <p style="text-align:center; font-size:0.95em; opacity:0.9; line-height:1.5; margin:20px auto 0; max-width:460px;">
                Personal Only = clean backup (recommended)<br>
                With Kept = includes markers you decided to keep<br>
                Missing markers? Download the community map again if needed.
            </p>
        </div>
    `;
    document.body.appendChild(modal);
    document.body.classList.add('modal-open');

    modal.querySelector('.close').onclick = () => {
        modal.remove();
        document.body.classList.remove('modal-open');
        playSound('modalClose');
    };

    document.getElementById('backupPersonalOnly').onclick = () => {
        const playerMarkers = locations.filter(l => l.userEdited === true && !l.wasCommunityKept && !l.isPostcard);
        const data = {
            version: "personal-only",
            timestamp: new Date().toISOString(),
            playerName: playerName,
            locations: playerMarkers.map(l => ({
                ...l,
                userEdited: true,
                wasCommunityKept: false,
                isCommunity: false
            })),
            level,
            xp,
            customCategories,
            settings: {
                clusteringEnabled, gridEnabled, currentMap, darkMode,
                soundsEnabled, titleVisible, toolsVisible,
                activeCategories: [...activeCategories]
            }
        };
        downloadBackupFile(data, `FO76_PersonalOnly_Level_${level}`);
        modal.remove();
        document.body.classList.remove('modal-open');
    };

    document.getElementById('backupWithKept').onclick = () => {
        const playerMarkers = locations.filter(l => (l.userEdited || l.wasCommunityKept) && !l.isPostcard);
        const data = {
            version: "personal-plus-kept",
            timestamp: new Date().toISOString(),
            playerName: playerName,
            locations: playerMarkers.map(l => ({
                ...l,
                userEdited: l.userEdited,
                wasCommunityKept: l.wasCommunityKept,
                isCommunity: false
            })),
            level,
            xp,
            customCategories,
            settings: {
                clusteringEnabled, gridEnabled, currentMap, darkMode,
                soundsEnabled, titleVisible, toolsVisible,
                activeCategories: [...activeCategories]
            }
        };
        downloadBackupFile(data, `FO76_PersonalPlusKept_Level_${level}`);
        modal.remove();
        document.body.classList.remove('modal-open');
    };
};

function downloadBackupFile(data, filenamePrefix) {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `${filenamePrefix}_${new Date().toISOString().slice(0,10)}.json`;
    a.click();
    URL.revokeObjectURL(a.href);

    // Locked flash
    triggerEpicFlash("💾", "BACKUP COMPLETE",
        `${data.locations.length} marker${data.locations.length === 1 ? '' : 's'} saved!`,
        `Level ${level} + XP + All Settings`);
    playSound('saving');
}

importBtn.onclick = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = e => {
        const file = e.target.files[0];
        if (!file) return;
        const r = new FileReader();
        r.onload = ev => {
            try {
                const data = JSON.parse(ev.target.result);
                const incoming = data.locations || (Array.isArray(data) ? data : []);

                const isPersonalBackup = data.version && (
                    data.version.startsWith("personal") ||
                    file.name.includes("Personal") ||
                    file.name.includes("MyBackup") ||
                    file.name.includes("FullResetBackup") ||
                    file.name.includes("PersonalPlusKeptFullBackup")
                );

                const isPlusKeptBackup = data.version && data.version.includes("plus-kept");

                let added = 0, updated = 0, skipped = 0;

                // ── CAPTURE FULL PRE-IMPORT STATE FOR PERFECT UNDO ──
                const beforeFullState = {
                    locations: JSON.stringify(locations),
                    level: level,
                    xp: xp,
                    customCategories: JSON.stringify(customCategories),
                    playerName: document.getElementById('playerNameInput')?.value.trim() || '',
                    settings: {
                        clusteringEnabled,
                        gridEnabled,
                        currentMap,
                        darkMode,
                        soundsEnabled,
                        titleVisible,
                        toolsVisible,
                        activeCategories: [...activeCategories]
                    }
                };

                if (window.undoImportTimer) {
                    clearInterval(window.undoImportTimer);
                    window.undoImportTimer = null;
                }

                incoming.forEach(imp => {
                    let existing = null;
                    if (imp.id) existing = locations.find(l => l.id === imp.id);
                    if (!existing && imp.cid) existing = locations.find(l => l.cid === imp.cid);

                    if (existing) {
                        skipped++;
                        return;
                    }

                    if (isPersonalBackup) {
                        const newMarker = { ...imp };
                        if (isPlusKeptBackup) {
                            newMarker.userEdited = imp.userEdited ?? false;
                            newMarker.wasCommunityKept = imp.wasCommunityKept ?? false;
                            newMarker.isCommunity = false;
                        } else {
                            newMarker.userEdited = true;
                            newMarker.wasCommunityKept = false;
                            newMarker.isCommunity = false;
                        }
                        locations.push(newMarker);
                        added++;
                    } else {
                        locations.push(imp);
                        added++;
                    }
                });

                // ── PLAYER NAME RESTORE ──
                if (data.playerName !== undefined && data.playerName !== null) {
                    localStorage.setItem('fo76_playerName', data.playerName);
                    const nameInput = document.getElementById('playerNameInput');
                    if (nameInput) nameInput.value = data.playerName;
                }

                // ── SETTINGS RESTORATION ──
                if (isPersonalBackup && data.settings) {
                    const s = data.settings;
                    clusteringEnabled = s.clusteringEnabled !== undefined ? s.clusteringEnabled : clusteringEnabled;
                    gridEnabled = s.gridEnabled !== undefined ? s.gridEnabled : gridEnabled;
                    currentMap = s.currentMap || currentMap;
                    darkMode = s.darkMode !== undefined ? s.darkMode : darkMode;
                    soundsEnabled = s.soundsEnabled !== undefined ? s.soundsEnabled : soundsEnabled;
                    titleVisible = s.titleVisible !== undefined ? s.titleVisible : titleVisible;
                    toolsVisible = s.toolsVisible !== undefined ? s.toolsVisible : toolsVisible;
                    if (s.activeCategories && Array.isArray(s.activeCategories)) {
                        activeCategories = new Set(s.activeCategories);
                    }

                    document.body.classList.toggle('dark-mode', darkMode);
                    syncToggleButtonStates();
					syncInfoPanelToggle();

                    mainTitle.style.display = titleVisible ? 'block' : 'none';
                    titleToggleBtn.textContent = titleVisible ? '-' : '+';
                    buttonGroup.classList.toggle('hidden', !toolsVisible);
                    toolsToggleBtn.textContent = toolsVisible ? 'Hide Tools' : 'Show Tools';
                    renderCategoryToggles();
                }

                if (isPersonalBackup) {
    if (data.level !== undefined) level = data.level;
    if (data.xp !== undefined) xp = data.xp;
    if (data.customCategories) {
        customCategories = data.customCategories;
        rebuildCategoryData();
        applyCustomCategoryStyling();	
    }
}

                recalculateXP();
                saveLocations();
                forceReload();

                if (added + updated > 0) {
                    const count = added + updated;

                    // ── UNDO LAST IMPORT — now restores EVERYTHING ──
                    setTimeout(() => {
                        const undoBtn = document.getElementById('undoImportBtn');
                        if (undoBtn) {
                            undoBtn.style.display = 'inline-block';
                            let secondsLeft = 120;
                            const updateText = () => {
                                undoBtn.textContent = `UNDO LAST IMPORT (${count} markers) (${Math.floor(secondsLeft / 60)}:${(secondsLeft % 60).toString().padStart(2, '0')})`;
                            };
                            updateText();
                            window.undoImportTimer = setInterval(() => {
                                secondsLeft--;
                                if (secondsLeft <= 0) {
                                    clearInterval(window.undoImportTimer);
                                    window.undoImportTimer = null;
                                    undoBtn.style.display = 'none';
                                    localStorage.removeItem('fo76_pendingUndo_import');
                                } else updateText();
                            }, 1000);

                            undoBtn.onclick = () => {
                                clearInterval(window.undoImportTimer);
                                window.undoImportTimer = null;

                                // ── RESTORE FULL STATE ──
                                const state = beforeFullState;
                                locations = JSON.parse(state.locations);
                                level = state.level;
                                xp = state.xp;
                                customCategories = JSON.parse(state.customCategories);

                                const nameInput = document.getElementById('playerNameInput');
                                if (nameInput) nameInput.value = state.playerName;
                                localStorage.setItem('fo76_playerName', state.playerName);

                                const s = state.settings;
                                clusteringEnabled = s.clusteringEnabled;
                                gridEnabled = s.gridEnabled;
                                currentMap = s.currentMap;
                                darkMode = s.darkMode;
                                soundsEnabled = s.soundsEnabled;
                                titleVisible = s.titleVisible;
                                toolsVisible = s.toolsVisible;
                                activeCategories = new Set(s.activeCategories);

                                document.body.classList.toggle('dark-mode', darkMode);
                                syncToggleButtonStates();
								syncInfoPanelToggle();

                                mainTitle.style.display = titleVisible ? 'block' : 'none';
                                titleToggleBtn.textContent = titleVisible ? '-' : '+';
                                buttonGroup.classList.toggle('hidden', !toolsVisible);
                                toolsToggleBtn.textContent = toolsVisible ? 'Hide Tools' : 'Show Tools';
                                renderCategoryToggles();
								applyCustomCategoryStyling();

                                recalculateXP();
                                saveLocations();
                                forceReload();

                                undoBtn.style.display = 'none';
                                localStorage.removeItem('fo76_pendingUndo_import');
                                showTempMessage('✅ IMPORT FULLY UNDONE — ALL SETTINGS RESTORED', 4000);
                                playSound('undo');
                            };
                        }
                    }, 400);
                }

                showConfirmModal(
                    '💾 IMPORT COMPLETED 💾',
                    `<div style="text-align:left;line-height:1.9;font-size:1.1em;">
                        <strong style="color:#00ff88;">${added + updated} marker${(added + updated) === 1 ? '' : 's'} processed successfully</strong><br>
                        ${skipped > 0 ? `Skipped: <strong style="color:#ffa500;">${skipped}</strong> (already present on map)<br>` : ''}
                        <br>
                        <strong style="color:#88ff88;">XP • Level • All Settings restored successfully</strong>
                    </div>`,
                    null
                );

                triggerEpicFlash("🧬", "IMPORT COMPLETE",
                    `${added + updated} marker${(added + updated) === 1 ? '' : 's'} loaded!`,
                    skipped > 0 ? `${skipped} markers skipped (already present)` : "Settings & progress restored");
                playSound('saving');

            } catch (err) {
                console.error("Import failed:", err);
                showTempMessage('❌ INVALID FILE OR CORRUPTED BACKUP', 5000);
                playSound('error');
            }
        };
        r.readAsText(file);
    };
    input.click();
};

// ── COMMUNITY UPDATE ──
downloadCommunityBtn.onclick = () => {
    playSound('click');
    showConfirmModal(
    '🚀UPDATE COMMUNITY MAP🚀',
`<strong style="display:block; text-align:left !important;">Your personal markers & edits are 100% SAFE</strong><br><br>
This will fetch the latest verified community markers.<br><br>
• Community markers may receive description & category improvements<br>
• Your created and kept markers will never be changed or deleted<br>
• Removed community markers will be cleaned up automatically<br>
• Approved submissions will convert to community markers you can keep<br><br>
<strong style="display:block; text-align:left !important;">Proceed with the update?</strong>`,
    async () => {
        downloadCommunityBtn.disabled = true;
        downloadCommunityBtn.textContent = 'Updating...';

        try {
            const res = await fetchWithTimeout(
                'https://0mrcrazy0.github.io/fallout76-itemfindermap/communitymap.json?t=' + Date.now(),
                12000
            );
            if (!res.ok) throw new Error('Bad response');

            const data = await res.json();
            const incoming = data.locations || [];

            let added = 0, refreshed = 0, skipped = 0, cleaned = 0;
            let approvedCount = 0;
            let updateAvailableCount = 0;

            const incomingIds = new Set(incoming.map(m => m.id));
            const userMarkersBefore = locations.filter(l =>
                (l.userEdited === true || l.wasCommunityKept === true) &&
                !l.isCommunity && !l.isPostcard
            ).length;

            incoming.forEach(imp => {
                const existing = locations.find(l => l.id === imp.id);

                // ── APPROVAL HANDLING ──
                let isApprovedSubmission = false;
                if (existing && hasBeenSubmitted(imp.id)) {
                    let submitted = JSON.parse(localStorage.getItem('submitted_ids') || '[]');
                    const idx = submitted.indexOf(imp.id);
                    if (idx !== -1) {
                        submitted.splice(idx, 1);
                        localStorage.setItem('submitted_ids', JSON.stringify(submitted));
                    }
                    isApprovedSubmission = true;
                    approvedCount++;
                }

                // ── SKIP NON-APPROVED USER MARKERS ──
                if (existing && (existing.userEdited || existing.wasCommunityKept) && !isApprovedSubmission) {
                    skipped++;
                    return;
                }

                // ── AUTO-REGISTER CUSTOM CATEGORIES ──
                if (imp.category && !defaultCategoryIcons[imp.category] && !customCategories[imp.category]) {
                    customCategories[imp.category] = imp.icon || '📦';
                    categoryIcons[imp.category] = imp.icon || '📦';
                    categoryColors[imp.category] = '#002F00';
                    activeCategories.add(imp.category);
                }

                // ── IMPORT / UPDATE LOGIC ──
                let loc;
                if (existing) {
                    Object.assign(existing, imp);
                    loc = existing;
                    refreshed++;
                } else {
                    loc = { ...imp, addedTime: Date.now(), locked: true, isCommunity: true, isTemp: false, isPostcard: false, userEdited: false, wasCommunityKept: false };
                    locations.push(loc);
                    added++;
                }

                loc.isCommunity = true;
                loc.locked = true;
                loc.userEdited = false;
                loc.wasCommunityKept = !!existing?.wasCommunityKept;

                if (isApprovedSubmission) {
                    loc.approvedSubmission = true;
                    showTempMessage(`🤩 Your marker "${(imp.desc || '').substring(0,35)}${(imp.desc || '').length > 35 ? '...' : ''}" was APPROVED! You Keep The Created 100XP`, 10000);
                    playSound('levelUp');
                }
            });

            // Approved markers now count as new markers
            added += approvedCount;

            // Cleanup removed community markers
            for (let i = locations.length - 1; i >= 0; i--) {
                if (locations[i].isCommunity && !incomingIds.has(locations[i].id)) {
                    locations.splice(i, 1);
                    cleaned++;
                }
            }

            // Update available for kept markers
            const incomingByCid = new Map(incoming.map(m => [m.cid, m]));
            locations.forEach(loc => {
                if (!loc.wasCommunityKept || loc.isPostcard) return;
                const communityVersion = incomingByCid.get(loc.cid);
                if (!communityVersion || 
                    communityVersion.desc !== loc.desc ||
                    communityVersion.category !== loc.category ||
                    Math.abs(communityVersion.lat - loc.lat) > 0.0001 ||
                    Math.abs(communityVersion.lng - loc.lng) > 0.0001) {
                    loc.communityUpdateAvailable = true;
                    updateAvailableCount++;
                } else if (loc.communityUpdateAvailable) {
                    delete loc.communityUpdateAvailable;
                }
            });

            // Save everything
            localStorage.setItem(CUSTOM_CATEGORIES_KEY, JSON.stringify(customCategories));
            localStorage.setItem('activeCategories', JSON.stringify([...activeCategories]));
            const newVersion = String(data.communityVersion || "1.0");
            localStorage.setItem(MAP_VERSION_KEY, newVersion);
            communityVersion = newVersion;

            recalculateXP();
            updateCounterDisplay();
            forceReload();
            saveLocations();

            // Clear search bar
            combinedSearch.value = '';
            clearBtn.style.display = 'none';
            const currentCat = categoryFilter.value || '';
            loadData('', currentCat);
            refreshTable('', currentCat);
            if (categoryFilter) categoryFilter.value = currentCategoryFilter || '';

            // ── SUCCESS MODAL (exactly what you asked for) ──
            showConfirmModal(
                '☢ COMMUNITY MAP UPDATED ☢',
                `<strong style="color:#00ff88;">${added}</strong> - new markers added<br>
<strong style="color:#88ccff;">${refreshed}</strong> - community markers refreshed<br>
<strong style="color:#ffa500;">${skipped}</strong> - kept/edited markers protected<br>
<strong style="color:#ffcc00;">${userMarkersBefore - approvedCount}</strong> - personal markers untouched<br>
${cleaned > 0 ? `<strong style="color:#ff4444;">${cleaned}</strong> - deleted community markers removed<br>` : ''}
${approvedCount > 0 ? `<strong style="color:#00ff88;">${approvedCount}</strong> - of your submissions approved & converted to community markers!<br>` : ''}
${updateAvailableCount > 0 ? `<strong style="color:#0066ff;">${updateAvailableCount}</strong> of your kept markers have newer versions available!<br>` : ''}
<strong style="color:#00ff00;">Total markers on map: ${locations.length}</strong><br><br>
• You kept <strong style="color:#88ccff;">${skipped}</strong> community marker${skipped === 1 ? '' : 's'}<br>
• You logged <strong style="color:#88ccff;">${userMarkersBefore - approvedCount}</strong> personal marker${(userMarkersBefore - approvedCount) === 1 ? '' : 's'}<br>
• You are Level <strong style="color:#00ff88;">${level}</strong> explorer<br><br>
<strong>Community Map v${newVersion} loaded — happy exploring Appalachia!</strong>`,
                null
            );

            playSound('saving');

                // ── COMMUNITY MAP CELEBRATION NUKE ──
                if (added > 30 && localStorage.getItem('seenCommunityNuke') !== 'true') {
                    localStorage.setItem('seenCommunityNuke', 'true');
                    setTimeout(() => {
                        lockUIDuringAnimation(11000);
                        const overlay = document.createElement('div');
                        overlay.style.cssText = `
                            position:fixed;top:0;left:0;width:100vw;height:100vh;
                            background:#000;z-index:9999999;display:flex;
                            align-items:center;justify-content:center;flex-direction:column;
                            gap:30px;font-family:'Courier New',monospace;color:#0f0;
                            pointer-events:none;
                        `;
                        overlay.innerHTML = `
                            <div id="rocketLaunch" style="font-size:clamp(80px,25vw,220px);">🚀</div>
                            <h1 class="wipe-nuke-title">COMMUNITY MAP UPDATED</h1>
                            <p class="nuke-subtitle" style="font-size:clamp(18px,5vw,36px);">New markers incoming...</p>
                        `;
                        document.body.appendChild(overlay);
                        const style = document.createElement('style');
                        style.textContent = `
                            @keyframes rocketLaunch { 0% { transform: translateY(80px) scale(0.8); opacity: 0; } 30% { transform: translateY(-40px) scale(1.1); opacity: 1; } 70% { transform: translateY(-180px) scale(1); } 100% { transform: translateY(-300px) scale(0.6); opacity: 0; } }
                            @keyframes rocketFall { 0% { transform: translateY(-420px) scale(0.5); opacity: 0; } 40% { transform: translateY(-60px) scale(1.2); opacity: 1; } 75% { transform: translateY(160px) scale(1.45); } 100% { transform: translateY(280px) scale(1.65); } }
                            @keyframes groundImpact { 0%,100% { transform: translateY(280px) scale(1.65); } 25% { transform: translateY(305px) scale(1.9); } 55% { transform: translateY(265px) scale(1.5); } }
                            @keyframes explosionPulse { 0% { transform: scale(1); opacity:1; } 40% { transform: scale(4.2); opacity:0.95; } 70% { transform: scale(2.8); opacity:1; } 100% { transform: scale(4.5); opacity:0; } }
                            @keyframes fadeOut { 0% { opacity: 1; } 100% { opacity: 0; } }
                        `;
                        document.head.appendChild(style);
                        const rocket = document.getElementById('rocketLaunch');
                        const title = overlay.querySelector('h1');
                        const subtitle = overlay.querySelector('p');
                        rocket.style.animation = 'rocketLaunch 1.8s ease-out forwards';
                        setTimeout(() => {
                            title.style.animation = 'fadeOut 0.8s ease-out forwards';
                            subtitle.style.animation = 'fadeOut 0.8s ease-out forwards';
                            setTimeout(() => {
                                title.remove();
                                subtitle.remove();
                            }, 800);
                            rocket.remove();
                            overlay.innerHTML += `<div id="fallingRocket" style="font-size:clamp(140px,38vw,460px);color:#ff0;text-shadow:0 0 80px #ff0;">🚀</div>`;
                            const fallingRocket = document.getElementById('fallingRocket');
                            fallingRocket.style.animation = 'rocketFall 1.2s cubic-bezier(0.42,0,1,1) forwards';
                            setTimeout(() => {
                                fallingRocket.style.animation = 'groundImpact 0.45s ease-out forwards';
                                setTimeout(() => {
                                    fallingRocket.remove();
                                    const flash = document.createElement('div');
                                    flash.style.cssText = `
                                        position:fixed;top:0;left:0;width:100vw;height:100vh;
                                        background:#fff;z-index:99999999;pointer-events:none;
                                        animation:quickFlash 1.8s ease-out forwards;
                                    `;
                                    document.body.appendChild(flash);
                                    setTimeout(() => {
                                        flash.remove();
                                        const explosionContainer = document.createElement('div');
                                        explosionContainer.style.cssText = `
                                            position:absolute; top:50%; left:50%; transform:translate(-50%, -50%);
                                            width:100%; height:100%; display:flex; align-items:center; justify-content:center;
                                            pointer-events:none; z-index:99999999;
                                        `;
                                        overlay.appendChild(explosionContainer);
                                        const explosions = ['💥','💥','💥','💥','💥','💥','💥'];
                                        explosions.forEach((emoji, i) => {
                                            const boom = document.createElement('div');
                                            boom.style.cssText = `
                                                position:absolute; font-size:clamp(160px,42vw,520px);
                                                animation:explosionPulse 1.3s ease-out forwards; opacity:0;
                                                text-shadow:0 0 60px #ffaa00;
                                            `;
                                            boom.textContent = emoji;
                                            explosionContainer.appendChild(boom);
                                            setTimeout(() => { boom.style.opacity = '1'; }, i * 65);
                                        });
                                        setTimeout(() => {
                                            explosionContainer.remove();
                                            overlay.innerHTML = `
                                                <div style="font-size:clamp(130px,32vw,250px);color:#ff0;text-shadow:0 0 90px #ff0;margin-bottom:15px;">☢️</div>
                                                <h1 class="wipe-nuke-title" style="font-size:clamp(36px,8vw,72px);text-align:center;margin:8px 0 18px 0;">COMMUNITY MAP NUKED!</h1>
                                                <p class="nuke-subtitle" style="font-size:clamp(20px,5vw,42px);text-align:center;max-width:94%;line-height:1.35;">
                                                    <strong>${added}</strong> new markers detonated across Appalachia!
                                                </p>
                                            `;
                                            playSound('levelUp');
                                            setTimeout(() => {
                                                overlay.style.transition = 'opacity 1.4s';
                                                overlay.style.opacity = '0';
                                                setTimeout(() => overlay.remove(), 1400);
                                            }, 2800);
                                        }, 1650);
                                    }, 400);
                                }, 420);
                            }, 1220);
                        }, 1900);
                    }, 800);
                }
                localStorage.setItem(LAST_COMMUNITY_VERSION_KEY, newVersion);
                downloadCommunityBtn.classList.remove('update-available');
            } catch (err) {
                console.error('Fetch error:', err);
                showTempMessage('❌ COMMUNITY UPDATE FAILED — CHECK CONNECTION', 6000);
                playSound('error');
            } finally {
                downloadCommunityBtn.disabled = false;
                downloadCommunityBtn.textContent = 'Update Community Map';
                downloadCommunityBtn.classList.remove('available');
            }
        },
        'Yes — Update Now',
        'Cancel'
    );
};

    // ── REAL-TIME COMMUNITY UPDATE CHECK ──
    // Checks every 3 minutes while the page is visible — no page refresh occurs
    async function checkForCommunityUpdate() {
    try {
        const response = await fetch(
            'https://0mrcrazy0.github.io/fallout76-itemfindermap/communitymap.json?v=' + Date.now(),
            { cache: 'no-store' }
        );
        if (!response.ok) return;

        const data = await response.json();
        const remoteVersion = String(data.communityVersion || data.version || "1.0");
        const storedVersion = localStorage.getItem(MAP_VERSION_KEY) || "1.0";

        // Update the global latest version so the banner shows correct numbers
        latestCommunityVersion = remoteVersion;

        if (remoteVersion !== storedVersion) {
            downloadCommunityBtn.classList.add('available');
            downloadCommunityBtn.textContent = 'Update Community Map (Available!)';
            showUpdateNotice();
        } else {
            downloadCommunityBtn.classList.remove('available');
            downloadCommunityBtn.textContent = 'Update Community Map';
        }
    } catch (err) {
        console.warn('Community version check failed:', err);
        downloadCommunityBtn.classList.remove('available');
        downloadCommunityBtn.textContent = 'Update Community Map';
    }
}

    // Run immediately and every 3 minutes (balanced interval)
    checkForCommunityUpdate();
    setInterval(() => {
        if (document.visibilityState === 'visible') {
            checkForCommunityUpdate();
        }
    }, 180000);

function createPermanentShare(markersToShare) {
    if (markersToShare.length === 0) return;
    const shareData = { version: 1.0, locations: markersToShare };
    const jsonString = JSON.stringify(shareData);
    const encoded = utf8ToBase64(jsonString)
                    .replace(/\+/g, '-')
                    .replace(/\//g, '_')
                    .replace(/=+$/, '');

    const base = window.location.href.split('?')[0].split('#')[0];
    const shareUrl = base + '?permshare=' + encoded;

navigator.clipboard.writeText(shareUrl).then(() => {
        showTempMessage('🔗 MARKER LINK COPIED — SEND TO A FRIEND', 6000);
        setTimeout(() => {
            playSound('postcard');
        }, 150);
    }).catch(() => {
        prompt('Copy this link (works everywhere):', shareUrl);
    });
}
document.getElementById('shareOneBtn').onclick = () => {
    if (currentIndex < 0) return;
    const loc = locations[currentIndex];

    // Force re-lock before sharing
    loc.locked = true;
    loc.addedTime = Date.now();
    saveLocations();
	forceReload();

    createPermanentShare([loc]);
    closeModal(itemModal);
};
        saveJpegBtn.onclick = () => {
            playSound('saving');
            html2canvas(document.getElementById('map'), {
    useCORS: true,
    scale: window.devicePixelRatio > 2 ? 2 : window.devicePixelRatio || 1.5
}).then(canvas => {
                const a = document.createElement('a');
                a.href = canvas.toDataURL('image/jpeg', 0.9);
                a.download = `fo76_map_${new Date().toISOString().slice(0,10)}.jpg`;
                a.click();
                showTempMessage('📸 MAP SAVED TO DOWNLOADS! ✅', 4000);
            });
        };
        prevPageBtn.onclick = () => {
            if (tablePage > 1) {
                tablePage--;
                localStorage.setItem('tablePage', tablePage);
                refreshTable(combinedSearch.value, categoryFilter.value);
                playSound('click');
            }
        };
        nextPageBtn.onclick = () => {
            const max = Math.ceil(locations.filter(l => activeCategories.has(l.category)).length / pageSize);
            if (tablePage < max) {
                tablePage++;
                localStorage.setItem('tablePage', tablePage);
                refreshTable(combinedSearch.value, categoryFilter.value);
                playSound('click');
            }
        };
        toggleSoundsBtn.onclick = () => {
            soundsEnabled = !soundsEnabled;
            localStorage.setItem('soundsEnabled', soundsEnabled);
            toggleSoundsBtn.textContent = soundsEnabled ? 'Sounds: On' : 'Sounds: Off';
            playSound('click');
        };
        toggleClusterBtn.onclick = () => {
            clusteringEnabled = !clusteringEnabled;
            localStorage.setItem('clusteringEnabled', clusteringEnabled);
            toggleClusterBtn.textContent = `Clustering: ${clusteringEnabled ? 'On' : 'Off'}`;

            // Clear search bar when toggling clustering (prevents flash)
            combinedSearch.value = '';
            clearBtn.style.display = 'none';
            const currentCat = categoryFilter.value || '';

            forceReload();
            loadData('', currentCat);
            refreshTable('', currentCat);
            playSound('click');
        };
                toggleMapBtn.onclick = () => {
            currentMap = currentMap === 'named' ? 'noName' : 'named';
            localStorage.setItem('currentMap', currentMap);
            toggleMapBtn.textContent = currentMap === 'named' ? 'Show No-Name Map' : 'Show Named Map';
            map.removeLayer(imageOverlay);
            imageOverlay = L.imageOverlay(mapUrls[currentMap], imageBounds).addTo(map);
            playSound('saving');
        };
        function initMapToggleButton() {
            if (toggleMapBtn) {
                toggleMapBtn.textContent = currentMap === 'named' ? 'Show No-Name Map' : 'Show Named Map';
            }
        }
        document.addEventListener('DOMContentLoaded', initMapToggleButton);
        initMapToggleButton();
        toggleGridBtn.onclick = () => {
            gridEnabled = !gridEnabled;
            localStorage.setItem('gridEnabled', gridEnabled);
            toggleGridBtn.textContent = `Grid: ${gridEnabled ? 'On' : 'Off'}`;
            drawGrid();
            playSound('click');
        };
        toggleCategoryModalBtn.onclick = () => {
    categoryToggleModal.style.display = 'block';
    document.body.classList.add('modal-open');
    renderCategoryToggles();
  
    const closeBtn = document.getElementById('closeCategoryToggleBtn');
    if (closeBtn) {
        closeBtn.onclick = () => {
            categoryToggleModal.style.display = 'none';
            document.body.classList.remove('modal-open');
            playSound('modalClose');
        };
    }
  
    playSound('click');
};
        document.getElementById('selectAllBtn').onclick = () => {
            activeCategories = new Set(Object.keys(categoryIcons));
            localStorage.setItem('activeCategories', JSON.stringify([...activeCategories]));
            renderCategoryToggles();
            forceReload();
            playSound('click');
        };
        document.getElementById('deselectAllBtn').onclick = () => {
            activeCategories = new Set();
            localStorage.setItem('activeCategories', '[]');
            renderCategoryToggles();
            forceReload();
            playSound('click');
        };
        document.getElementById('createCategoryBtn').onclick = () => {
            document.getElementById('createCategoryModal').style.display = 'block';
            playSound('click');
        };
        document.getElementById('deleteCategoryBtn').onclick = () => {
    const sel = document.getElementById('deleteCategorySelect');

    const userOnlyCategories = Object.keys(customCategories).filter(cat => {
        const hasCommunityMarker = locations.some(l => 
            l.category === cat && l.isCommunity === true
        );
        return !hasCommunityMarker && !defaultCategoryIcons[cat];
    }).sort();

    sel.innerHTML = '<option value="">Select custom</option>' +
        userOnlyCategories.map(n => 
            `<option value="${n}">${n} ${customCategories[n]}</option>`
        ).join('');

    document.getElementById('deleteCategoryModal').style.display = 'block';
    playSound('click');
};
        document.getElementById('saveCategoryBtn').onclick = () => {
            const name = document.getElementById('newCategoryName').value.trim();
            const emoji = document.getElementById('newCategoryEmoji').value.trim();
            if (!name || !emoji || !isValidEmoji(emoji) || defaultCategoryIcons[name]) {
                showTempMessage('❌ INVALID NAME OR EMOJI!', 4000);
                return;
            }
            customCategories[name] = emoji;
            categoryIcons[name] = emoji;
            categoryColors[name] = '#002F00';
            activeCategories.add(name);
            localStorage.setItem(CUSTOM_CATEGORIES_KEY, JSON.stringify(customCategories));
            localStorage.setItem('activeCategories', JSON.stringify([...activeCategories]));
            updateCategoryDropdowns();
            renderCategoryToggles();
            closeModal(document.getElementById('createCategoryModal'));
            showTempMessage('✅ CATEGORY CREATED!', 3000);
            playSound('saving');
        };
        document.getElementById('confirmDeleteCategoryBtn').onclick = () => {
    const name = document.getElementById('deleteCategorySelect').value;
    if (!name || !customCategories[name]) return;
    showConfirmModal(
        `DELETE CATEGORY "${name.toUpperCase()}"`,
        `All markers will be moved to "misc".<br><br>This cannot be undone.<br><br>Proceed with deletion?`,
        () => {
    locations.forEach(l => { 
        if (l.category === name) {
            l.category = 'misc';
            l.icon = '📝';                    // ← Reset to default misc icon
        }
    });
    delete customCategories[name];
    delete categoryIcons[name];
    delete categoryColors[name];
    activeCategories.delete(name);

    localStorage.setItem(CUSTOM_CATEGORIES_KEY, JSON.stringify(customCategories));
    localStorage.setItem('activeCategories', JSON.stringify([...activeCategories]));
    saveLocations();
    forceReload();
    closeModal(document.getElementById('deleteCategoryModal'));
    showTempMessage(`🚨 CATEGORY "${name}" DELETED → MARKERS REASSIGNED TO MISC! 📝`, 5000);
    playSound('delete');
}
    );
};
saveItemBtn.onclick = () => {
    const cat = itemCategorySelect.value;
    let desc = itemDescInput.value.trim();
    const isNew = currentIndex < 0;
    let lat, lng;
    if (isNew) {
        if (tempLatLng && typeof tempLatLng.lat === 'number' && typeof tempLatLng.lng === 'number') {
            lat = tempLatLng.lat;
            lng = tempLatLng.lng;
        } else {
            showTempMessage('🚨 NO LOCATION SELECTED! RIGHT-CLICK OR LONG-PRESS MAP FIRST', 4000);
            playSound('error');
            return;
        }
    } else {
        const loc = locations[currentIndex];
        if (!loc || typeof loc.lat !== 'number' || typeof loc.lng !== 'number') {
            showTempMessage('❌ INVALID LOCATION DATA!', 4000);
            playSound('error');
            return;
        }
        lat = loc.lat;
        lng = loc.lng;
    }
    if (!desc) {
        const grid = getGridFromLatLng(lat, lng);
        const x = Math.round(lng);
        const y = Math.round(lat);
        desc = grid ? `Grid ${grid} (X: ${x}, Y: ${y})` : `X: ${x}, Y: ${y}`;
        itemDescInput.value = desc;
    } else {
        desc = updateDescWithGrid(desc, lat, lng);
    }
    if (currentIndex >= 0) {
        const loc = locations[currentIndex];
        if (loc.locked) {
            showTempMessage('🔓 UNLOCK FIRST!', 4000);
            playSound('error');
            return;
        }
        loc.category = cat;
        loc.desc = desc;
        loc.icon = categoryIcons[cat] || '📝';
        loc.addedTime = Date.now();
        loc.userEdited = true;
        loc.locked = true;
        loc.cid = loc.cid || generateCid(loc);
    } else {
        const newLoc = createNewLocation(lat, lng, cat, desc);
        newLoc.locked = true;
        locations.push(newLoc);
        recalculateXP();
        window.justCreatedMarkerId = newLoc.id;
    }
    closeModal(itemModal, true);
    saveLocations();
	createCreationBurst(tempLatLng);
    // Delayed sound to bypass the 80 ms debounce from modalClose
    setTimeout(() => {
        playSound('saving');
    }, 120);
    showTempMessage(`✅ MARKER SAVED & LOCKED 🔒 — +100 XP (LEVEL ${level})`, 5000);
    forceReload();
    if (window.justCreatedMarkerId) {
        setTimeout(() => {
            const marker = [...clusteredMarkers.getLayers(), ...nonClusteredMarkers.getLayers()]
                .find(m => m.options && m.options.id === window.justCreatedMarkerId);
            if (marker) {
                marker.openPopup();
                window.justCreatedMarkerId = null;
            }
        }, 750);
    }
    const submitBtn = document.getElementById('submitCommunityBtn');
    if (submitBtn) {
        submitBtn.style.display =
            (currentIndex >= 0 && locations[currentIndex]?.locked && !locations[currentIndex]?.isCommunity)
            ? 'inline-block'
            : 'none';
    }
};

  // Delete button – with confirmation
deleteBtn.onclick = () => {
    if (currentIndex < 0) return;
    const loc = locations[currentIndex];
    if (loc.locked) {
        showTempMessage('🔓 UNLOCK FIRST!', 4000);
        playSound('error');
        return;
    }
    
    playSound('click');
    showConfirmModal(
        '☢ CONFIRM DELETION ☢',
        `Are you sure you want to permanently delete this marker?<br><br>
         <strong>Description:</strong> ${escapeHtml(loc.desc || '(no description)')}<br>
         <strong>Category:</strong> ${loc.category}<br>
         <strong>Grid:</strong> ${getGridFromLatLng(loc.lat, loc.lng) || 'Unknown'}<br><br>
         This action can be undone for 2 minutes using the "Undo Last Delete" button in the Tools panel.`,
        () => {
            lastDeleted = { ...loc };
            locations.splice(currentIndex, 1);
            recalculateXP();
			setTimeout(() => playSound('delete'), 180);
            closeModal(itemModal, true);
            saveLocations();
            forceReload();
            
                        // Show the new tools-panel undo button
            const undoDeleteBtn = document.getElementById('undoDeleteBtn');
            if (undoDeleteBtn) {
                undoDeleteBtn.style.display = 'inline-block';
                savePendingUndo('delete', JSON.stringify(locations), { lastDeleted: { ...loc } });
                showUndoDeleteButton();
            }
            showTempMessage('🧼️ MARKER DELETED — UNDO AVAILABLE (2 MINUTES)', 5000);
        },
        'Yes — Delete It',
        'Cancel'
    );
};

// Undo Last Delete (now in Tools panel)
let undoDeleteTimer = null;
function showUndoDeleteButton() {
    const btn = document.getElementById('undoDeleteBtn');
    if (!btn) return;
    let secondsLeft = 120;
    const updateText = () => {
        btn.textContent = `UNDO LAST DELETE (${Math.floor(secondsLeft / 60)}:${(secondsLeft % 60).toString().padStart(2, '0')})`;
    };
    updateText();
    if (undoDeleteTimer) clearInterval(undoDeleteTimer);
    undoDeleteTimer = setInterval(() => {
        secondsLeft--;
        if (secondsLeft <= 0) {
            clearInterval(undoDeleteTimer);
            btn.style.display = 'none';
        } else updateText();
    }, 1000);

    btn.onclick = () => {
        clearInterval(undoDeleteTimer);
        if (lastDeleted) {
            locations.push({ ...lastDeleted });
            recalculateXP();
            saveLocations();
            forceReload();
            showTempMessage('✅ MARKER RESTORED', 3000);
            playSound('undo');
            lastDeleted = null;
        }
        btn.style.display = 'none';
    };
}

exportOneBtn.onclick = () => {
    const loc = locations[currentIndex];
    if (!loc) return;

    // Force re-lock before export
    loc.locked = true;
    loc.addedTime = Date.now();
    saveLocations();
	forceReload();

    const cleanLoc = {
        ...loc,
        userEdited: true,
        wasCommunityKept: false,
        isCommunity: false,
        locked: true
    };

    const blob = new Blob([JSON.stringify([cleanLoc], null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `fo76_marker_${getGridFromLatLng(loc.lat, loc.lng) || 'unknown'}_${new Date().toISOString().slice(0,10)}.json`;
    a.click();
    URL.revokeObjectURL(a.href);

    triggerEpicFlash("📤", "MARKER EXPORTED SUCCESSFULLY", 
        `Grid ${getGridFromLatLng(loc.lat, loc.lng) || 'Unknown'}`, 
        "Saved to your Downloads folder");

    playSound('saving');
    closeModal(itemModal);
};

// ── SUBMIT TO COMMUNITY MAP — forces normal browser tab even from installed PWA ──
document.getElementById('submitCommunityBtn').onclick = () => {
    window.exitFullscreenThenDo(() => {
        const loc = locations[currentIndex];
        if (!loc?.locked) {
            showTempMessage('🔒 LOCK THE MARKER FIRST', 5000);
            playSound('error');
            return;
        }
        const playerName = document.getElementById('playerNameInput')?.value.trim() || 'Anonymous Wastelander';
        const finalDesc = loc.desc.includes('Submitted By') ? loc.desc : `${loc.desc}\nSubmitted By ${playerName}`;
        const iconToSend = categoryIcons[loc.category] || '📝';
        const cid = loc.cid || generateCid(loc);

        const grid = typeof getGridFromLatLng === 'function'
            ? getGridFromLatLng(loc.lat, loc.lng) || ''
            : '';

        const params = new URLSearchParams({
            lat: loc.lat,
            lng: loc.lng,
            category: loc.category,
            desc: finalDesc,
            icon: iconToSend,
            id: loc.id,
            cid: cid,
            grid: grid,
            wasCommunityKept: loc.wasCommunityKept ? 'true' : 'false'
        });

        // This line forces normal tab behaviour even when launched from installed PWA
        const url = `https://0mrcrazy0.github.io/fallout76-itemfindermap/submit.html?v=${Date.now()}&${params.toString()}`;
        window.open(url, '_blank', 'noopener,noreferrer');

        closeModal(itemModal);
        forceReload();
    });
};
    map.on('dragstart', () => { isDraggingAny = true; });
    map.on('dragend', () => { setTimeout(() => { isDraggingAny = false; }, 400); });
    map.on('movestart', () => { isDraggingAny = true; });
    map.on('moveend', () => { setTimeout(() => { isDraggingAny = false; }, 400); });
    const coordHoverControl = L.control({ position: 'bottomleft' });
    coordHoverControl.onAdd = function() {
        const div = L.DomUtil.create('div', 'coord-hover');
        div.innerHTML = '';
        return div;
    };
    coordHoverControl.addTo(map);
    const hoverCoordsHandler = (e) => {
        if (isDraggingAny) return;
        let lat, lng;
        if (e.touches) {
            const touch = e.touches[0];
            lat = map.mouseEventToLatLng({ clientX: touch.clientX, clientY: touch.clientY }).lat;
            lng = map.mouseEventToLatLng({ clientX: touch.clientX, clientY: touch.clientY }).lng;
        } else {
            lat = e.latlng.lat;
            lng = e.latlng.lng;
        }
        const grid = getGridFromLatLng(lat, lng);
        const x = Math.round(lng);
        const y = Math.round(lat);
        coordHoverControl.getContainer().innerHTML = `Grid: ${grid || 'N/A'} (X: ${x}, Y: ${y})`;
        coordHoverControl.getContainer().classList.add('show');
    };
    map.on('mousemove', hoverCoordsHandler);
    map.on('touchmove', hoverCoordsHandler);
    map.getContainer().addEventListener('mouseleave', () => {
        coordHoverControl.getContainer().classList.remove('show');
    });
    // ── MAP CLICK HANDLER — Preserve search filter when tapping map/markers ──
map.on('click', e => {
    if (isDraggingAny) {
        isDraggingAny = false;
        return;
    }

    // Allow normal popup behaviour on markers / spiderfied clusters
    const clickedOnSpiderfied = e.originalEvent?.target?.closest('.leaflet-marker-icon');
    if (clickedOnSpiderfied) return;

    // Pass current search text so filtered results remain visible
    loadData(combinedSearch.value || '', categoryFilter.value || '');
});
        updateCategoryDropdowns();
        renderCategoryToggles();
        loadData(currentSearch, currentCategoryFilter);
        drawGrid();
        updateXPBar();
		restorePendingUndo();
syncToggleButtonStates();
syncInfoPanelToggle();

if (!localStorage.getItem('seenCommunityHint')) {
    const showHintAfterWelcome = () => {
        setTimeout(() => {
            showTempMessage('👋 Tip: Click “Update Community Map” for the latest public markers! 📡', 20000);
            localStorage.setItem('seenCommunityHint', 'true');
        }, 10000);
    };

    if (localStorage.getItem('fo76_welcome_accepted')) {
        showHintAfterWelcome();
    } else {
        // Wait for player to click "ENTER THE WASTELAND"
        const observer = new MutationObserver((mutations, obs) => {
            if (!document.getElementById('welcomeModal')) {
                obs.disconnect();
                showHintAfterWelcome();
            }
        });
        observer.observe(document.body, { childList: true, subtree: true });
    }
}

        setTimeout(() => document.body.classList.add('map-ready'), 1000);

        toggleDarkModeBtn.onclick = () => {
            darkMode = !darkMode;
            document.body.classList.toggle('dark-mode', darkMode);
            localStorage.setItem('darkMode', darkMode ? 'true' : 'false');
            toggleDarkModeBtn.textContent = darkMode ? 'Dark mode: On' : 'Dark mode: Off';
            resetAppBtn.style.color = '#000';
            playSound('click');
        };
function syncToggleButtonStates() {
            toggleClusterBtn.textContent = clusteringEnabled 
                ? 'Clustering: On' 
                : 'Clustering: Off';

            toggleGridBtn.textContent = gridEnabled 
                ? 'Grid: On' 
                : 'Grid: Off';

            toggleDarkModeBtn.textContent = darkMode 
                ? 'Dark Mode: On' 
                : 'Dark Mode: Off';

            toggleSoundsBtn.textContent = soundsEnabled 
                ? 'Sounds: On' 
                : 'Sounds: Off';
        }
        syncToggleButtonStates();
		syncInfoPanelToggle();
		
if (localStorage.getItem('postResetMessageShown') === 'true') {
    localStorage.removeItem('postResetMessageShown');
    setTimeout(() => {
        showTempMessage(
            '☢ NUCLEAR RESET COMPLETE ☢<br>' +
            'Appalachia has been reborn.<br>' +
            'All previous data erased — start fresh.',
            12000
        );
        playSound('levelUp');
    }, 1800);
}

// ── SINGLE HANDLERS ──
if (howToUseBtn) {
    howToUseBtn.onclick = () => {
        document.querySelectorAll('.modal').forEach(m => m.style.display = 'none');
        instructionsModal.style.display = 'block';
        document.body.classList.add('modal-open');
        playSound('click');
    };
}
if (nukeCodesBtn) {
    nukeCodesBtn.onclick = () => {
        document.querySelectorAll('.modal').forEach(m => m.style.display = 'none');
        nukeCodesModal.style.display = 'block';
        document.body.classList.add('modal-open');
        playSound('click');

        const content = nukeCodesModal.querySelector('.modal-content');

        // Remove any old Minerva content
        let minervaContainer = document.getElementById('minervaContainer');
        if (minervaContainer) minervaContainer.remove();

        minervaContainer = document.createElement('div');
        minervaContainer.id = 'minervaContainer';
        content.appendChild(minervaContainer);

        let countdownInterval = null;

        function refreshMinervaDisplay() {
            const status = getMinervaStatus();
            minervaContainer.innerHTML = '';

            let minervaHTML = '';

            if (status.isHereNow) {
                minervaHTML = `
                    <div id="minervaStatusContainer" style="text-align:center; font-size:1.4em; color:#ffcc00; margin:25px 0;">
                        <strong>✅ MINERVA IS HERE RIGHT NOW!</strong><br>
                        She is currently at <strong>${status.currentLocation}</strong>.
                    </div>
                    <div style="text-align:center; font-size:1.25em; margin:15px 0 10px;">
                        <strong>She leaves in:</strong>
                    </div>
                    <div class="minerva-countdown" id="minervaLeaveCountdown"></div>
                `;
            } else {
                minervaHTML = `
                    <div id="minervaStatusContainer" style="text-align:center; font-size:1.25em; margin:25px 0 10px;">
                        <strong>Minerva is not available today.<br>
                        Minerva will be at ${status.nextLocation} next.<br>
                        She arrives in:</strong>
                    </div>
                    <div class="minerva-countdown" id="minervaCountdown" style="justify-content:center;gap:22px;"></div>
                `;
            }

            minervaContainer.innerHTML = minervaHTML;

            if (status.isHereNow) {
                const leaveContainer = document.getElementById('minervaLeaveCountdown');
                if (leaveContainer) countdownInterval = startMinervaCountdown(leaveContainer, status.nextLeaveTime);
            } else {
                const arrivalContainer = document.getElementById('minervaCountdown');
                if (arrivalContainer) countdownInterval = startMinervaCountdown(arrivalContainer, status.nextArrivalTime);
            }
        }

        refreshMinervaDisplay();

        const statusRefreshInterval = setInterval(() => {
            if (nukeCodesModal.style.display === 'block') {
                refreshMinervaDisplay();
            } else {
                clearInterval(statusRefreshInterval);
            }
        }, 30000);

        const closeBtn = nukeCodesModal.querySelector('.close');
        if (closeBtn) {
            closeBtn.onclick = () => {
                if (countdownInterval) clearInterval(countdownInterval);
                nukeCodesModal.style.display = 'none';
                document.body.classList.remove('modal-open');
                playSound('modalClose');
            };
        }
    };
}

// ── CORRECTED MINERVA SCHEDULE (detects current sale week properly) ──
function getThisWeeksMondayNoon() {
    const now = new Date();
    const utcNow = new Date(now.getTime() + now.getTimezoneOffset() * 60000);
    let monday = new Date(utcNow.getUTCFullYear(), utcNow.getUTCMonth(), utcNow.getUTCDate());
    const day = monday.getUTCDay();
    const daysToMonday = (day === 0) ? 6 : (1 - day);   // back to this week's Monday
    monday.setUTCDate(monday.getUTCDate() - daysToMonday);
    monday.setUTCHours(16, 0, 0, 0);   // 12:00 PM ET
    monday.setUTCMilliseconds(0);
    return monday;
}

function getCurrentMinervaLocationCycle() {
    const startDate = new Date('2025-01-06');
    const now = new Date();
    const weeksSince = Math.floor((now.getTime() - startDate.getTime()) / (7 * 24 * 60 * 60 * 1000));
    return (weeksSince + 2) % 5;   // +2 offset fixes current week to Fort Atlas
}

function getMinervaStatus() {
    const cycle = getCurrentMinervaLocationCycle();
    const locationNames = [
        "Foundation in the southern Savage Divide",
        "The Crater in the northern Toxic Valley",
        "Fort Atlas in the center of the Savage Divide",
        "The Whitespring Resort in the southeast of The Forest"
    ];

    const thisWeeksMonday = getThisWeeksMondayNoon();
    const arrivalDate = thisWeeksMonday;
    const leaveDate = new Date(arrivalDate.getTime() + (48 * 60 * 60 * 1000)); // 48 hours

    const timeUntilArrival = arrivalDate.getTime() - Date.now();
    const timeUntilLeave   = leaveDate.getTime() - Date.now();

    const isHereNow = timeUntilArrival < 0 && timeUntilLeave > 0;

    const currentLocation = locationNames[cycle];
    const nextLocation    = locationNames[(cycle + 1) % 5];

    return {
        isHereNow: isHereNow,
        currentLocation: currentLocation,
        nextLocation: nextLocation,
        nextArrivalTime: arrivalDate.getTime(),
        nextLeaveTime: leaveDate.getTime()
    };
}

function startMinervaCountdown(container, targetTime) {
    const update = () => {
        const diff = Math.max(0, targetTime - Date.now());
        if (diff <= 0) {
            container.innerHTML = `<span style="color:#ffcc00;">✅ MINERVA HAS ARRIVED!</span>`;
            return;
        }
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);
        container.innerHTML = `
            <div><span class="number">${days.toString().padStart(2, '0')}</span><span class="label"> day${days === 1 ? '' : 's'}</span></div>
            <div><span class="number">${hours.toString().padStart(2, '0')}</span><span class="label"> hour${hours === 1 ? '' : 's'}</span></div>
            <div><span class="number">${minutes.toString().padStart(2, '0')}</span><span class="label"> minute${minutes === 1 ? '' : 's'}</span></div>
            <div><span class="number">${seconds.toString().padStart(2, '0')}</span><span class="label"> second${seconds === 1 ? '' : 's'}</span></div>
        `;
    };
    update();
    return setInterval(update, 1000);
}
// ── TOGGLE CATEGORIES MODAL — STRICT BEHAVIOR (only closes with Close button / ×) ──
if (toggleCategoryModalBtn) {
    toggleCategoryModalBtn.onclick = () => {
        const modal = document.getElementById('categoryToggleModal');
        if (!modal) return;

        // Close any other open modals first
        document.querySelectorAll('.modal').forEach(m => m.style.display = 'none');

        modal.style.display = 'block';
        document.body.classList.add('modal-open');
        renderCategoryToggles();

        // ── Close button (×) and "Close" button ONLY ──
        const closeBtn = document.getElementById('closeCategoryToggleBtn') ||
                         modal.querySelector('.close');
        if (closeBtn) {
            // Remove any old listeners first (prevents stacking)
            const newCloseBtn = closeBtn.cloneNode(true);
            closeBtn.parentNode.replaceChild(newCloseBtn, closeBtn);

            newCloseBtn.onclick = (e) => {
                e.stopImmediatePropagation();
                modal.style.display = 'none';
                document.body.classList.remove('modal-open');
                playSound('modalClose');
            };
        }
        playSound('click');
    };
}

// ── GENERIC MODAL CLOSE──
document.querySelectorAll('.modal .close').forEach(closeBtn => {
    closeBtn.onclick = (e) => {
        e.stopPropagation();
        const modal = closeBtn.closest('.modal');
        
        // Context menu now uses the smart close (triggers Return to Fullscreen button)
        if (modal.id === 'itemModal' || modal.id === 'mapContextMenu') {
            closeModal(modal);
        } else {
            modal.style.display = 'none';
            document.body.classList.remove('modal-open');
            playSound('modalClose');
        }
    };
});
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
if (SpeechRecognition && voiceSearchBtn) {
    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'en-US';

    voiceSearchBtn.onclick = () => {
        if (voiceSearchBtn.textContent === 'LISTENING...') {
            recognition.stop();
            voiceSearchBtn.textContent = 'Voice Search';
            return;
        }
        if (combinedSearch) combinedSearch.value = '';
        combinedSearch.focus();
        recognition.start();
        voiceSearchBtn.textContent = 'LISTENING...';
        playSound('click');
    };

    recognition.onresult = e => {
    let transcript = e.results[0][0].transcript.trim();
    
    transcript = transcript.replace(/[.\s]+$/, '').trim();

    if (combinedSearch) {
        combinedSearch.value = transcript;
		clearBtn.style.display = 'block';
        
        combinedSearch.dispatchEvent(new Event('input', { bubbles: true }));
        
        setTimeout(() => {
            combinedSearch.dispatchEvent(new Event('input', { bubbles: true }));
        }, 150);
    }

    voiceSearchBtn.textContent = 'Voice Search';
    showTempMessage(`🔊 Heard: "${transcript}"`, 4000);
    playSound('click');
};

    recognition.onerror = () => {
        voiceSearchBtn.textContent = 'Voice Search';
        showTempMessage('❌ VOICE RECOGNITION FAILED — TRY TYPING', 3000);
        playSound('error');
    };

    recognition.onend = () => {
        voiceSearchBtn.textContent = 'Voice Search';
    };
} else if (voiceSearchBtn) {
    voiceSearchBtn.textContent = 'Voice Search (Chrome/Edge only)';
    voiceSearchBtn.title = 'Voice Search requires Chrome or Edge';
    voiceSearchBtn.disabled = true;
    voiceSearchBtn.onclick = () => {
        showTempMessage('🚨 VOICE SEARCH ONLY WORKS IN CHROME OR EDGE.', 4000);
        playSound('error');
    };
}
		
        const confettiScript = document.createElement('script');
        confettiScript.src = 'https://cdn.jsdelivr.net/npm/canvas-confetti@1.6.0/dist/confetti.browser.min.js';
        confettiScript.onload = () => { window.confettiReady = true; };
        document.head.appendChild(confettiScript);
        const WELCOME_KEY = 'fo76_welcome_accepted';
        const LAST_VERSION_KEY = 'fo76_last_seen_version';
        function showWelcomeModal() {
    const welcomeModal = document.createElement('div');
    welcomeModal.id = 'welcomeModal';
    welcomeModal.className = 'modal';
    welcomeModal.style.display = 'block';

    welcomeModal.innerHTML = `
        <div class="modal-content" style="max-width:650px; background:#000; border:2px solid #00ff00; box-shadow:0 0 30px #00ff00;">
            <div style="background:#000; padding:15px; text-align:center; border-bottom:2px solid #00ff00;">
                <h1 style="margin:0; font-size:2.5em; text-shadow:0 0 20px #00ff00;">
                    ☢ FALLOUT 76 ITEM FINDER MAP ☢
                </h1>
                <p style="margin:8px 0 0; font-size:1.3em; color:#0f0;">
                    Built with ❤️ by MrCrazy
                </p>
            </div>

            <div style="padding:20px; line-height:1.7;">
                <p style="font-size:1.1em; margin-bottom:18px;">
                    <strong>Welcome, Vault Dweller!</strong>
                </p>

                <ul style="margin:20px 0; padding-left:30px; font-size:1.05em;">
                    <li>This tool is for <strong>logging locations</strong>.</li>
                    <li>Exploring Appalachia sometimes its hard to keep track of things.</li>
                    <li>places you found, things you seen. this app was made just for that so start logging things.</li>
                    <li>Click <strong>"Update Community Map"</strong> for the latest community data.</li>
                    <li>Have fun exploring Appalachia — and share the app! ❤️</li>
                </ul>

                <div style="margin:25px 0; text-align:center;">
                    <div id="welcomeGotItBtn" style="display:inline-block; padding:12px 40px; background:#000; border:3px solid #00ff00; color:#00ff00; font-size:1.5em; font-weight:bold; text-shadow:0 0 15px #00ff00; box-shadow:0 0 20px #00ff00; cursor:pointer;">
                        ENTER THE WASTELAND
                    </div>
                </div>

                <p style="text-align:center; margin-top:20px; font-size:0.9em; opacity:0.8;">
                    Made for the Fallout 76 community.<br>
                </p>
            </div>
        </div>
    `;

    document.body.appendChild(welcomeModal);
    document.body.classList.add('modal-open');
    document.getElementById('welcomeGotItBtn').onclick = () => {
        localStorage.setItem(WELCOME_KEY, 'true');
        welcomeModal.remove();
        document.body.classList.remove('modal-open');
        playSound('levelUp');
        showTempMessage('👋 WELCOME TO APPALACHIA, VAULT DWELLER', 20000);
    };
}
// ── APP UPDATED MODAL (returning users only — shows only once per app version) ──
function checkForUpdate() {
    const lastSeen = localStorage.getItem('fo76_last_seen_version') || '0';

    if (lastSeen !== CURRENT_APP_VERSION) {
        const updateModal = document.createElement('div');
        updateModal.id = 'updateModal';
        updateModal.className = 'modal';
        updateModal.style.display = 'block';
        updateModal.innerHTML = `
            <div class="modal-content" style="max-width:600px; background:#000; border:2px solid #00ff00; box-shadow:0 0 30px #00ff00;">
                <div style="background:#000; padding:18px; text-align:center; border-bottom:2px solid #00ff00;">
                    <h1 style="margin:0; font-size:2.4em; text-shadow:0 0 20px #00ff00; color:#0f0;">
                        ☢ APP UPDATED ☢
                    </h1>
                </div>
                <div style="padding:30px; text-align:center; line-height:1.8;">
                    <p style="font-size:1.35em; margin-bottom:20px;">
                        Welcome to Version <strong>${CURRENT_APP_VERSION}</strong>
                    </p>
                    <p style="font-size:1.15em; color:#88ff88;">
                        The Fallout 76 Item Finder Map has been upgraded with the latest fixes and features.
                    </p>
                    
                    <div style="margin:30px 0;">
                        <div id="updateGotItBtn" style="display:inline-block; padding:14px 50px; background:#000; border:3px solid #00ff00; color:#00ff00; font-size:1.6em; font-weight:bold; text-shadow:0 0 18px #00ff00; box-shadow:0 0 25px #00ff00; cursor:pointer;">
                            GOT IT — LET'S EXPLORE!
                        </div>
                    </div>
                    
                    <p style="margin-top:20px; font-size:0.95em; opacity:0.8;">
                        Thank you for using the Fallout 76 Item Finder Map ❤️
                    </p>
                </div>
            </div>
        `;
        document.body.appendChild(updateModal);
        document.body.classList.add('modal-open');

        const btn = document.getElementById('updateGotItBtn');
        if (btn) {
            btn.onclick = () => {
                localStorage.setItem('fo76_last_seen_version', CURRENT_APP_VERSION);
                updateModal.remove();
                document.body.classList.remove('modal-open');
                playSound('levelUp');
            };
        }
    }
}
        // ── WELCOME MODAL FIRST (new users) ──
        if (!localStorage.getItem(WELCOME_KEY)) {
            setTimeout(showWelcomeModal, 800);
        }
        // ── APP UPDATED MODAL (returning users only — shows only on version change) ──
        else if (localStorage.getItem('fo76_map_version') !== CURRENT_APP_VERSION) {
            setTimeout(checkForUpdate, 800);
        }
		
const searchInput = document.getElementById('combinedSearch');
const suggestionsBox = document.getElementById('searchSuggestions');

searchInput.addEventListener('input', function(e) {
    if (e && !e.isTrusted) return;

    const q = searchInput.value.trim().toLowerCase();
    suggestionsBox.innerHTML = '';
    suggestionsBox.style.display = 'none';

    if (q.length < 2) return;

    const matches = [];

    // ── LOOSE PREDICTIVE MATCH FOR DROPDOWN ONLY ──
    // Forgiving for typos, partial typing, and misspellings
    locations.forEach(loc => {
        const grid = (typeof getGridFromLatLng === 'function') ? (getGridFromLatLng(loc.lat, loc.lng) || '') : '';
        const text = normalizeString(loc.desc + ' ' + (loc.category || '') + ' ' + grid);
        const queryNorm = normalizeString(q);

        const terms = queryNorm.split(' ').filter(t => t.length > 0);
        
        // Every term must appear anywhere in the text (very forgiving)
        const isMatch = terms.every(term => text.includes(term));
        
        if (isMatch) {
            const displayText = loc.desc.length > 50 ? loc.desc.substring(0,47) + '...' : loc.desc;
            matches.push({
                display: displayText,
                desc: loc.desc,
                lat: loc.lat,
                lng: loc.lng,
                id: loc.id,
                score: text.indexOf(terms[0])   // simple relevance (earlier = better)
            });
        }
    });

    // Sort by relevance (best matches first) then take top 12
    const seen = new Set();
    const unique = matches
        .sort((a, b) => a.score - b.score)
        .filter(item => {
            const key = item.desc + item.lat + item.lng;
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
        })
        .slice(0, 12);

    if (unique.length === 0) return;

    unique.forEach(item => {
        const div = document.createElement('div');
        div.textContent = item.display;
        div.style.padding = '12px';
        div.style.cursor = 'pointer';
        div.style.borderBottom = '1px solid #00ff33';
        div.onclick = () => {
            combinedSearch.value = '';
            clearBtn.style.display = 'none';
            suggestionsBox.style.display = 'none';
            loadData('', categoryFilter.value);
            
            safeFlyTo(item.lat, item.lng, 4);
            map.once('moveend', () => {
                setTimeout(() => {
                    const marker = [...clusteredMarkers.getLayers(), ...nonClusteredMarkers.getLayers()]
                        .find(m => m.options && m.options.id === item.id);
                    if (marker) {
                        marker.openPopup();
                        playSound('click');
                    }
                }, 650);
            });
            playSound('selectcategory');
        };
        suggestionsBox.appendChild(div);
    });

    suggestionsBox.style.display = 'block';
});

document.addEventListener('click', e => {
    if (!searchInput.contains(e.target) && !suggestionsBox.contains(e.target)) {
        suggestionsBox.style.display = 'none';
    }
});

// === PWA INSTALL BANNER — Correct iOS instructions ===
let deferredPrompt = null;
const PWA_DISMISSED_KEY = 'pwaInstallPromptDismissed';

const isIOS = () => /iPad|iPhone|iPod/.test(navigator.userAgent) || 
                 (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

const isInstalled = () =>
    window.matchMedia('(display-mode: standalone)').matches ||
    window.matchMedia('(display-mode: minimal-ui)').matches ||
    window.navigator.standalone === true;

window.addEventListener('beforeinstallprompt', e => { deferredPrompt = e; });

setTimeout(() => {
    if (isInstalled() || localStorage.getItem(PWA_DISMISSED_KEY) === 'true') return;

    const banner = document.createElement('div');
    banner.style.cssText = `
        position:fixed; bottom:20px; left:50%; transform:translateX(-50%);
        background:#001100; color:#00ff00; padding:14px 20px; border:2px solid #00ff00;
        border-radius:8px; font:bold 16px 'Courier New',monospace; text-align:center;
        z-index:999999; box-shadow:0 0 20px #00ff00; max-width:90%;
    `;

    if (isIOS()) {
        banner.innerHTML = `
            ❤️ Love the map?<br>
            <span style="font-size:15px;line-height:1.35;">Tap the <strong>Share</strong> button <span style="font-size:22px;">⎇</span> at the bottom of Safari,<br>then choose <strong>“Add to Home Screen”</strong>.</span><br><br>
            <button id="installYes" style="background:#00ff00;color:#000;padding:10px 24px;border:none;margin:8px;cursor:pointer;">Got it</button>
            <button id="installNo" style="background:transparent;color:#00ff00;border:none;margin:8px;cursor:pointer;">Maybe later</button>
        `;
    } else {
        banner.innerHTML = `
            ❤️ Love the map?<br>
            <span style="font-size:14px;">Add this app to your home screen for quick access.</span><br><br>
            <button id="installYes" style="background:#00ff00;color:#000;padding:10px 24px;border:none;margin:8px;cursor:pointer;">Install</button>
            <button id="installNo" style="background:transparent;color:#00ff00;border:none;margin:8px;cursor:pointer;">Maybe later</button>
        `;
    }

    document.body.appendChild(banner);

    const dismissBanner = () => {
        banner.remove();
        localStorage.setItem(PWA_DISMISSED_KEY, 'true');
    };

    document.getElementById('installYes').onclick = () => {
        if (!isIOS() && deferredPrompt) {
            deferredPrompt.prompt();
            deferredPrompt.userChoice.then(() => dismissBanner());
        } else {
            dismissBanner();
        }
    };

    document.getElementById('installNo').onclick = dismissBanner;
}, 25000);

// Auto-dismiss permanently if the app is installed
window.addEventListener('appinstalled', () => {
    localStorage.setItem(PWA_DISMISSED_KEY, 'true');
});

if (urlParams.has('permshare')) {
    const id = urlParams.get('permshare');
    let raw = null;
    try {
        const decoded = decodeURIComponent(id.replace(/-/g, '+').replace(/_/g, '/'));
        raw = atob(decoded + '=='.substring(0, (4 - decoded.length % 4) % 4));
        raw = decodeURIComponent(escape(raw));
    } catch (e) {
        showTempMessage('❌ INVALID SHARE LINK!', 5000);
        history.replaceState(null, null, location.pathname);
        return;
    }
    if (raw) {
        try {
            const shareData = JSON.parse(raw);
            const incoming = shareData.locations || [];
            const beforeCount = locations.length;
            const undoState = JSON.stringify(locations);

            incoming.forEach(imp => {
                const existing = locations.find(l => l.id === imp.id);

                if (imp.category && imp.icon && !defaultCategoryIcons[imp.category]) {
                    customCategories[imp.category] = imp.icon;
                    categoryIcons[imp.category] = imp.icon;
                    categoryColors[imp.category] = '#002F00';
                    activeCategories.add(imp.category);
                }

                if (existing) {
                    Object.assign(existing, imp);
                    existing.userEdited = true;
                    existing.isCommunity = false;
                    existing.wasCommunityKept = false;
                    existing.locked = true;
                } else {
                    locations.push({
                        ...imp,
                        id: generateUniqueId(),
                        addedTime: Date.now(),
                        locked: true,
                        userEdited: true,
                        isCommunity: false,
                        wasCommunityKept: false,
                        isTemp: false,
                        isPostcard: false
                    });
                }
            });

            const added = locations.length - beforeCount;
            localStorage.setItem(CUSTOM_CATEGORIES_KEY, JSON.stringify(customCategories));
            localStorage.setItem('activeCategories', JSON.stringify([...activeCategories]));
            saveLocations();
			createCreationBurst(tempLatLng);
            forceReload();

            showTempMessage(`📥 SHARED MARKER${added > 1 ? 'S' : ''} IMPORTED — NOW YOURS TO EDIT`, 6000);
            playSound('saving');

            // Stronger postcard-style fly-to + popup
            if (incoming.length > 0) {
    const first = incoming[0];
    setTimeout(() => {
        // Moderate zoom (4.5) that matches postcard feel – prevents over-zooming
        map.flyTo([first.lat, first.lng], 4.5, { 
            duration: 1.8,
            easeLinearity: 0.25 
        });

        // Extended delay ensures markers are fully re-rendered after forceReload
        setTimeout(() => {
            let target = null;
            const allMarkers = [...clusteredMarkers.getLayers(), ...nonClusteredMarkers.getLayers()];

            // More reliable lookup using getLatLng() + wider tolerance
            target = allMarkers.find(m => {
                if (!m || typeof m.getLatLng !== 'function') return false;
                const latlng = m.getLatLng();
                return latlng && 
                       Math.abs(latlng.lat - first.lat) < 0.01 && 
                       Math.abs(latlng.lng - first.lng) < 0.01;
            });

            if (target) {
                target.openPopup();
            } else {
                // Fallback: open a clean popup at exact coordinates (guaranteed to appear)
                const fallbackPopup = L.popup({
                    closeButton: true,
                    className: 'custom-popup',
                    offset: [0, -15]
                })
                .setLatLng([first.lat, first.lng])
                .setContent(`
                    <div style="text-align:center; min-width:220px;">
                        <b>${first.title || 'Imported Marker'}</b><br>
                        ${first.description || ''}
                        <div style="font-size:11px; margin-top:6px; color:#888;">
                            Locked • Imported via share link
                        </div>
                    </div>
                `);
                map.openPopup(fallbackPopup);
            }
        }, 3200);
    }, 1200);
}

            // Undo support
            if (added > 0) {
                setTimeout(() => {
                    const undoBtn = document.getElementById('undoImportBtn');
                    if (undoBtn) {
                        undoBtn.style.display = 'inline-block';
                        undoBtn.onclick = () => {
                            locations = JSON.parse(undoState);
                            recalculateXP();
                            saveLocations();
                            forceReload();
                            undoBtn.style.display = 'none';
                            showTempMessage('✅ IMPORT UNDONE', 4000);
                            playSound('undo');
                        };
                    }
                }, 100);
            }

            history.replaceState(null, null, location.pathname);
        } catch (e) {
            showTempMessage('✅ SHARED MARKER IMPORTED — NOW YOURS TO EDIT', 5000);
            console.error('Permshare import error:', e);
        }
    }
}

document.getElementById('backupAllBtn')?.addEventListener('click', () => {
    const playerName = document.getElementById('playerNameInput')?.value.trim() || '';

    const fullBackup = {
        version: "full-backup",
        timestamp: new Date().toISOString(),
        communityVersion: localStorage.getItem('fo76_map_version') || '1.0',
        playerName: playerName,                    // ← fixed capture
        locations: locations,
        customCategories: customCategories,
        level: level,
        xp: xp,
        settings: {
            clusteringEnabled,
            gridEnabled,
            currentMap,
            darkMode,
            soundsEnabled,
            titleVisible,
            toolsVisible,
            activeCategories: [...activeCategories]
        }
    };
    const blob = new Blob([JSON.stringify(fullBackup, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `FO76_FULL_BACKUP_${new Date().toISOString().slice(0,10)}.json`;
    a.click();
    showTempMessage('✅ FULL BACKUP DOWNLOADED!', 6000);
    playSound('saving');
});

document.getElementById('restoreAllBtn')?.addEventListener('click', () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = e => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = ev => {
            try {
                const data = JSON.parse(ev.target.result);
               
                // Updated version check — now matches the current Full Backup export
                if (data.version && (data.version.includes('full-backup') || data.version.includes('full-v76'))) {
                    showConfirmModal(
                        'FULL RESTORE FROM BACKUP',
                        'This will OVERWRITE EVERYTHING:<br><br>• All your markers<br>• XP & Level<br>• Settings<br>• Community map version<br><br>Are you absolutely sure?',
                        () => {
                            locations = data.locations || [];
                            customCategories = data.customCategories || {};
							registerUnknownCategories();
							rebuildCategoryData();
							applyCustomCategoryStyling();

                            // ── Restore colors for ALL custom categories ──
                            categoryIcons = { ...defaultCategoryIcons, ...customCategories };
                            categoryColors = { ...defaultCategoryColors };
                            Object.keys(customCategories).forEach(cat => {
                                if (!categoryColors[cat]) categoryColors[cat] = '#002F00';
                            });

                            level = data.level || 1;
                            xp = data.xp || 0;

                            // ── RESTORE PLAYER NAME (now guaranteed to run) ──
                            if (data.playerName !== undefined && data.playerName !== null) {
                                localStorage.setItem('fo76_playerName', data.playerName);
                                const nameInput = document.getElementById('playerNameInput');
                                if (nameInput) nameInput.value = data.playerName;
                            }

                            // ── RESTORE ACTIVE CATEGORIES (checkbox toggles) ──
                            const s = data.settings || {};
                            clusteringEnabled = s.clusteringEnabled !== undefined ? s.clusteringEnabled : true;
                            gridEnabled = s.gridEnabled || false;
                            currentMap = s.currentMap || 'named';
                            darkMode = s.darkMode || false;
                            soundsEnabled = s.soundsEnabled !== undefined ? s.soundsEnabled : true;
                            titleVisible = s.titleVisible !== undefined ? s.titleVisible : true;
                            toolsVisible = s.toolsVisible !== undefined ? s.toolsVisible : true;
                            if (s.activeCategories) activeCategories = new Set(s.activeCategories);

                            localStorage.setItem('fo76_map_version', data.communityVersion || s.communityVersion || '1.0');
                            localStorage.setItem(STORAGE_KEY, JSON.stringify(locations));
                            localStorage.setItem(CUSTOM_CATEGORIES_KEY, JSON.stringify(customCategories));
                            localStorage.setItem('fo76_level', level);
                            localStorage.setItem('fo76_xp', xp);
                            localStorage.setItem('clusteringEnabled', clusteringEnabled);
                            localStorage.setItem('gridEnabled', gridEnabled);
                            localStorage.setItem('currentMap', currentMap);
                            localStorage.setItem('darkMode', darkMode);
                            localStorage.setItem('soundsEnabled', soundsEnabled);
                            localStorage.setItem('titleVisible', titleVisible);
                            localStorage.setItem('toolsVisible', toolsVisible);
                            localStorage.setItem('activeCategories', JSON.stringify([...activeCategories]));

                            // ── IMMEDIATE UI UPDATE (no refresh needed) ──
                            mainTitle.style.display = titleVisible ? 'block' : 'none';
                            titleToggleBtn.textContent = titleVisible ? '-' : '+';
                            buttonGroup.classList.toggle('hidden', !toolsVisible);
                            toolsToggleBtn.textContent = toolsVisible ? 'Hide Tools' : 'Show Tools';
                            document.body.classList.toggle('dark-mode', darkMode);
                            syncToggleButtonStates();
							syncInfoPanelToggle();
                            renderCategoryToggles(); // updates category checkboxes instantly

                            // SUCCESS SCREEN + RELOAD
                            const successOverlay = document.createElement('div');
                            successOverlay.style.cssText = `
                                position:fixed;top:0;left:0;width:100vw;height:100vh;
                                background:#000;z-index:999999;display:flex;
                                flex-direction:column;align-items:center;justify-content:center;
                                font-family:'Courier New',monospace;color:#00ff00;
                                text-align:center;gap:30px;
                            `;
                            successOverlay.innerHTML = `
                                <div style="font-size:clamp(80px,20vw,200px);text-shadow:0 0 60px #00ff00;">🧬</div>
                                <h1 style="font-size:clamp(32px,9vw,80px);margin:0;text-shadow:0 0 40px #00ff00;">
                                    FULL RESTORE COMPLETE
                                </h1>
                                <p style="font-size:clamp(20px,6vw,48px);margin:0;">
                                    All data successfully restored!
                                </p>
                                <p style="font-size:clamp(18px,5vw,36px);opacity:0.9;">
                                    Reloading in 3...
                                </p>
                            `;
                            document.body.appendChild(successOverlay);
                            playSound('levelUp');
                            let count = 3;
                            const countdown = setInterval(() => {
                                count--;
                                successOverlay.querySelector('p:last-child').textContent = `Reloading in ${count}...`;
                                if (count <= 0) {
                                    clearInterval(countdown);
                                    location.reload();
                                }
                            }, 1000);
                        }
                    );
                } else {
                    showTempMessage('❌ ERROR: NOT A VALID FULL BACKUP FILE!', 5000);
                    playSound('error');
                }
            } catch (err) {
                showTempMessage('❌ ERROR: INVALID OR CORRUPTED BACKUP FILE!', 5000);
                playSound('error');
                console.error(err);
            }
        };
        reader.readAsText(file);
    };
    input.click();
});
let reportTimer = null;

// Permanent report block — uses cid, survives refresh/reset
window.startReport = function(markerId) {
    const marker = locations.find(l => l.id === markerId);
    if (!marker) {
        showTempMessage('❌ ERROR: MARKER NOT FOUND!', 5000);
        return;
    }

    if (!marker.cid) {
        marker.cid = generateCid(marker);
        saveLocations();
    }

    const reportKey = "reported_cid_" + marker.cid;

    if (localStorage.getItem(reportKey) === "true") {
        showTempMessage('❌ ALREADY REPORTED — THANK YOU!', 6000);
        return;
    }

    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.style.display = 'block';
    modal.innerHTML = `
        <div class="modal-content" style="max-width:560px; width:94vw; padding:24px; box-sizing:border-box;">
            <span class="close">X</span>
            <h2 style="text-align:center; margin:0 0 24px; font-size:1.8em;">👎 REPORT BAD MARKER ❌</h2>
            
            <div style="text-align:left; line-height:1.9; font-size:1.1em; margin-bottom:24px;">
                Only report if it is:<br>
                • Spam<br>
                • Wrong location<br>
                • Broken / outdated<br><br>
                A Moderator will review and remove if needed.
            </div>
            
            <div style="text-align:center; font-weight:bold; color:#00ff88; margin-bottom:10px; font-size:1.1em;">
                Description of the problem <span style="color:#ff8888;">(required)</span>
            </div>
            <textarea id="reportMessageTxt"
                      placeholder="e.g. Wrong location — should be E8, not E9"
                      style="width:100%; max-width:none; height:130px; background:#000; color:#0f0; border:4px solid #00ff00; padding:16px; font-family:'Courier New',monospace; font-size:1em; box-sizing:border-box; resize:vertical; outline:none; display:block; margin:0 auto;"></textarea>
            
            <div style="text-align:center; margin-top:28px;">
                <button id="sendReportNow"
                        style="background:#00ff00; color:#000; padding:14px 50px; font-size:1.4em; font-weight:bold;">
                    SEND REPORT
                </button>
            </div>
        </div>
    `;

    document.body.appendChild(modal);
    document.body.classList.add('modal-open');

    const closeBtn = modal.querySelector('.close');
    const sendBtn = modal.querySelector('#sendReportNow');
    const reportMessageTxt = modal.querySelector('#reportMessageTxt');

    closeBtn.onclick = () => closeModal(modal);

        sendBtn.onclick = () => {
        const message = reportMessageTxt.value.trim();
        
        if (!message || message.length < 10) {
            showTempMessage(
                '❌ Please provide a description of the problem<br>(minimum 10 characters).',
                5000
            );
            reportMessageTxt.focus();
            playSound('error');
            return;
        }

        localStorage.setItem(reportKey, "true");

        fetch("https://itemfinder-submit.crzymn05.workers.dev/", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                type: "report",
                markerId: markerId,
                message: message,
                marker: {
                    id: markerId,
                    cid: marker.cid || generateCid(marker),
                    userEdited: marker.userEdited || false,
                    wasCommunityKept: marker.wasCommunityKept || false,
                    lat: marker.lat,
                    lng: marker.lng,
                    category: marker.category,
                    desc: marker.desc,
                    icon: marker.icon || "Notepad"
                }
            })
        })
        .then(r => r.ok ? r.text() : Promise.reject('Server rejected'))
        .then(() => showTempMessage('🚩 REPORT SENT — THANK YOU IT WILL BE REVIEWED.', 6000))
        .catch(err => {
            console.error("Report failed:", err);
            showTempMessage('❌ REPORT FAILED — TRY AGAIN LATER.', 6000);
        });

        closeModal(modal);
    };

    playSound('error');
};

window.cancelReport = function() {
    clearTimeout(reportTimer);
};

// ── Keep a community marker (ALWAYS award +100 XP keep bonus) ──
window.keepCommunityMarker = function(markerId) {
    const marker = locations.find(l => l.id === markerId);
    if (!marker || !marker.isCommunity) return;

    playSound('click');
	
	const wasApprovedSubmission = !!marker.approvedSubmission;

    showConfirmModal(
        '👍 Keep This Community Marker? 💾',
        '<strong>This marker will become yours permanently:</strong><br><br>' +
        '• You gain +100 XP (keep bonus)<br>' +
        '• You can edit, move, or delete it<br>' +
        '• It will <strong>NOT</strong> receive future community updates<br>' +
        '• You will no longer be able to report it<br><br>' +
        'You can always revert it back to a community map marker.',
        () => {
            marker.isCommunity = false;
            marker.userEdited = true;
            marker.wasCommunityKept = true;
            marker.locked = true;
            marker.addedTime = Date.now();
            // Preserve approvedSubmission flag
            if (wasApprovedSubmission) {
                marker.approvedSubmission = true;
            }

            window.justKeptMarkerId = markerId;

            applyCustomCategoryStyling();
            saveLocations();

            // NO manual xp += 100 here anymore
            recalculateXP();   // ← this now correctly handles everything

            forceReload();

            if (typeof createCreationBurst === 'function') {
                createCreationBurst([marker.lat, marker.lng]);
            }

            setTimeout(() => playSound('saving'), 150);

            showTempMessage(`✅ MARKER KEPT — +100 XP (LEVEL ${level})<br>Won't receive future community updates • Revert anytime`, 5500);

            setTimeout(() => {
                const keptMarker = [...clusteredMarkers.getLayers(), ...nonClusteredMarkers.getLayers()]
                    .find(m => m.options && m.options.id === markerId);
                if (keptMarker) {
                    keptMarker.openPopup();
                    window.justKeptMarkerId = null;
                }
            }, 850);
        },
        'Yes — Keep It',
        'Cancel',
        true
    );
};

// ── Revert kept community marker back to community status ──
window.revertToCommunityMarker = function(markerId) {
    const marker = locations.find(l => l.id === markerId);
    if (!marker || !marker.wasCommunityKept) {
        showTempMessage('❌ THIS IS NOT A KEPT COMMUNITY MARKER.', 4000);
        return;
    }

    playSound('click');

    showConfirmModal(
        '↩ REVERT TO COMMUNITY MARKER',
        'This will turn the marker back into a normal community marker.<br><br>' +
        '• You will lose the +100 XP from **keeping** it<br>' +
        (marker.approvedSubmission ? '• You will **keep** the original +100 XP from creation/approval<br>' : '') +
        '• It will receive future community updates again<br>' +
        '• The marker will be locked automatically<br><br>' +
        'Proceed with revert?',
        () => {
            const hadApprovedFlag = !!marker.approvedSubmission;

            marker.isCommunity = true;
            marker.userEdited = false;
            marker.wasCommunityKept = false;
            marker.locked = true;
            marker.addedTime = Date.now();

            if (hadApprovedFlag) {
                marker.approvedSubmission = true;
            }

            if (marker.communityUpdateAvailable !== undefined) {
                delete marker.communityUpdateAvailable;
            }

            // No manual subtraction — recalculateXP() is now the single source of truth
            recalculateXP();

            saveLocations();
            forceReload();

            setTimeout(() => playSound('saving'), 150);
            showTempMessage(`🔄 MARKER REVERTED TO COMMUNITY — -100 XP (LEVEL ${level})<br>Will receive future updates`, 5500);
        },
        'Yes — Revert',
        'Cancel'
    );
};

// ── Revert ALL outdated kept community markers at once ──
window.revertAllOutdatedMarkers = function() {
    const outdated = locations.filter(l => l.wasCommunityKept && l.communityUpdateAvailable);
    if (outdated.length === 0) return;

    playSound('click');
    showConfirmModal(
        'REVERT ALL OUTDATED MARKERS',
        `This will revert <strong>${outdated.length}</strong> kept marker${outdated.length === 1 ? '' : 's'} back to official community status.<br><br>` +
        '• They will receive future community updates again<br>' +
        '• You will lose edit rights on them<br>' +
        '• The blue UPDATE badges will be cleared<br><br>' +
        'Proceed with reverting all?',
        () => {
            let revertedCount = 0;
            locations.forEach(loc => {
                if (loc.wasCommunityKept && loc.communityUpdateAvailable) {
                    loc.isCommunity = true;
                    loc.userEdited = false;
                    loc.wasCommunityKept = false;
                    loc.locked = true;
                    loc.addedTime = Date.now();
                    if (loc.communityUpdateAvailable !== undefined) delete loc.communityUpdateAvailable;
                    revertedCount++;
                }
            });

            saveLocations();
            recalculateXP();
            forceReload();
            setTimeout(() => playSound('saving'), 150);

            // ── Clear, helpful guidance message ──
            showTempMessage(`✅ ${revertedCount} MARKER${revertedCount === 1 ? '' : 'S'} REVERTED TO COMMUNITY<br>📡 Tap "Update Community Map" to get the latest version`, 6500);

            // ── Make Update Community Map button glow green (same as normal update available) ──
            if (downloadCommunityBtn) {
                downloadCommunityBtn.classList.add('available');
                downloadCommunityBtn.textContent = 'Update Community Map (Available!)';
            }
        },
        'Yes — Revert All',
        'Cancel'
    );
};

// ── ANIMATION INTERACTION LOCK ──
// Temporarily disables clicks on buttons, map, AND ALL OPEN MODALS while major animations play
let animationLockActive = false;

function lockUIDuringAnimation(durationMs = 3800) {
    if (animationLockActive) return;
    animationLockActive = true;

    const elementsToLock = [
        document.getElementById('buttonGroup'),
        document.getElementById('searchBar'),
        document.getElementById('map'),
        document.getElementById('itemModal')
    ];

    // Also lock every open modal (covers How to Use, Nuke Codes, Category modals, etc.)
    document.querySelectorAll('.modal').forEach(modal => {
        if (modal.style.display === 'block') {
            elementsToLock.push(modal);
        }
    });

    elementsToLock.forEach(el => {
        if (el) el.style.pointerEvents = 'none';
    });

    // Re-enable interactions after the animation finishes
    setTimeout(() => {
        elementsToLock.forEach(el => {
            if (el) el.style.pointerEvents = '';
        });
        animationLockActive = false;
    }, durationMs);
}

function triggerEpicFlash(icon = "✅", title = "ACTION COMPLETE", line1 = "", line2 = "") {
    lockUIDuringAnimation(2400); // shorter & snappier than before

    const flash = document.createElement('div');
    flash.style.cssText = `
        position:fixed;top:0;left:0;width:100vw;height:100vh;
        background:#000;z-index:9999999;display:flex;
        align-items:center;justify-content:center;flex-direction:column;
        gap:20px;font-family:'Courier New',monospace;color:#00ff00;
        pointer-events:none;opacity:0;transition:opacity 0.6s;
    `;
    flash.innerHTML = `
        <div style="font-size:clamp(90px,28vw,240px);text-shadow:0 0 70px #00ff00;animation:pulse 1.8s ease-out;">
            ${icon}
        </div>
        <h1 style="font-size:clamp(32px,9vw,78px);margin:0;text-shadow:0 0 45px #00ff00;letter-spacing:4px;">
            ${title}
        </h1>
        ${line1 ? `<p style="font-size:clamp(18px,5.5vw,42px);margin:4px 0 0;">${line1}</p>` : ''}
        ${line2 ? `<p style="font-size:clamp(16px,4.8vw,36px);margin:0;opacity:0.9;">${line2}</p>` : ''}
    `;
    document.body.appendChild(flash);

    // Quick white flash for extra drama (matches nuke style)
    const quickFlash = document.createElement('div');
    quickFlash.style.cssText = `
        position:fixed;top:0;left:0;width:100vw;height:100vh;
        background:#fff;z-index:99999999;pointer-events:none;
        animation:quickFlash 0.9s ease-out forwards;
    `;
    document.body.appendChild(quickFlash);

    setTimeout(() => { flash.style.opacity = '1'; }, 50);
    setTimeout(() => {
        flash.style.opacity = '0';
        quickFlash.remove();
        setTimeout(() => flash.remove(), 600);
    }, 2200);
}

// ── LIVE POSTCARD TIMER + INDEPENDENT GLOW (now 100% reliable) ──
let liveTableTimer = null;
let independentGlowTimer = null;

function startLiveTableTimer() {
    if (liveTableTimer) return;
    liveTableTimer = setInterval(() => {
        updatePostcardTimers();
        if (!locations.some(l => l.isPostcard)) {
            clearInterval(liveTableTimer);
            liveTableTimer = null;
        }
    }, 980);
}

function startIndependentGlowRefresh() {
    if (independentGlowTimer) return;
    independentGlowTimer = setInterval(() => {
        let glowExpired = false;

        // Map markers
        [clusteredMarkers, nonClusteredMarkers].forEach(group => {
            group.eachLayer(marker => {
                if (!marker?.options?.id) return;
                const loc = locations.find(l => l.id === marker.options.id);
                if (!loc) return;
                const shouldGlow = isGlowing(loc);
                const icon = marker._icon;
                if (!icon) return;
                const currentlyGlowing = icon.classList.contains('glowing');
                if (shouldGlow && !currentlyGlowing) {
                    marker.setIcon(createMarkerIcon(loc));
                    marker.setZIndexOffset(10000);
                } else if (!shouldGlow && currentlyGlowing) {
                    marker.setIcon(createMarkerIcon(loc));
                    marker.setZIndexOffset(0);
                    glowExpired = true;   // ← triggers re-sort
                }
            });
        });

        // Table rows glow class + NEW! timer live update
        document.querySelectorAll('#locationsTable tbody tr').forEach(tr => {
            const id = tr.dataset.id;
            if (!id) return;
            const loc = locations.find(l => l.id === id);
            if (!loc) return;
            if (isGlowing(loc)) {
                tr.classList.add('glowing');
            } else {
                tr.classList.remove('glowing');
                glowExpired = true;   // ← triggers re-sort
            }
        });

        updateNewMarkerTimers();   // ← keeps NEW! timer ticking live every cycle

        // If any glow just expired → full refresh + re-sort the table
        if (glowExpired) {
            refreshTable(combinedSearch?.value || '', categoryFilter?.value || '');
        }
    }, 980);   // slightly faster for smooth live countdown
}

// Start both
startLiveTableTimer();
startIndependentGlowRefresh();

// Restart after postcard creation or any full reload
const originalCreateBtn = document.getElementById('createPostcardBtn');
if (originalCreateBtn) {
    const oldClick = originalCreateBtn.onclick;
    originalCreateBtn.onclick = function(e) {
        if (oldClick) oldClick.call(this, e);
        setTimeout(() => {
            startLiveTableTimer();
            startPostcardTicker();
            startIndependentGlowRefresh();
        }, 100);
    };
}

const originalForceReload = forceReload;
forceReload = function() {
    originalForceReload.call(this);
	rebuildCategoryData();
	applyCustomCategoryStyling();
    startLiveTableTimer();
    startIndependentGlowRefresh();

    // ── FIXED: Re-sync category dropdown after any full reload ──
    if (categoryFilter) {
        categoryFilter.value = currentCategoryFilter || '';
    }
};

<!-- ── SINGLE UNIFIED ONBOARDING HINT (with How to Use reference) ── -->
function showUnifiedOnboardingHint() {
    const hintKey = 'fo76_unifiedOnboardingHintShown';
    
    // Show only once per device
    if (localStorage.getItem(hintKey) === 'true') return;
    
    // Skip if user already has personal markers
    const hasPersonalMarkers = locations.some(l => l.userEdited && !l.isPostcard);
    if (hasPersonalMarkers) {
        localStorage.setItem(hintKey, 'true');
        return;
    }

    showTempMessage(
    `📍 <strong>First time?</strong><br>` +
    `• Right-click (PC) or long-press (mobile) anywhere on the map<br>` +
    `  to create a permanent marker or postcard.<br>` +
    `• Drag to pan the map.<br>` +
    `• Mouse wheel or two-finger pinch to zoom.<br>` +
    `• Fullscreen button (🔭) in the top-left corner below the zoom buttons.<br><br>` +
    `For full instructions, tap the <strong>How to Use</strong> button in the Tools panel.`,
    11000
);

    // Mark as shown forever
    localStorage.setItem(hintKey, 'true');
}

// Trigger once on the very first map click/tap
map.once('click', () => {
    // Small delay to avoid any UI overlap
    setTimeout(showUnifiedOnboardingHint, 1900);
});

// ── Memory Cleanup to Prevent Gradual Slowdown on Mobile ──
let lastCleanupTime = Date.now();
function performMemoryCleanup() {
    if (Date.now() - lastCleanupTime < 45000) return; // max once every ~45 seconds
    lastCleanupTime = Date.now();

    if (typeof clusteredMarkers !== 'undefined' && clusteredMarkers && typeof clusteredMarkers._unspiderfy === 'function') {
        clusteredMarkers._unspiderfy();
    }
    if (typeof map !== 'undefined' && map) {
        map.invalidateSize({ animate: false });
    }
    // Optional browser GC hint (harmless, does nothing in normal tabs)
    if (window.gc) window.gc();
}
setInterval(performMemoryCleanup, 30000);

// ── Unified Light Refresh for All Devices (iOS + Android + PC) ──
// Light refresh every 8 seconds — more balanced for battery & smoothness
setInterval(() => {
    if (document.visibilityState !== 'visible' || window.isDraggingAnyMarker) return;

    // Skip if user is actively interacting (popup open or cluster spiderfied)
    let isUserInteracting = false;
    if (typeof map !== 'undefined' && map) {
        map.eachLayer(layer => {
            if (layer instanceof L.MarkerClusterGroup && layer._spiderfied) {
                isUserInteracting = true;
            }
            // ── SAFE POPUP CHECK (this was crashing the modals) ──
            if (layer.getPopup && typeof layer.getPopup === 'function') {
                const popup = layer.getPopup();
                if (popup && typeof popup.isOpen === 'function' && popup.isOpen()) {
                    isUserInteracting = true;
                }
            }
        });
    }
    if (isUserInteracting) return;

    // Light refresh — very cheap (glows, lock state, table)
    if (typeof clusteredMarkers !== 'undefined' && clusteredMarkers) {
        clusteredMarkers.eachLayer(m => {
            if (!m || !m.options || !m._icon) return;
            const loc = locations.find(l => l.id === m.options.id);
            if (!loc) return;

            const glow = isGlowing(loc);
            const icon = m._icon;

            if (glow && !icon.className.includes('glowing')) {
                m.setIcon(createMarkerIcon(loc));
                m.setZIndexOffset(10000);
            } else if (!glow && icon.className.includes('glowing')) {
                m.setIcon(createMarkerIcon(loc));
                m.setZIndexOffset(0);
            }

            if (loc.locked || loc.isPostcard) {
                m.dragging?.disable();
            } else {
                m.dragging?.enable();
            }
        });
    }

    // Continue with the rest of your light refresh (table, lock button, etc.)
    refreshTable(combinedSearch?.value || '', categoryFilter?.value || '');
    if (typeof updateLockAllBtn === 'function') updateLockAllBtn();
}, 8000);

// ——— IN-GAME NAME PERSISTENCE
const playerNameInput = document.getElementById('playerNameInput');
if (playerNameInput) {
    const saved = localStorage.getItem('fo76_playerName') || '';
    playerNameInput.value = saved;
    playerNameInput.addEventListener('input', () => {
        localStorage.setItem('fo76_playerName', playerNameInput.value.trim());
    });
}
// ── IMPROVED SHARED LINK / POSTCARD AUTO FLYTO + POPUP ──
const sharedLinkObserver = new MutationObserver(() => {
    if (!document.getElementById('welcomeModal')) {
        sharedLinkObserver.disconnect();
        const urlParams = new URLSearchParams(window.location.search);
        if (urlParams.has('postcard') || urlParams.has('permshare') || urlParams.has('lat')) {
            setTimeout(() => {
                clusteredMarkers.clearLayers();
                nonClusteredMarkers.clearLayers();
                renderCategoryToggles();
                updateCategoryDropdowns();
                forceReload();
                map.invalidateSize({ animate: false });

                if (urlParams.has('lat') && urlParams.has('lng')) {
                    const lat = parseFloat(urlParams.get('lat'));
                    const lng = parseFloat(urlParams.get('lng'));
                    if (!isNaN(lat) && !isNaN(lng)) {
                        setTimeout(() => {
                            map.flyTo([lat, lng], 5, { duration: 1.6, easeLinearity: 0.25 });

                            // Stronger popup search for shared markers
                            setTimeout(() => {
                                const target = [...clusteredMarkers.getLayers(), ...nonClusteredMarkers.getLayers()]
                                    .find(m => m.options && 
                                        Math.abs(m.options.lat - lat) < 0.002 && 
                                        Math.abs(m.options.lng - lng) < 0.002);
                                if (target) target.openPopup();
                            }, 2000);   // longer delay for full map render
                        }, 900);
                    }
                }
            }, 800);
        }
    }
});

if (!localStorage.getItem('fo76_welcome_accepted')) {
    sharedLinkObserver.observe(document.body, { childList: true, subtree: true });
}

// ── CONTEXT MENU (RIGHT-CLICK / LONG-PRESS) ──
map.doubleClickZoom.disable();

const contextMenu = document.getElementById('mapContextMenu');

function isClickOnMarkerOrCluster(e) {
    const target = e.target || (e.originalEvent && e.originalEvent.target);
    if (target && (target.closest('.leaflet-marker-icon') || target.closest('.leaflet-marker-cluster'))) return true;
    return false;
}

function showMapContextMenu(latlng) {

    const wasFullscreen = isFullscreenActive();

    if (wasFullscreen) {
        wasInFullscreenBeforeModal = true;
        exitedForContextMenu = true;

        // Use browser event to wait for the exit to complete
        const onExitComplete = function () {
            document.removeEventListener('fullscreenchange', onExitComplete);
            document.removeEventListener('webkitfullscreenchange', onExitComplete);

            if (map && typeof map.invalidateSize === 'function') {
                map.invalidateSize(true);
            }

            // Now safely show pin + modal
            showTempContextPin(latlng);
            contextMenu.style.display = 'block';
            document.body.classList.add('modal-open');
            window.lastContextLatLng = latlng;

            showTempMessage('📍 Choose Action — Create Marker or Postcard', 2200);
            playSound('click');
        };

        document.addEventListener('fullscreenchange', onExitComplete, { once: true });
        document.addEventListener('webkitfullscreenchange', onExitComplete, { once: true });

        exitFullscreen();
        return;
    }

    // Normal path (not in fullscreen)
    showTempContextPin(latlng);
    contextMenu.style.display = 'block';
    document.body.classList.add('modal-open');
    window.lastContextLatLng = latlng;

    showTempMessage('📍 Choose Action — Create Marker or Postcard', 2200);
    playSound('click');
}

function attachContextButtons() {
    const createMarkerBtn = document.getElementById('contextCreateMarkerBtn');
    const createPostcardBtn = document.getElementById('contextCreatePostcardBtn');

    if (createMarkerBtn) {
        createMarkerBtn.onclick = () => {
            playSound('click');
            removeTempContextPin();
            contextMenu.style.display = 'none';
            document.body.classList.remove('modal-open');
            if (window.lastContextLatLng) {
                tempLatLng = window.lastContextLatLng;
                openModal('Log Item');
            }
        };
    }

    if (createPostcardBtn) {
        createPostcardBtn.onclick = () => {
            playSound('click');
            removeTempContextPin();
            contextMenu.style.display = 'none';
            document.body.classList.remove('modal-open');
            if (window.lastContextLatLng) {
                currentPostcardLatLng = window.lastContextLatLng;
                postcardModal.style.display = 'block';
                document.getElementById('postcardMessage')?.focus();

                const postcardCloseBtn = postcardModal.querySelector('.close');
                if (postcardCloseBtn) {
                    postcardCloseBtn.onclick = () => {
                        removeTempContextPin();
                        closeModal(postcardModal);
                    };
                }
            }
        };
    }

    // ── FIXED: Remove pin when user clicks the X close button on the context menu ──
    const contextCloseBtn = contextMenu.querySelector('.close');
    if (contextCloseBtn) {
        contextCloseBtn.onclick = () => {
            removeTempContextPin();
            contextMenu.style.display = 'none';
            document.body.classList.remove('modal-open');
        };
    }
}

// Native listeners
const mapContainer = map.getContainer();

mapContainer.addEventListener('contextmenu', function(e) {
    e.preventDefault();
    e.stopImmediatePropagation();
    if (isClickOnMarkerOrCluster(e)) return;
    const latlng = map.mouseEventToLatLng(e);
    showMapContextMenu(latlng);
}, { passive: false });

let longPressTimer = null;
mapContainer.addEventListener('touchstart', function(e) {
    if (e.touches.length !== 1 || isClickOnMarkerOrCluster(e)) return;
    longPressTimer = setTimeout(() => {
        const point = map.mouseEventToContainerPoint(e.touches[0]);
        const latlng = map.containerPointToLatLng(point);
        showMapContextMenu(latlng);
    }, 550);
}, { passive: true });

mapContainer.addEventListener('touchend', () => clearTimeout(longPressTimer));
mapContainer.addEventListener('touchmove', () => clearTimeout(longPressTimer));
mapContainer.addEventListener('touchcancel', () => clearTimeout(longPressTimer));

// Attach the button handlers
attachContextButtons();

// ── Prevent unwanted jump-to-last-marker after Submit window closes ──
window.addEventListener('message', function (event) {
    if (event.data && event.data.type === 'SUBMIT_WINDOW_CLOSED') {
        // Explicitly suppress any auto-center or popup logic
        return;
    }
});

// ── Comprehensive Ultra-wide & Responsive Scaling (all screens) ──
function forceUltraWideScaling() {
    const isUltraWide = window.innerWidth >= 2500;

    // Handle ALL modals (Edit Item, context menu, etc.)
    document.querySelectorAll('.modal-content, #contextMenu, #itemModal .modal-content').forEach(el => {
        if (!el) return;

        if (isUltraWide) {
            el.style.setProperty('position', 'fixed', 'important');
            el.style.setProperty('top', '5vh', 'important');        // balanced height on ultra-wide
            el.style.setProperty('left', '50%', 'important');
            el.style.setProperty('transform', 'translateX(-50%)', 'important');
            el.style.setProperty('margin', '0', 'important');
        } else {
            // Restore normal behaviour on smaller screens
            el.style.position = '';
            el.style.top = '';
            el.style.transform = '';
            el.style.margin = '';
        }
    });
}

const modalObserver = new MutationObserver(forceUltraWideScaling);
modalObserver.observe(document.body, { childList: true, subtree: true });

// ── General UI Resize Fix ──
let resizeTimer;
function resizeUI() {
    if (map) map.invalidateSize({ animate: false });

    const uiElements = document.querySelectorAll(`
        #contextMenu, .modal, .modal-content,
        #buttonGroup, #searchBar, #tableContainer,
        #searchSuggestions, #locationsTable
    `);
    uiElements.forEach(el => {
        if (el) {
            const originalDisplay = el.style.display || '';
            el.style.display = 'none';
            void el.offsetWidth;
            el.style.display = originalDisplay;
        }
    });
}

window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(resizeUI, 120);
});

window.addEventListener('load', () => {
    setTimeout(resizeUI, 400);
});

// Initial run
setTimeout(forceUltraWideScaling, 300);

        // ── Mobile Landscape Optimisation (smaller screens only) ──
        // Reduces scrolling in landscape while keeping portrait mode 100% unchanged
        function optimiseMobileLandscape() {
    const width = window.innerWidth;
    const height = window.innerHeight;
    const isLandscape = width > height;
    const isSmallScreen = width < 900; // typical phone in landscape

    const mapEl       = document.getElementById('map');
    const buttonGroup = document.getElementById('buttonGroup');

    if (isLandscape && isSmallScreen) {
        // Make map slightly less tall so UI elements are easier to reach
        if (mapEl) {
            mapEl.style.height = '80vh';
            mapEl.style.maxHeight = '80vh';
        }

        // Slightly tighter tools panel
        if (buttonGroup) {
            buttonGroup.style.padding = '6px 4px';
            buttonGroup.style.gap = '6px';
        }
    } else {
        // Reset everything for portrait mode and larger screens
        if (mapEl) {
            mapEl.style.height = '';
            mapEl.style.maxHeight = '';
        }
        if (buttonGroup) {
            buttonGroup.style.padding = '';
            buttonGroup.style.gap = '';
        }
    }

    // Force Leaflet to redraw correctly – small delay helps speech bubbles stay open
    if (typeof map !== 'undefined' && map) {
        setTimeout(() => {
            map.invalidateSize({ animate: false });
        }, 120);
    }
}

// Run automatically on orientation change and resize
window.addEventListener('resize', optimiseMobileLandscape);
window.addEventListener('orientationchange', () => {
    setTimeout(optimiseMobileLandscape, 180);
});
// Initial run after page loads
setTimeout(optimiseMobileLandscape, 800);

/* ── CUSTOM IMMERSIVE MODE FOR iPHONE BROWSERS ONLY (Final v7 + iPad Sound Fix) ── */
/* Forces ✖ exit icon + shows capture button + permanent iPad sound unlock */
const isIphoneBrowser = () => {
    return /iPhone/.test(navigator.userAgent) &&
           !isIOSPWA() && 
           !/iPad/.test(navigator.userAgent);
};

let isImmersiveMode = false;

function toggleImmersiveMode() {
    isImmersiveMode = !isImmersiveMode;
    const body = document.body;

    if (isImmersiveMode) {
        body.classList.add('immersive-mode');
    } else {
        body.classList.remove('immersive-mode');
    }

    // Force map redraw
    setTimeout(() => {
        if (typeof map !== 'undefined' && map) map.invalidateSize({ animate: false });
    }, 50);

    // Force correct exit icon
    const fsContainer = fullscreenControl.getContainer();
    if (fsContainer) {
        const link = fsContainer.querySelector('a');
        if (link) {
            link.classList.toggle('immersive-active', isImmersiveMode);
            link.innerHTML = isImmersiveMode ? '✖' : '🔭';
        }
    }

    // Force capture button visibility
    const ssContainer = screenshotControl.getContainer();
    if (ssContainer) {
        ssContainer.style.display = isImmersiveMode ? 'block' : 'none';
    }

    updateFullscreenControls();
}

// Extend the fullscreen button for iPhone browsers only
setTimeout(() => {
    if (!isIphoneBrowser()) return;

    const fsContainer = fullscreenControl.getContainer();
    if (!fsContainer) return;
    const link = fsContainer.querySelector('a');
    if (!link) return;

    L.DomEvent.off(link, 'click');
    L.DomEvent.on(link, 'click', L.DomEvent.stopPropagation)
              .on(link, 'click', L.DomEvent.preventDefault)
              .on(link, 'click', () => {
                  playSound('click');
                  toggleImmersiveMode();
              });
}, 1500);

// ── Permanent stronger iPad sound unlock (never removed again) ──
if (/iPad/.test(navigator.userAgent)) {
    setTimeout(() => {
        unlockAudio();
    }, 1200);
}

// ── STRONGEST ANDROID PWA LANDSCAPE HEIGHT FIX (iOS untouched) ──
function forceAndroidLandscapeHeight() {
    // Only run on installed Android PWA in landscape
    if (window.matchMedia('(display-mode: standalone)').matches &&
        /android/i.test(navigator.userAgent) &&
        window.innerWidth > window.innerHeight) {

        const mapEl = document.getElementById('map');
        if (mapEl) {
            // Force a usable height (adjust this number if needed)
            mapEl.style.setProperty('height', '68vh', 'important');
            mapEl.style.setProperty('max-height', '68vh', 'important');
            mapEl.style.setProperty('min-height', '68vh', 'important');
        }

        // Force Leaflet to redraw correctly
        if (typeof map !== 'undefined' && map) {
            setTimeout(() => map.invalidateSize({ animate: false }), 120);
        }
    }
}

// Run aggressively on every possible trigger
window.addEventListener('load', forceAndroidLandscapeHeight);
window.addEventListener('resize', forceAndroidLandscapeHeight);
window.addEventListener('orientationchange', () => setTimeout(forceAndroidLandscapeHeight, 250));

// Extra safety runs
setTimeout(forceAndroidLandscapeHeight, 600);
setTimeout(forceAndroidLandscapeHeight, 1400);

// Extra safety for Android Chrome browser landscape modals
window.addEventListener('resize', () => {
    if (window.innerWidth > window.innerHeight) {   // only in landscape
        setTimeout(fixLandscapeModalPosition, 80);
    }
});

window.addEventListener('orientationchange', () => {
    setTimeout(fixLandscapeModalPosition, 180);
});

        // ── CONSOLE BANNER ──
console.log(
    '%c╔═════════════════════════════════════════════════════════════╗\n' +
    '║           FALLOUT 76 ITEM FINDER MAP                        ║\n' +
    '╚═════════════════════════════════════════════════════════════╝',
    'color:#00ff00; font-family:monospace; font-size:14px; font-weight:bold; background:#000; padding:6px 0; line-height:1.4;'
);

console.log(
    '%cWelcome, Vault Dweller!\n' +
    '──────────────────────────────────────────────────────────────\n' +
    '• Personal, non-commercial use only\n' +
    '• No copying, selling, or redistribution without permission\n' +
    '• Have fun exploring Appalachia — ❤️',
    'color:#00ff88; font-family:monospace; font-size:13px; line-height:1.65; background:#000; padding:8px 0;'
);

console.log(
    '%c──────────────────────────────────────────────────────────────\n' +
    '© ' + new Date().getFullYear() + ' MrCrazy — All rights reserved\n' +
    'Version: ' + CURRENT_APP_VERSION + ' • Made with ❤️ for the Fallout 76 Community\n' +
    '──────────────────────────────────────────────────────────────',
    'color:#888888; font-family:monospace; font-size:12px; background:#000; padding:6px 0; line-height:1.4;'
);
    })();
});
