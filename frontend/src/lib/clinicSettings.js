import { supabase } from "@/lib/supabase";

export const DEFAULT_CLINIC_SETTINGS = {
  id: "main",
  clinic_name: "",
  subtitle: "",
  address: "",
  phone: "",
  email: "",
  opening_hours: "",
  instagram_url: "",
  instagram_handle: "",
  facebook_url: "",
  website_url: "",
  booking_enabled: false,
  booking_url: "",
  gift_card_enabled: false,
  gift_card_url: "",
  campaigns_enabled: true,
  loyalty_enabled: true,
  push_enabled: true,
  about_title: "",
  about_text: "",
  about_sections: [],
};

export async function getClinicSettings() {
  const { data, error } = await supabase
    .from("clinic_settings")
    .select("*")
    .eq("id", "main")
    .maybeSingle();

  if (error) throw error;
  return { ...DEFAULT_CLINIC_SETTINGS, ...(data || {}) };
}

export async function updateClinicSettings(values) {
  const { data: sessionData } = await supabase.auth.getSession();
  const text = (value) => (value || "").trim();
  const sections = Array.isArray(values.about_sections)
    ? values.about_sections
        .map((section) => ({ title: text(section.title), text: text(section.text) }))
        .filter((section) => section.title || section.text)
    : [];

  const payload = {
    id: "main",
    clinic_name: text(values.clinic_name),
    subtitle: text(values.subtitle),
    address: text(values.address),
    phone: text(values.phone),
    email: text(values.email),
    opening_hours: text(values.opening_hours),
    instagram_url: text(values.instagram_url),
    instagram_handle: text(values.instagram_handle),
    facebook_url: text(values.facebook_url),
    website_url: text(values.website_url),
    booking_enabled: Boolean(values.booking_enabled),
    booking_url: text(values.booking_url),
    gift_card_enabled: Boolean(values.gift_card_enabled),
    gift_card_url: text(values.gift_card_url),
    campaigns_enabled: Boolean(values.campaigns_enabled),
    loyalty_enabled: Boolean(values.loyalty_enabled),
    push_enabled: Boolean(values.push_enabled),
    about_title: text(values.about_title),
    about_text: text(values.about_text),
    about_sections: sections,
    updated_at: new Date().toISOString(),
    updated_by: sessionData.session?.user?.id || null,
  };

  const { data, error } = await supabase
    .from("clinic_settings")
    .upsert(payload, { onConflict: "id" })
    .select("*")
    .single();

  if (error) throw error;
  return data;
}