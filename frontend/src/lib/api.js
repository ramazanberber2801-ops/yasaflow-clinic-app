import axios from "axios";
import { supabase } from "@/lib/supabase";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
export const API = `${BACKEND_URL}/api`;
export const BACKEND_ORIGIN = BACKEND_URL;

export const api = axios.create({
  baseURL: API,
  headers: { "Content-Type": "application/json" },
});

api.interceptors.request.use(async (config) => {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Public
export const listOffers = () => api.get("/offers").then((r) => r.data);
export const getLoyalty = (deviceId) => api.get(`/loyalty/${deviceId}`).then((r) => r.data);

// Admin (verified by Supabase session + profiles.role = admin)
export const adminVerify = () => api.get("/admin/verify").then((r) => r.data);
export const createOffer = (data) => api.post("/offers", data).then((r) => r.data);
export const updateOffer = (id, data) => api.put(`/offers/${id}`, data).then((r) => r.data);
export const deleteOffer = (id) => api.delete(`/offers/${id}`).then((r) => r.data);
export const stampLoyalty = (deviceId) =>
  api.post("/loyalty/stamp", { device_id: deviceId }).then((r) => r.data);
export const resetLoyalty = (deviceId) =>
  api.post("/loyalty/reset", { device_id: deviceId }).then((r) => r.data);
export const unstampLoyalty = (deviceId) =>
  api.post("/loyalty/unstamp", { device_id: deviceId }).then((r) => r.data);
export const saveLoyaltyProfile = (deviceId, name, phone) =>
  axios
    .post(
      `${API}/loyalty/profile`,
      { device_id: deviceId, name, phone },
      { headers: { "Content-Type": "application/json" } }
    )
    .then((r) => r.data);

export const deleteCustomer = (deviceId) =>
  api.delete(`/admin/loyalty/${deviceId}`).then((r) => r.data);

export const transferStamps = (fromDeviceId, toDeviceId) =>
  api
    .post("/admin/loyalty/transfer", {
      from_device_id: fromDeviceId,
      to_device_id: toDeviceId,
    })
    .then((r) => r.data);
export const listLoyalty = () => api.get("/admin/loyalty").then((r) => r.data);
export const getLoyaltyHistory = (deviceId) =>
  api.get(`/admin/loyalty/${deviceId}/history`).then((r) => r.data);

export const uploadImage = (file, onProgress) => {
  const fd = new FormData();
  fd.append("file", file);
  return api
    .post("/upload", fd, {
      headers: { "Content-Type": "multipart/form-data" },
      onUploadProgress: onProgress,
    })
    .then((r) => ({ ...r.data, full_url: `${BACKEND_ORIGIN}${r.data.url}` }));
};
