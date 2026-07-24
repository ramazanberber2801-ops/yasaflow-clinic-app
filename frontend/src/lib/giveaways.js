import { supabase } from "@/lib/supabase";
import { getCurrentClinicId } from "@/lib/currentClinic";

const TWELVE_HOURS_MS = 12 * 60 * 60 * 1000;

async function fetchBrowserComments(instagramUrl) {
  const response = await fetch("/api/instagram-comments-browser", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ instagram_url: instagramUrl.trim() }),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload?.error || "Nettleser-betaen kunne ikke hente kommentarene");
  return payload;
}

async function fetchSupabaseComments(instagramUrl) {
  const { data, error } = await supabase.functions.invoke("fetch-public-instagram-comments", {
    body: { instagram_url: instagramUrl.trim() },
  });

  if (error) {
    const context = error.context;
    let message = "Kunne ikke hente kommentarer fra Instagram";
    try {
      const payload = context ? await context.json() : null;
      if (payload?.error) message = payload.error;
    } catch {
      // Keep the safe fallback message when the function response is not JSON.
    }
    throw new Error(message);
  }
  return data || {};
}

export async function fetchPublicInstagramComments(instagramUrl) {
  let browserError = null;
  let data = null;

  try {
    data = await fetchBrowserComments(instagramUrl);
  } catch (error) {
    browserError = error;
  }

  if (!Array.isArray(data?.comments) || !data.comments.length) {
    try {
      data = await fetchSupabaseComments(instagramUrl);
    } catch (fallbackError) {
      throw new Error(browserError?.message || fallbackError?.message || "Kunne ikke hente kommentarer fra Instagram");
    }
  }

  return {
    comments: Array.isArray(data?.comments) ? data.comments : [],
    count: Number(data?.count || 0),
    truncated: Boolean(data?.truncated),
    experimental: true,
    strategy: data?.strategy || "supabase-fallback",
  };
}

export async function createGiveawaySession({ instagramUrl, rules, participants = [] }) {
  const [{ data: sessionData }, clinicId] = await Promise.all([
    supabase.auth.getSession(),
    getCurrentClinicId(),
  ]);

  const userId = sessionData.session?.user?.id;
  if (!userId) throw new Error("Du må være logget inn");

  const createdAt = new Date();
  const expiresAt = new Date(createdAt.getTime() + TWELVE_HOURS_MS);

  const { data, error } = await supabase
    .from("giveaway_sessions")
    .insert({
      clinic_id: clinicId,
      created_by: userId,
      instagram_url: instagramUrl.trim(),
      rules,
      participants,
      created_at: createdAt.toISOString(),
      expires_at: expiresAt.toISOString(),
    })
    .select("*")
    .single();

  if (error) throw error;
  return data;
}

export async function updateGiveawaySession(id, values) {
  const { data, error } = await supabase
    .from("giveaway_sessions")
    .update(values)
    .eq("id", id)
    .select("*")
    .single();

  if (error) throw error;
  return data;
}

export async function deleteGiveawaySession(id) {
  const { error } = await supabase.from("giveaway_sessions").delete().eq("id", id);
  if (error) throw error;
}

export async function listActiveGiveawaySessions() {
  const clinicId = await getCurrentClinicId();
  const { data, error } = await supabase
    .from("giveaway_sessions")
    .select("*")
    .eq("clinic_id", clinicId)
    .gt("expires_at", new Date().toISOString())
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data || [];
}
