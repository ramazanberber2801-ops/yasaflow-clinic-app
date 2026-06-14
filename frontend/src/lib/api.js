import axios from "axios";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
export const API = `${BACKEND_URL}/api`;

export const api = axios.create({
  baseURL: API,
  headers: { "Content-Type": "application/json" },
});

// Offers
export const listOffers = () => api.get("/offers").then((r) => r.data);
export const createOffer = (data) => api.post("/offers", data).then((r) => r.data);
export const updateOffer = (id, data) => api.put(`/offers/${id}`, data).then((r) => r.data);
export const deleteOffer = (id) => api.delete(`/offers/${id}`).then((r) => r.data);

// Loyalty
export const getLoyalty = (deviceId) => api.get(`/loyalty/${deviceId}`).then((r) => r.data);
export const stampLoyalty = (deviceId) =>
  api.post("/loyalty/stamp", { device_id: deviceId }).then((r) => r.data);
export const resetLoyalty = (deviceId) =>
  api.post("/loyalty/reset", { device_id: deviceId }).then((r) => r.data);

// Admin
export const adminLogin = (password) =>
  api.post("/admin/login", { password }).then((r) => r.data);
