import axios from "axios";
import { supabase } from "@/lib/supabase";
import { getCurrentClinicId } from "@/lib/currentClinic";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
export const API = `${BACKEND_URL}/api`;
export const BACKEND_ORIGIN = BACKEND_URL;

export const api = axios.create({ baseURL: API, headers: { "Content-Type": "application/json" } });
api.interceptors.request.use(async (config) => { const { data } = await supabase.auth.getSession(); const token = data.session?.access_token; if (token) config.headers.Authorization = `Bearer ${token}`; return config; });
const throwIfError = (error) => { if (error) throw error; };

const normalizeCard = (row, profile = null) => ({
  device_id: row.user_id, user_id: row.user_id, stamps: row.stamps || 0,
  total_completed: row.total_completed || 0, last_stamped_at: row.last_stamped_at,
  created_at: row.created_at, campaign_id: row.campaign_id || null,
  campaign_name: row.campaign_name || "Lojalitetskort", reward: row.reward || "Belønning",
  stamp_goal: row.stamp_goal || 10, name: profile?.full_name || null,
  phone: profile?.phone || null, email: profile?.email || null,
  birth_date: profile?.birth_date || null, language: profile?.language || null,
  tags: profile?.tags || [], admin_notes: profile?.admin_notes || "",
});
const PROFILE_FIELDS = "id,full_name,phone,birth_date,language,tags,admin_notes,created_at,updated_at";

export const listOffers = () => api.get("/offers").then((r) => r.data);
export const createOffer = (data) => api.post("/offers", data).then((r) => r.data);
export const updateOffer = (id, data) => api.put(`/offers/${id}`, data).then((r) => r.data);
export const deleteOffer = (id) => api.delete(`/offers/${id}`).then((r) => r.data);
export const adminVerify = () => api.get("/admin/verify").then((r) => r.data);

export const listLoyaltyCampaigns = async () => { const clinicId = await getCurrentClinicId(); const { data, error } = await supabase.from("loyalty_campaigns").select("*").eq("clinic_id", clinicId).order("created_at", { ascending: false }); throwIfError(error); return data || []; };
export const createLoyaltyCampaign = async (payload) => {
  const [{ data: sessionData }, clinicId] = await Promise.all([supabase.auth.getSession(), getCurrentClinicId()]);
  const { data, error } = await supabase.from("loyalty_campaigns").insert({ clinic_id: clinicId, name: payload.name.trim(), reward: payload.reward.trim(), stamp_goal: Number(payload.stamp_goal), status: "draft", starts_at: payload.starts_at || null, ends_at: payload.ends_at || null, created_by: sessionData.session?.user?.id || null }).select("*").single();
  throwIfError(error); return data;
};
export const activateLoyaltyCampaign = async (campaignId) => { const clinicId = await getCurrentClinicId(); const { data, error } = await supabase.rpc("activate_loyalty_campaign", { p_clinic_id: clinicId, p_campaign_id: campaignId }); throwIfError(error); return data; };
export const archiveLoyaltyCampaign = async (campaignId) => { const clinicId = await getCurrentClinicId(); const { data, error } = await supabase.from("loyalty_campaigns").update({ status: "archived", updated_at: new Date().toISOString() }).eq("id", campaignId).eq("clinic_id", clinicId).select("*").single(); throwIfError(error); return data; };

export const listCampaignRewards = async (campaignId) => { if (!campaignId) return []; const clinicId = await getCurrentClinicId(); const { data, error } = await supabase.from("loyalty_rewards").select("*").eq("clinic_id", clinicId).eq("campaign_id", campaignId).order("stamps_required", { ascending: true }); throwIfError(error); return data || []; };
export const createCampaignReward = async (campaignId, payload) => {
  const [{ data: sessionData }, clinicId] = await Promise.all([supabase.auth.getSession(), getCurrentClinicId()]);
  const { data, error } = await supabase.from("loyalty_rewards").insert({ clinic_id: clinicId, campaign_id: campaignId, stamps_required: Number(payload.stamps_required), title: payload.title.trim(), reward_type: payload.reward_type || "custom", discount_percent: payload.reward_type === "discount" && payload.discount_percent ? Number(payload.discount_percent) : null, description: payload.description?.trim() || null, validity_days: payload.validity_days ? Number(payload.validity_days) : null, redemption_mode: payload.redemption_mode || "keep", is_active: payload.is_active !== false, sort_order: Number(payload.stamps_required), created_by: sessionData.session?.user?.id || null }).select("*").single();
  throwIfError(error); return data;
};
export const updateCampaignReward = async (rewardId, payload) => { const clinicId = await getCurrentClinicId(); const { data, error } = await supabase.from("loyalty_rewards").update({ stamps_required: Number(payload.stamps_required), title: payload.title.trim(), reward_type: payload.reward_type || "custom", discount_percent: payload.reward_type === "discount" && payload.discount_percent ? Number(payload.discount_percent) : null, description: payload.description?.trim() || null, validity_days: payload.validity_days ? Number(payload.validity_days) : null, redemption_mode: payload.redemption_mode || "keep", is_active: payload.is_active !== false, sort_order: Number(payload.stamps_required), updated_at: new Date().toISOString() }).eq("id", rewardId).eq("clinic_id", clinicId).select("*").single(); throwIfError(error); return data; };
export const deleteCampaignReward = async (rewardId) => { const clinicId = await getCurrentClinicId(); const { error } = await supabase.from("loyalty_rewards").delete().eq("id", rewardId).eq("clinic_id", clinicId); throwIfError(error); };

export const getLoyaltyRewardStatus = async (userId, cardOverride = null) => {
  const clinicId = await getCurrentClinicId(); const card = cardOverride || await getLoyalty(userId);
  const [{ data: rewards, error }, { data: redemptions, error: redemptionError }] = await Promise.all([
    supabase.from("loyalty_rewards").select("*").eq("clinic_id", clinicId).eq("campaign_id", card.campaign_id).eq("is_active", true).order("stamps_required"),
    supabase.from("loyalty_reward_redemptions").select("*").eq("clinic_id", clinicId).eq("user_id", userId).eq("campaign_id", card.campaign_id).eq("cycle_no", card.total_completed || 0),
  ]);
  throwIfError(error); throwIfError(redemptionError); const redeemedIds = new Set((redemptions || []).map((r) => r.reward_id)); return { card, rewards: (rewards || []).map((r) => ({ ...r, achieved: card.stamps >= r.stamps_required, redeemed: redeemedIds.has(r.id) })), redemptions: redemptions || [] };
};
export const redeemLoyaltyReward = async (userId, rewardId) => { const clinicId = await getCurrentClinicId(); const { data, error } = await supabase.rpc("redeem_loyalty_reward", { p_clinic_id: clinicId, p_user_id: userId, p_reward_id: rewardId }); throwIfError(error); const row = Array.isArray(data) ? data[0] : data; return normalizeCard(row); };

export const getLoyalty = async (userId) => {
  const clinicId = await getCurrentClinicId(); const { data: sessionData } = await supabase.auth.getSession(); const currentUser = sessionData.session?.user; if (!currentUser) throw new Error("Du må være logget inn");
  if (currentUser.id === userId) { const { data, error } = await supabase.rpc("ensure_loyalty_card", { p_clinic_id: clinicId }); throwIfError(error); const row = Array.isArray(data) ? data[0] : data; return normalizeCard(row, { full_name: currentUser.user_metadata?.full_name, phone: currentUser.user_metadata?.phone, email: currentUser.email }); }
  const { data: row, error } = await supabase.from("loyalty_cards").select("*").eq("clinic_id", clinicId).eq("user_id", userId).single(); throwIfError(error); const { data: profile, error: profileError } = await supabase.from("profiles").select(PROFILE_FIELDS).eq("id", userId).maybeSingle(); throwIfError(profileError); return normalizeCard(row, profile);
};
export const saveLoyaltyProfile = async (_userId, name, phone) => { const { data: authData, error: authError } = await supabase.auth.updateUser({ data: { full_name: name, phone } }); throwIfError(authError); const user = authData.user; const { error } = await supabase.from("profiles").upsert({ id: user.id, full_name: name, phone, updated_at: new Date().toISOString() }, { onConflict: "id" }); throwIfError(error); return { name, phone }; };
export const listCustomers = async () => { const clinicId = await getCurrentClinicId(); const { data: members, error: memberError } = await supabase.from("clinic_members").select("user_id").eq("clinic_id", clinicId).eq("role", "customer").eq("status", "active"); throwIfError(memberError); const ids = (members || []).map((m) => m.user_id); if (!ids.length) return []; const [{ data: profiles, error }, { data: cards, error: cardsError }] = await Promise.all([supabase.from("profiles").select(PROFILE_FIELDS).in("id", ids).order("created_at", { ascending: false }), supabase.from("loyalty_cards").select("*").eq("clinic_id", clinicId).in("user_id", ids)]); throwIfError(error); throwIfError(cardsError); const cardMap = new Map((cards || []).map((card) => [card.user_id, card])); return (profiles || []).map((profile) => normalizeCard(cardMap.get(profile.id) || { user_id: profile.id, stamps: 0, total_completed: 0, stamp_goal: 10, created_at: profile.created_at }, profile)); };
export const updateCustomer = async (userId, updates) => { const payload = { full_name: updates.name?.trim() || null, phone: updates.phone?.trim() || null, birth_date: updates.birth_date || null, language: updates.language || null, tags: Array.isArray(updates.tags) ? updates.tags : [], admin_notes: updates.admin_notes?.trim() || null, updated_at: new Date().toISOString() }; const { data, error } = await supabase.from("profiles").update(payload).eq("id", userId).select(PROFILE_FIELDS).single(); throwIfError(error); return data; };
export const listLoyalty = listCustomers;
const getActiveCampaign = async () => { const clinicId = await getCurrentClinicId(); const { data, error } = await supabase.from("loyalty_campaigns").select("*").eq("clinic_id", clinicId).eq("status", "active").maybeSingle(); throwIfError(error); return data; };
const changeStamp = async (userId, type) => {
  const clinicId = await getCurrentClinicId(); let { data: current, error } = await supabase.from("loyalty_cards").select("*").eq("clinic_id", clinicId).eq("user_id", userId).maybeSingle(); throwIfError(error);
  if (!current) { const campaign = await getActiveCampaign(); if (!campaign) throw new Error("Ingen aktiv lojalitetskampanje"); const { data: created, error: createError } = await supabase.from("loyalty_cards").insert({ clinic_id: clinicId, user_id: userId, stamps: 0, total_completed: 0, campaign_id: campaign.id, campaign_name: campaign.name, reward: campaign.reward, stamp_goal: campaign.stamp_goal }).select("*").single(); throwIfError(createError); current = created; }
  const previousCampaign = { campaign_id: current.campaign_id, campaign_name: current.campaign_name, reward: current.reward, stamp_goal: current.stamp_goal || 10 }; const goal = current.stamp_goal || 10; let stamps = current.stamps || 0; let totalCompleted = current.total_completed || 0; let campaignFields = previousCampaign;
  if (type === "stamp") { if (stamps >= goal) throw new Error("Kortet er fullt"); stamps += 1; } else if (type === "unstamp") { stamps = Math.max(0, stamps - 1); } else if (type === "reset") { if (stamps < goal) throw new Error("Kortet må være fullt før et nytt kort opprettes"); totalCompleted += 1; stamps = 0; const activeCampaign = await getActiveCampaign(); if (activeCampaign) campaignFields = { campaign_id: activeCampaign.id, campaign_name: activeCampaign.name, reward: activeCampaign.reward, stamp_goal: activeCampaign.stamp_goal }; }
  const now = new Date().toISOString(); const { data: updated, error: updateError } = await supabase.from("loyalty_cards").update({ stamps, total_completed: totalCompleted, last_stamped_at: type === "stamp" ? now : current.last_stamped_at, updated_at: now, ...campaignFields }).eq("clinic_id", clinicId).eq("user_id", userId).select("*").single(); throwIfError(updateError);
  const { data: sessionData } = await supabase.auth.getSession(); const { error: eventError } = await supabase.from("loyalty_events").insert({ clinic_id: clinicId, user_id: userId, event_type: type, stamps_after: stamps, created_by: sessionData.session?.user?.id || null, ...previousCampaign }); throwIfError(eventError); return normalizeCard(updated);
};
export const stampLoyalty = (userId) => changeStamp(userId, "stamp"); export const unstampLoyalty = (userId) => changeStamp(userId, "unstamp"); export const resetLoyalty = (userId) => changeStamp(userId, "reset");
export const getLoyaltyHistory = async (userId) => { const clinicId = await getCurrentClinicId(); const [card, { data: events, error }, { data: redemptions, error: redemptionError }] = await Promise.all([getLoyalty(userId), supabase.from("loyalty_events").select("*").eq("clinic_id", clinicId).eq("user_id", userId).order("created_at", { ascending: false }), supabase.from("loyalty_reward_redemptions").select("*").eq("clinic_id", clinicId).eq("user_id", userId).order("redeemed_at", { ascending: false })]); throwIfError(error); throwIfError(redemptionError); return { card, events: (events || []).map((event) => ({ ...event, type: event.event_type })), redemptions: redemptions || [] }; };
export const deleteCustomer = async (userId) => { const clinicId = await getCurrentClinicId(); const { error } = await supabase.from("loyalty_cards").delete().eq("clinic_id", clinicId).eq("user_id", userId); throwIfError(error); return { deleted: true }; };
export const transferStamps = async () => { throw new Error("Overføring er ikke tilgjengelig for kontobaserte kort"); };

export const listNotifications = async () => { const clinicId = await getCurrentClinicId(); const { data, error } = await supabase.from("notifications").select("*").eq("clinic_id", clinicId).order("created_at", { ascending: false }); throwIfError(error); return data || []; };
export const createNotification = async (payload) => { const [{ data: sessionData }, clinicId] = await Promise.all([supabase.auth.getSession(), getCurrentClinicId()]); const createdBy = sessionData.session?.user?.id || null; const targetIds = Array.isArray(payload.target_user_ids) ? [...new Set(payload.target_user_ids.filter(Boolean))] : payload.target_user_id ? [payload.target_user_id] : []; const base = { clinic_id: clinicId, title: payload.title, message: payload.message, category: payload.category || "news", created_by: createdBy }; const rows = targetIds.length ? targetIds.map((targetUserId) => ({ ...base, target_user_id: targetUserId })) : [{ ...base, target_user_id: null }]; const { data, error } = await supabase.from("notifications").insert(rows).select("*"); throwIfError(error); return data || []; };
export const markNotificationRead = async (notificationId) => { const [{ data: sessionData }, clinicId] = await Promise.all([supabase.auth.getSession(), getCurrentClinicId()]); const userId = sessionData.session?.user?.id; if (!userId) return; const { error } = await supabase.from("notification_reads").upsert({ clinic_id: clinicId, notification_id: notificationId, user_id: userId }); throwIfError(error); };
export const uploadImage = (file, onProgress) => { const fd = new FormData(); fd.append("file", file); return api.post("/upload", fd, { headers: { "Content-Type": "multipart/form-data" }, onUploadProgress: onProgress }).then((r) => ({ ...r.data, full_url: `${BACKEND_ORIGIN}${r.data.url}` })); };
