import axios from "axios";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
export const API = `${BACKEND_URL}/api`;
export const BACKEND_ORIGIN = BACKEND_URL;

const TOKEN_KEY = "seld_admin_token";

export const setAdminToken = (token) => sessionStorage.setItem(TOKEN_KEY, token);
export const getAdminToken = () => sessionStorage.getItem(TOKEN_KEY);
export const clearAdminToken = () => sessionStorage.removeItem(TOKEN_KEY);

export const api = axios.create({
  baseURL: API,
  headers: { "Content-Type": "application/json" },
});

api.interceptors.request.use((config) => {
  const t = getAdminToken();
  if (t) config.headers.Authorization = `Bearer ${t}`;
  return config;
});

api.interceptors.response.use(
  (r) => r,
  (err) => {
    if (err?.response?.status === 401 && getAdminToken()) {
      clearAdminToken();
      sessionStorage.removeItem("seld_admin");
    }
    return Promise.reject(err);
  }
);

// Public
export const listOffers = () => api.get("/offers").then((r) => r.data);
export const getLoyalty = (deviceId) => api.get(`/loyalty/${deviceId}`).then((r) => r.data);
export const adminLogin = (password) =>
  api.post("/admin/login", { password }).then((r) => r.data);

// Admin (require Bearer)
export const adminVerify = () => api.get("/admin/verify").then((r) => r.data);
export const createOffer = (data) => api.post("/offers", data).then((r) => r.data);
export const updateOffer = (id, data) => api.put(`/offers/${id}`, data).then((r) => r.data);
export const deleteOffer = (id) => api.delete(`/offers/${id}`).then((r) => r.data);
export const stampLoyalty = (deviceId) =>
  api.post("/loyalty/stamp", { device_id: deviceId }).then((r) => r.data);
export const resetLoyalty = (deviceId) =>
  api.post("/loyalty/reset", { device_id: deviceId }).then((r) => r.data);
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
