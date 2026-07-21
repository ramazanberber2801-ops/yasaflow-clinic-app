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

const throwIfError = (error) => {
  if (error) throw error;
};

const normalizeCard = (row, profile = null) => ({
  device_id: row.user_id,
  user_id: row.user_id,
  stamps: row.stamps || 0,
  total_completed: row.total_completed || 0,
  last_stamped_at: row.last_stamped_at,
  created_at: row.created_at,
  name: profile?.full_name || null,
  phone: profile?.phone || null,
  email: profile?.email || null,
  birth_date: profile?.birth_date || null,
  language: profile?.language || null,
  tags: profile?.tags || [],
  admin_notes: profile?.admin_notes || "",
});

const PROFILE_FIELDS = "id,full_name,phone,birth_date,language,tags,admin_notes,created_at,updated_at";

// Offers still use the existing backend.
export const listOffers = () => api.get("/offers").then((r) => r.data);
export const createOffer = (data) => api.post("/offers", data).then((r) => r.data);
export const updateOffer = (id, data) => api.put(`/offers/${id}`, data).then((r) => r.data);
export const deleteOffer = (id) => api.delete(`/offers/${id}`).then((r) => r.data);
export const adminVerify = () => api.get("/admin/verify").then((r) => r.data);

// Account-based loyalty in Supabase.
export const getLoyalty = async (userId) => {
  const { data: sessionData } = await supabase.auth.getSession();
  const currentUser = sessionData.session?.user;
  if (!currentUser) throw new Error("Du må være logget inn");

  if (currentUser.id === userId) {
    const { data, error } = await supabase.rpc("ensure_loyalty_card");
    throwIfError(error);
    const row = Array.isArray(data) ? data[0] : data;
    return normalizeCard(row, {
      full_name: currentUser.user_metadata?.full_name,
      phone: currentUser.user_metadata?.phone,
      email: currentUser.email,
    });
  }

  const { data: row, error } = await supabase
    .from("loyalty_cards")
    .select("*")
    .eq("user_id", userId)
    .single();
  throwIfError(error);
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select(PROFILE_FIELDS)
    .eq("id", userId)
    .maybeSingle();
  throwIfError(profileError);
  return normalizeCard(row, profile);
};

export const saveLoyaltyProfile = async (_userId, name, phone) => {
  const { data: authData, error: authError } = await supabase.auth.updateUser({
    data: { full_name: name, phone },
  });
  throwIfError(authError);
  const user = authData.user;
  const { error } = await supabase.from("profiles").upsert({
    id: user.id,
    full_name: name,
    phone,
    updated_at: new Date().toISOString(),
  }, { onConflict: "id" });
  throwIfError(error);
  return { name, phone };
};

export const listCustomers = async () => {
  const [{ data: profiles, error }, { data: cards, error: cardsError }] = await Promise.all([
    supabase.from("profiles").select(PROFILE_FIELDS).eq("role", "customer").order("created_at", { ascending: false }),
    supabase.from("loyalty_cards").select("*"),
  ]);
  throwIfError(error);
  throwIfError(cardsError);
  const cardMap = new Map((cards || []).map((card) => [card.user_id, card]));
  return (profiles || []).map((profile) => normalizeCard(
    cardMap.get(profile.id) || {
      user_id: profile.id,
      stamps: 0,
      total_completed: 0,
      created_at: profile.created_at,
    },
    profile,
  ));
};

export const updateCustomer = async (userId, updates) => {
  const payload = {
    full_name: updates.name?.trim() || null,
    phone: updates.phone?.trim() || null,
    birth_date: updates.birth_date || null,
    language: updates.language || null,
    tags: Array.isArray(updates.tags) ? updates.tags : [],
    admin_notes: updates.admin_notes?.trim() || null,
    updated_at: new Date().toISOString(),
  };
  const { data, error } = await supabase
    .from("profiles")
    .update(payload)
    .eq("id", userId)
    .select(PROFILE_FIELDS)
    .single();
  throwIfError(error);
  return data;
};

export const listLoyalty = listCustomers;

const changeStamp = async (userId, type) => {
  let { data: current, error } = await supabase
    .from("loyalty_cards")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();
  throwIfError(error);

  if (!current) {
    const { data: created, error: createError } = await supabase
      .from("loyalty_cards")
      .insert({ user_id: userId, stamps: 0, total_completed: 0 })
      .select("*")
      .single();
    throwIfError(createError);
    current = created;
  }

  let stamps = current.stamps || 0;
  let totalCompleted = current.total_completed || 0;
  if (type === "stamp") {
    if (stamps >= 10) throw new Error("Kortet er fullt");
    stamps += 1;
  } else if (type === "unstamp") {
    stamps = Math.max(0, stamps - 1);
  } else if (type === "reset") {
    if (stamps >= 10) totalCompleted += 1;
    stamps = 0;
  }

  const now = new Date().toISOString();
  const { data: updated, error: updateError } = await supabase
    .from("loyalty_cards")
    .update({
      stamps,
      total_completed: totalCompleted,
      last_stamped_at: type === "stamp" ? now : current.last_stamped_at,
      updated_at: now,
    })
    .eq("user_id", userId)
    .select("*")
    .single();
  throwIfError(updateError);

  const { data: sessionData } = await supabase.auth.getSession();
  const { error: eventError } = await supabase.from("loyalty_events").insert({
    user_id: userId,
    event_type: type,
    stamps_after: stamps,
    created_by: sessionData.session?.user?.id || null,
  });
  throwIfError(eventError);
  return normalizeCard(updated);
};

export const stampLoyalty = (userId) => changeStamp(userId, "stamp");
export const unstampLoyalty = (userId) => changeStamp(userId, "unstamp");
export const resetLoyalty = (userId) => changeStamp(userId, "reset");

export const getLoyaltyHistory = async (userId) => {
  const [card, { data: events, error }] = await Promise.all([
    getLoyalty(userId),
    supabase.from("loyalty_events").select("*").eq("user_id", userId).order("created_at", { ascending: false }),
  ]);
  throwIfError(error);
  return {
    card,
    events: (events || []).map((event) => ({ ...event, type: event.event_type })),
  };
};

export const deleteCustomer = async (userId) => {
  const { error } = await supabase.from("loyalty_cards").delete().eq("user_id", userId);
  throwIfError(error);
  return { deleted: true };
};
export const transferStamps = async () => { throw new Error("Overføring er ikke tilgjengelig for kontobaserte kort"); };

// In-app notifications.
export const listNotifications = async () => {
  const { data, error } = await supabase.from("notifications").select("*").order("created_at", { ascending: false });
  throwIfError(error);
  return data || [];
};

export const createNotification = async (payload) => {
  const { data: sessionData } = await supabase.auth.getSession();
  const createdBy = sessionData.session?.user?.id || null;
  const targetIds = Array.isArray(payload.target_user_ids)
    ? [...new Set(payload.target_user_ids.filter(Boolean))]
    : payload.target_user_id
      ? [payload.target_user_id]
      : [];

  const base = {
    title: payload.title,
    message: payload.message,
    category: payload.category || "news",
    created_by: createdBy,
  };
  const rows = targetIds.length
    ? targetIds.map((targetUserId) => ({ ...base, target_user_id: targetUserId }))
    : [{ ...base, target_user_id: null }];

  const { data, error } = await supabase.from("notifications").insert(rows).select("*");
  throwIfError(error);
  return data || [];
};

export const markNotificationRead = async (notificationId) => {
  const { data: sessionData } = await supabase.auth.getSession();
  const userId = sessionData.session?.user?.id;
  if (!userId) return;
  const { error } = await supabase.from("notification_reads").upsert({ notification_id: notificationId, user_id: userId });
  throwIfError(error);
};

export const uploadImage = (file, onProgress) => {
  const fd = new FormData();
  fd.append("file", file);
  return api.post("/upload", fd, {
    headers: { "Content-Type": "multipart/form-data" },
    onUploadProgress: onProgress,
  }).then((r) => ({ ...r.data, full_url: `${BACKEND_ORIGIN}${r.data.url}` }));
};