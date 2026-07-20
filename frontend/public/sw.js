const VERSION = "seldaesthetic-pwa-v1";

self.addEventListener("install", () => {
  // Activate the newest deployed version without waiting for every old tab to close.
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    Promise.all([
      // Remove caches left by older service-worker versions.
      caches.keys().then((keys) =>
        Promise.all(keys.filter((key) => key !== VERSION).map((key) => caches.delete(key))),
      ),
      self.clients.claim(),
    ]),
  );
});

// Deliberately use the network for app files. Vercel serves the newest deployment,
// so customers do not get stuck on an old cached bundle after an update.
self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;

  event.respondWith(
    fetch(event.request).catch(() => caches.match(event.request)),
  );
});
