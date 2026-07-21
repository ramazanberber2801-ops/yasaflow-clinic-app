import { supabase } from "@/lib/supabase";

const firebaseConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID,
  storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.REACT_APP_FIREBASE_APP_ID,
};

const VAPID_KEY = process.env.REACT_APP_FIREBASE_VAPID_KEY;

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
  if (!firebaseConfig.apiKey || !VAPID_KEY) throw new Error("Firebase push er ikke konfigurert");
  await loadScript("https://www.gstatic.com/firebasejs/10.12.5/firebase-app-compat.js");
  await loadScript("https://www.gstatic.com/firebasejs/10.12.5/firebase-messaging-compat.js");
  const firebase = window.firebase;
  if (!firebase.apps.length) firebase.initializeApp(firebaseConfig);
  return firebase.messaging();
}

export async function registerPushNotifications(userId, { requestPermission = false } = {}) {
  if (!userId || !("serviceWorker" in navigator) || !("Notification" in window)) return null;
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

  const { error } = await supabase.from("push_tokens").upsert({
    user_id: userId,
    token,
    platform: "web",
    user_agent: navigator.userAgent,
    updated_at: new Date().toISOString(),
  }, { onConflict: "token" });
  if (error) throw error;
  return token;
}

export async function enablePushNotifications(userId) {
  return registerPushNotifications(userId, { requestPermission: true });
}
