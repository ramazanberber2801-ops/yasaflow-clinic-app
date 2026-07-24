import { APP_CONFIG } from "@/config/appConfig";
import { supabase } from "@/lib/supabase";
import { getCurrentClinicId } from "@/lib/currentClinic";
import { DEFAULT_THEME_ID, sanitizeThemeOverrides } from "@/lib/themeEngine";

export const CLINIC_ASSETS_BUCKET = "clinic-assets";

export const DEFAULT_CLINIC_SETTINGS = {
  id: null,
  clinic_id: null,
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
  logo_url: "",
  about_hero_image_url: "",
  about_secondary_image_url: "",
  theme_id: DEFAULT_THEME_ID,
  theme_overrides: {},
};

export async function getClinicSettings() {
  const clinicId = await getCurrentClinicId();
  const { data, error } = await supabase
    .from("clinic_settings")
    .select("*")
    .eq("clinic_id", clinicId)
    .maybeSingle();

  if (error) throw error;
  return { ...DEFAULT_CLINIC_SETTINGS, clinic_id: clinicId, ...(data || {}) };
}

export async function uploadClinicAsset(file, assetKey) {
  if (!file) throw new Error("Velg en bildefil");
  if (!file.type?.startsWith("image/")) throw new Error("Filen må være et bilde");
  if (file.size > 5 * 1024 * 1024) throw new Error("Bildet kan ikke være større enn 5 MB");

  const clinicId = await getCurrentClinicId();
  const extension = file.name.split(".").pop()?.toLowerCase() || "jpg";
  const path = `${clinicId}/${assetKey}.${extension}`;
  const { error } = await supabase.storage
    .from(CLINIC_ASSETS_BUCKET)
    .upload(path, file, { cacheControl: "3600", upsert: true, contentType: file.type });

  if (error) throw error;
  const { data } = supabase.storage.from(CLINIC_ASSETS_BUCKET).getPublicUrl(path);
  return `${data.publicUrl}?v=${Date.now()}`;
}

export async function updateClinicSettings(values) {
  const [{ data: sessionData }, clinicId] = await Promise.all([
    supabase.auth.getSession(),
    getCurrentClinicId(),
  ]);
  const text = (value) => (value || "").trim();
  const sections = Array.isArray(values.about_sections)
    ? values.about_sections
        .map((section) => ({ title: text(section.title), text: text(section.text) }))
        .filter((section) => section.title || section.text)
    : [];

  const payload = {
    id: values.id || `${APP_CONFIG.settingsRecordKey}:${clinicId}`,
    clinic_id: clinicId,
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
    logo_url: text(values.logo_url),
    about_hero_image_url: text(values.about_hero_image_url),
    about_secondary_image_url: text(values.about_secondary_image_url),
    theme_id: text(values.theme_id) || DEFAULT_THEME_ID,
    theme_overrides: sanitizeThemeOverrides(values.theme_overrides),
    updated_at: new Date().toISOString(),
    updated_by: sessionData.session?.user?.id || null,
  };

  const { data, error } = await supabase
    .from("clinic_settings")
    .upsert(payload, { onConflict: "clinic_id" })
    .select("*")
    .single();

  if (error) throw error;
  return data;
}
