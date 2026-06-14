const KEY = "seld_device_id";

function makeId() {
  // RFC-4122 v4-ish, fine for anonymous device id
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export function getDeviceId() {
  if (typeof window === "undefined") return "server";
  let id = localStorage.getItem(KEY);
  if (!id) {
    id = makeId();
    localStorage.setItem(KEY, id);
  }
  return id;
}
