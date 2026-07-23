import { supabase } from "@/lib/supabase";
import { getCurrentClinicId } from "@/lib/currentClinic";

export async function listMyCustomerRewards() {
  const [{ data: sessionData }, clinicId] = await Promise.all([
    supabase.auth.getSession(),
    getCurrentClinicId(),
  ]);

  const userId = sessionData.session?.user?.id;
  if (!userId) return [];

  const { data, error } = await supabase
    .from("customer_rewards")
    .select("id,title,reward_type,description,status,expires_at,redeemed_at,created_at")
    .eq("clinic_id", clinicId)
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) throw error;

  const now = Date.now();
  return (data || []).map((reward) => ({
    ...reward,
    display_status:
      reward.status === "redeemed"
        ? "redeemed"
        : reward.expires_at && new Date(reward.expires_at).getTime() < now
          ? "expired"
          : "active",
  }));
}
