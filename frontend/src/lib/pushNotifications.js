import { supabase } from "@/lib/supabase";

const DEVICE_KEY = "seldaesthetic-push-device-id";
const SERVICE_WORKER_PATH = "/firebase-messaging-sw.js";

function getDeviceId() {
  let id = localStorage.getItem(DEVICE_KEY);
  if (!id) {
    id = crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    localStorage.setItem(DEVICE_KEY, id);
  }
  return id;
}

function urlBase64ToUint8Array(base64String) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  return Uint8Array.from([...rawData].map((char) => char.charCodeAt(0)));
}

async function getPublicKey() {
  const { data, error } = await supabase.rpc("get_web_push_public_key");
  if (error) throw error;
  if (!data) throw new Error("Push-nøkkelen mangler");
  return data;
}

async function getServiceWorkerRegistration() {
  const registration = await navigator.serviceWorker.register(SERVICE_WORKER_PATH, {
    updateViaCache: "none",
  });
  await registration.update();
  return registration;
}

export async function registerPushNotifications(_userId = null, { requestPermission = false } = {}) {
  if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) return null;
  if (Notification.permission === "denied") return null;

  if (requestPermission && Notification.permission === "default") {
    const permission = await Notification.requestPermission();
    if (permission !== "granted") return null;
  }
  if (Notification.permission !== "granted") return null;

  const registration = await getServiceWorkerRegistration();
  const existing = await registration.pushManager.getSubscription();
  const publicKey = await getPublicKey();
  const subscription = existing || await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(publicKey),
  });

  const json = subscription.toJSON();
  const { error } = await supabase.rpc("register_web_push_subscription", {
    p_device_id: getDeviceId(),
    p_endpoint: subscription.endpoint,
    p_subscription: json,
    p_platform: "web",
    p_user_agent: navigator.userAgent,
    p_notifications_offers: true,
    p_notifications_news: true,
    p_notifications_loyalty: true,
  });
  if (error) throw error;
  return subscription;
}

export async function enablePushNotifications(userId = null) {
  return registerPushNotifications(userId, { requestPermission: true });
}

export async function disablePushNotifications() {
  if ("serviceWorker" in navigator) {
    const registration = await navigator.serviceWorker.getRegistration(SERVICE_WORKER_PATH);
    const subscription = await registration?.pushManager.getSubscription();
    if (subscription) await subscription.unsubscribe();
  }

  const deviceId = localStorage.getItem(DEVICE_KEY);
  if (!deviceId) return;
  const { error } = await supabase.rpc("disable_web_push_subscription", { p_device_id: deviceId });
  if (error) throw error;
}
