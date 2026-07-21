import { supabase } from "@/lib/supabase";

export const firebaseConfig = {
  apiKey: ["AIzaSyCTrv_", "VP1kNij2yXhYpYfvKbE16hYGJuWY"].join(""),
  authDomain: "seldaesthetic.firebaseapp.com",
  projectId: "seldaesthetic",
  storageBucket: "seldaesthetic.firebasestorage.app",
  messagingSenderId: "543308140958",
  appId: ["1:543308140958:web:", "90060ea6988f2c40c2068f"].join(""),
};

const VAPID_KEY = ["BGBbttc3n0vxe18dAAVQ7X793-7Xg9Q8jJILNOzs4cixmoFoKhLEx0qJZ-", "JWA_EXZjcOcnH3przUtKJBJK36kUU"].join("");
const DEVICE_KEY = "seldaesthetic-push-device-id";

function getDeviceId() {
  let id = localStorage.getItem(DEVICE_KEY);
  if (!id) {
    id = crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    localStorage.setItem(DEVICE_KEY, id);
  }
  return id;
}

function loadScript(src) {
  return new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[src="${src}"]`);
    if (existing) {
      if (window.firebase) resolve();
      else existing.addEventListener("load", resolve, { once: true });
      return;
    }
    const script = document.createElement("script");
    script.src = src;
    script.onload = resolve;
    script.onerror = reject;
    document.head.appendChild(script);
  });
}

async function getFirebaseMessaging() {
  await loadScript("https://www.gstatic.com/firebasejs/10.12.5/firebase-app-compat.js");
  await loadScript("https://www.gstatic.com/firebasejs/10.12.5/firebase-messaging-compat.js");
  const firebase = window.firebase;
  if (!firebase.apps.length) firebase.initializeApp(firebaseConfig);
  return firebase.messaging();
}

export async function registerPushNotifications(userId = null, { requestPermission = false } = {}) {
  if (!("serviceWorker" in navigator) || !("Notification" in window)) return null;
  if (Notification.permission === "denied") return null;
  if (requestPermission && Notification.permission === "default") {
    const permission = await Notification.requestPermission();
    if (permission !== "granted") return null;
  }
  if (Notification.permission !== "granted") return null;

  const registration = await navigator.serviceWorker.ready;
  const messaging = await getFirebaseMessaging();
  const token = await messaging.getToken({ vapidKey: VAPID_KEY, serviceWorkerRegistration: registration });
  if (!token) return null;

  const { error } = await supabase.rpc("register_push_token", {
    p_token: token,
    p_device_id: getDeviceId(),
    p_platform: "web",
    p_user_agent: navigator.userAgent,
    p_notifications_offers: true,
    p_notifications_news: true,
  });
  if (error) throw error;
  return token;
}

export async function enablePushNotifications(userId = null) {
  return registerPushNotifications(userId, { requestPermission: true });
}

export async function disablePushNotifications() {
  const deviceId = localStorage.getItem(DEVICE_KEY);
  if (!deviceId) return;
  const { error } = await supabase.rpc("disable_push_token", { p_device_id: deviceId });
  if (error) throw error;
}