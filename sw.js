/**
 * MSP Device Manager — Service Worker
 * Cache-first for static assets, network-first for API calls.
 */

const CACHE_VERSION = 'msp-dm-v1';
const API_CACHE = 'msp-dm-api-v1';
const CDN_CACHE = 'msp-dm-cdn-v1';

const CDN_MAX_AGE = 7 * 24 * 60 * 60 * 1000; // 7 days

// Static assets to pre-cache on install
const PRE_CACHE_URLS = [
  './',
  './index.html',
  './css/design-system.css',
  './css/layout.css',
  './css/components.css',
  './css/mobile.css',
  './js/state.js',
  './js/auth.js',
  './js/graph.js',
  './js/router.js',
  './js/dashboard.js',
  './js/devices.js',
  './js/tenants.js',
  './js/licensing.js',
  './js/settings.js',
  './js/pwa.js',
  './manifest.json'
];

const OFFLINE_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>MSP Device Manager — Offline</title>
<style>
  *{margin:0;padding:0;box-sizing:border-box}
  body{font-family:'Inter',system-ui,-apple-system,sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;background:#f8fafc;color:#1e293b}
  .card{text-align:center;padding:3rem 2rem;background:#fff;border-radius:1rem;box-shadow:0 1px 3px rgba(0,0,0,.1);max-width:420px;width:90%}
  .icon{font-size:3rem;margin-bottom:1rem}
  h1{font-size:1.25rem;font-weight:600;margin-bottom:.5rem}
  p{color:#64748b;font-size:.9rem;line-height:1.5;margin-bottom:1.5rem}
  button{background:#2563eb;color:#fff;border:none;padding:.6rem 1.5rem;border-radius:.5rem;font-size:.9rem;cursor:pointer;font-weight:500}
  button:hover{background:#1d4ed8}
</style>
</head>
<body>
<div class="card">
  <div class="icon">&#x1F4F6;</div>
  <h1>You're Offline</h1>
  <p>MSP Device Manager needs an internet connection for most features. Please check your connection and try again.</p>
  <button onclick="location.reload()">Retry</button>
</div>
</body>
</html>`;

// ─── Install ─────────────────────────────────────────────────────────
self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_VERSION).then((cache) => {
      return cache.addAll(PRE_CACHE_URLS).catch((err) => {
        console.warn('[SW] Pre-cache partial failure:', err);
      });
    })
  );
});

// ─── Activate ────────────────────────────────────────────────────────
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys
          .filter((key) => key !== CACHE_VERSION && key !== API_CACHE && key !== CDN_CACHE)
          .map((key) => {
            console.log('[SW] Removing old cache:', key);
            return caches.delete(key);
          })
      );
    }).then(() => self.clients.claim())
  );
});

// ─── Fetch ───────────────────────────────────────────────────────────
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Only handle GET requests
  if (event.request.method !== 'GET') return;

  // Microsoft Graph API — network first, cache fallback
  if (url.hostname === 'graph.microsoft.com') {
    event.respondWith(networkFirst(event.request, API_CACHE));
    return;
  }

  // CDN resources — cache first with 7-day expiry
  if (url.hostname === 'cdn.jsdelivr.net') {
    event.respondWith(cacheFirstWithExpiry(event.request, CDN_CACHE, CDN_MAX_AGE));
    return;
  }

  // Same-origin static assets — cache first, update cache in background
  if (url.origin === self.location.origin) {
    event.respondWith(cacheFirstThenNetwork(event.request));
    return;
  }

  // Everything else — just fetch normally
  event.respondWith(fetch(event.request).catch(() => offlineResponse()));
});

// ─── Strategies ──────────────────────────────────────────────────────

/**
 * Cache-first with network update (stale-while-revalidate style).
 * Used for same-origin static assets.
 */
async function cacheFirstThenNetwork(request) {
  const cache = await caches.open(CACHE_VERSION);
  const cached = await cache.match(request);

  if (cached) {
    // Update cache in the background
    fetchAndCache(request, cache);
    return cached;
  }

  try {
    const response = await fetch(request);
    if (response.ok) {
      cache.put(request, response.clone());
    }
    return response;
  } catch (err) {
    return offlineResponse();
  }
}

/**
 * Network-first with cache fallback.
 * Used for API calls.
 */
async function networkFirst(request, cacheName) {
  const cache = await caches.open(cacheName);

  try {
    const response = await fetch(request);
    if (response.ok) {
      cache.put(request, response.clone());
    }
    return response;
  } catch (err) {
    const cached = await cache.match(request);
    if (cached) return cached;
    return new Response(JSON.stringify({ error: 'offline', message: 'No network connection' }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

/**
 * Cache-first with time-based expiry.
 * Used for CDN resources.
 */
async function cacheFirstWithExpiry(request, cacheName, maxAge) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);

  if (cached) {
    const dateHeader = cached.headers.get('sw-cache-time');
    if (dateHeader) {
      const age = Date.now() - parseInt(dateHeader, 10);
      if (age < maxAge) return cached;
    } else {
      // No timestamp — serve it but refresh in background
      fetchAndCacheWithTimestamp(request, cache);
      return cached;
    }
  }

  try {
    return await fetchAndCacheWithTimestamp(request, cache);
  } catch (err) {
    if (cached) return cached;
    return offlineResponse();
  }
}

/**
 * Fetch and store in cache (fire-and-forget for background update).
 */
function fetchAndCache(request, cache) {
  fetch(request)
    .then((response) => {
      if (response.ok) cache.put(request, response);
    })
    .catch(() => {});
}

/**
 * Fetch, stamp with a cache time header, and store.
 */
async function fetchAndCacheWithTimestamp(request, cache) {
  const response = await fetch(request);
  if (response.ok) {
    const headers = new Headers(response.headers);
    headers.set('sw-cache-time', Date.now().toString());
    const stamped = new Response(await response.clone().blob(), {
      status: response.status,
      statusText: response.statusText,
      headers
    });
    cache.put(request, stamped);
  }
  return response;
}

/**
 * Return a simple offline page when nothing else works.
 */
function offlineResponse() {
  return new Response(OFFLINE_HTML, {
    status: 503,
    headers: { 'Content-Type': 'text/html; charset=utf-8' }
  });
}

// ─── Messages ────────────────────────────────────────────────────────
self.addEventListener('message', (event) => {
  if (event.data === 'skipWaiting') {
    self.skipWaiting();
  }
});
