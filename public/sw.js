// public/sw.js
const CACHE_NAME = "bbms-offline-v1";

// App shell URLs to cache
const APP_SHELL = ["/", "/donors", "/visits", "/sync"];

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

// ── Message handler: trigger background sync ─────────────────
self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "TRIGGER_SYNC") {
    // Notify all clients that sync is available
    self.clients.matchAll().then((clients) => {
      clients.forEach((client) => {
        client.postMessage({ type: "SYNC_AVAILABLE" });
      });
    });
  }
});

// ── Background Sync: sync queue when back online ───────────
self.addEventListener("sync", (event) => {
  if (event.tag === "bbms-sync-queue") {
    event.waitUntil(
      self.clients.matchAll().then((clients) => {
        clients.forEach((client) => {
          client.postMessage({ type: "SYNC_QUEUE" });
        });
      })
    );
  }
});

// ── Fetch: Network first, fall back to cache ─────────────────
self.addEventListener("fetch", (event) => {
  // Only handle GET requests
  if (event.request.method !== "GET") return;

  // Skip cross-origin requests (analytics, fonts CDN etc.)
  if (!event.request.url.startsWith(self.location.origin)) return;

  // For API calls → stale-while-revalidate (cache then update)
  if (event.request.url.includes("/api/")) {
    event.respondWith(
      caches.match(event.request).then((cachedResponse) => {
        const fetchPromise = fetch(event.request).then((networkResponse) => {
          if (networkResponse.ok) {
            const clone = networkResponse.clone();
            caches
              .open(CACHE_NAME)
              .then((cache) => cache.put(event.request, clone));
          }
          return networkResponse;
        }).catch(() => {
          // If network fails, return cached if available
          return cachedResponse;
        });
        // Return cached first if available, otherwise wait for network
        return cachedResponse || fetchPromise;
      })
    );
    return;
  }

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
