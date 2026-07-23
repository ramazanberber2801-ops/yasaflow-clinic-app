import { supabase } from "@/lib/supabase";
import { getCurrentClinicId } from "@/lib/currentClinic";

const TWELVE_HOURS_MS = 12 * 60 * 60 * 1000;

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
