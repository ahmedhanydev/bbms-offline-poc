// public/sw.js
const CACHE_NAME = "bbms-offline-v1";

// Add every JS/CSS chunk Next.js generates + the root page
const APP_SHELL = ["/"];

// ── Install: cache the app shell ──────────────────────────────
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL))
  );
  self.skipWaiting();
});

// ── Activate: delete old caches ───────────────────────────────
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key !== CACHE_NAME)
            .map((key) => caches.delete(key))
        )
      )
  );
  self.clients.claim();
});

// ── Fetch: Network first, fall back to cache ─────────────────
self.addEventListener("fetch", (event) => {
  // Only handle GET requests
  if (event.request.method !== "GET") return;

  // Skip cross-origin requests (analytics, fonts CDN etc.)
  if (!event.request.url.startsWith(self.location.origin)) return;

  // For API calls → network only, never cache
  if (event.request.url.includes("/api/")) return;

  event.respondWith(
    fetch(event.request)
      .then((networkResponse) => {
        // Cache a copy of every successful page/asset response
        if (
          networkResponse.ok &&
          (event.request.destination === "document" ||
            event.request.destination === "script" ||
            event.request.destination === "style")
        ) {
          const clone = networkResponse.clone();
          caches
            .open(CACHE_NAME)
            .then((cache) => cache.put(event.request, clone));
        }
        return networkResponse;
      })
      .catch(() => {
        // Network failed → serve from cache
        return caches.match(event.request).then(
          (cached) => cached || caches.match("/") // fallback to root
        );
      })
  );
});
