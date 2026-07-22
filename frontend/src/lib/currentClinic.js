import { supabase } from "@/lib/supabase";

export const DEFAULT_CLINIC_ID = "00000000-0000-0000-0000-000000000001";

let cachedClinic = null;
let pendingClinic = null;

function normalizeHost(hostname) {
  return (hostname || "").toLowerCase().split(":")[0];
}

export async function getCurrentClinic() {
  if (cachedClinic) return cachedClinic;
  if (pendingClinic) return pendingClinic;

  pendingClinic = (async () => {
    const host = normalizeHost(window.location.hostname);
    let query = supabase.from("clinics").select("id,slug,name,primary_domain,status").eq("status", "active");

    if (host && host !== "localhost" && host !== "127.0.0.1") {
      query = query.eq("primary_domain", host);
    } else {
      query = query.eq("id", DEFAULT_CLINIC_ID);
    }

    const { data, error } = await query.maybeSingle();
    if (error) throw error;

    cachedClinic = data || {
      id: DEFAULT_CLINIC_ID,
      slug: "seldaesthetic",
      name: "Seldaesthetic",
      primary_domain: "seldaesthetic.yasaflow.com",
      status: "active",
    };

    return cachedClinic;
  })().finally(() => {
    pendingClinic = null;
  });

  return pendingClinic;
}

export async function getCurrentClinicId() {
  const clinic = await getCurrentClinic();
  return clinic.id;
}

export function clearCurrentClinicCache() {
  cachedClinic = null;
  pendingClinic = null;
}
