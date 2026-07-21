import { supabase } from "@/lib/supabase";

export async function sendPushNotification(payload) {
  const { data, error } = await supabase.functions.invoke("send-push-notification", {
    body: {
      title: payload.title,
      message: payload.message,
      category: payload.category || "news",
      target_user_id: payload.target_user_id || null,
    },
  });

  if (error) throw error;
  if (data?.error) throw new Error(data.error);
  return data || { sent: 0, failed: 0 };
}
