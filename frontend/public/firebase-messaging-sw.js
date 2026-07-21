/* global firebase */
importScripts("https://www.gstatic.com/firebasejs/10.12.5/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.12.5/firebase-messaging-compat.js");

const params = new URL(self.location.href).searchParams;
const firebaseConfig = {
  apiKey: params.get("apiKey"),
  authDomain: params.get("authDomain"),
  projectId: params.get("projectId"),
  storageBucket: params.get("storageBucket"),
  messagingSenderId: params.get("messagingSenderId"),
  appId: params.get("appId"),
};

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));

const showPushNotification = (payload = {}) => {
  const data = payload.data || {};
  const notification = payload.notification || {};
  const title = data.title || notification.title || "Seldaesthetic";
  const body = data.body || data.message || notification.body || "Du har fått et nytt varsel";
  const url = data.url || "/varsler";

  return self.registration.showNotification(title, {
    body,
    icon: "/logo192.png",
    badge: "/logo192.png",
    vibrate: [250, 120, 250],
    requireInteraction: false,
    renotify: true,
    tag: `seldaesthetic-${Date.now()}`,
    data: { url },
  });
};

if (firebaseConfig.apiKey && !firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
  const messaging = firebase.messaging();
  messaging.onBackgroundMessage((payload) => showPushNotification(payload));
}

self.addEventListener("push", (event) => {
  if (!event.data) return;
  try {
    const payload = event.data.json();
    if (payload?.data?.title || payload?.notification?.title) {
      event.waitUntil(showPushNotification(payload));
    }
  } catch (error) {
    console.warn("Kunne ikke lese push-melding:", error);
  }
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const target = event.notification.data?.url || "/varsler";
  event.waitUntil(self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((windows) => {
    const existing = windows.find((client) => "focus" in client);
    if (existing) {
      existing.navigate(target);
      return existing.focus();
    }
    return self.clients.openWindow(target);
  }));
});
