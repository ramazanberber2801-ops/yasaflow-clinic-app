const CACHE_NAME = "seldaesthetic-push-v1";

self.addEventListener("install", (event) => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    const names = await caches.keys();
    await Promise.all(names.filter((name) => name.startsWith("seldaesthetic-push-") && name !== CACHE_NAME).map((name) => caches.delete(name)));
    await self.clients.claim();
  })());
});

self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { body: event.data?.text() || "Du har fått et nytt varsel" };
  }

  const title = data.title || "Seldaesthetic";
  const messageId = data.message_id || null;
  const targetUrl = data.url || "/varsler";

  event.waitUntil(self.registration.showNotification(title, {
    body: data.body || data.message || "Du har fått et nytt varsel",
    icon: "/logo192.png",
    badge: "/logo192.png",
    vibrate: [250, 120, 250],
    tag: messageId ? `seldaesthetic-${messageId}` : `seldaesthetic-${Date.now()}`,
    renotify: true,
    data: { url: targetUrl, message_id: messageId },
  }));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const target = new URL(event.notification.data?.url || "/varsler", self.location.origin).href;

  event.waitUntil((async () => {
    const windows = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
    for (const client of windows) {
      if ("navigate" in client) await client.navigate(target);
      if ("focus" in client) return client.focus();
    }
    return self.clients.openWindow(target);
  })());
});

self.addEventListener("message", (event) => {
  if (event.data?.type === "SKIP_WAITING") self.skipWaiting();
});
