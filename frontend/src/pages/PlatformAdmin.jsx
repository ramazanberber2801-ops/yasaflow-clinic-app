import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Building2, ExternalLink, RefreshCw, Save } from "lucide-react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";

const MODULES = [
  ["booking_enabled", "Booking"],
  ["gift_card_enabled", "Gavekort"],
  ["campaigns_enabled", "Kampanjer"],
  ["loyalty_enabled", "Lojalitet"],
  ["push_enabled", "Push-varsler"],
];

export default function PlatformAdmin() {
  const [clinics, setClinics] = useState([]);
  const [settings, setSettings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(null);

  const load = async () => {
    setLoading(true);
    const [{ data: clinicRows, error: clinicError }, { data: settingRows, error: settingError }] = await Promise.all([
      supabase.from("clinics").select("id,slug,name,primary_domain,status,created_at,updated_at").order("created_at", { ascending: false }),
      supabase.from("clinic_settings").select("clinic_id,clinic_name,booking_enabled,booking_url,gift_card_enabled,campaigns_enabled,loyalty_enabled,push_enabled"),
    ]);
    setLoading(false);
    if (clinicError || settingError) {
      toast.error(clinicError?.message || settingError?.message || "Kunne ikke hente klinikker");
      return;
    }
    setClinics(clinicRows || []);
    setSettings(settingRows || []);
  };

  useEffect(() => { load(); }, []);

  const settingsByClinic = useMemo(() => new Map(settings.map((row) => [row.clinic_id, row])), [settings]);

  const patchClinic = (clinicId, patch) => {
    setClinics((rows) => rows.map((row) => row.id === clinicId ? { ...row, ...patch } : row));
  };

  const patchSettings = (clinicId, patch) => {
    setSettings((rows) => rows.map((row) => row.clinic_id === clinicId ? { ...row, ...patch } : row));
  };

  const saveClinic = async (clinic) => {
    const clinicSettings = settingsByClinic.get(clinic.id);
    setSaving(clinic.id);
    const [{ error: clinicError }, { error: settingsError }] = await Promise.all([
      supabase.from("clinics").update({ name: clinic.name, primary_domain: clinic.primary_domain || null, status: clinic.status, updated_at: new Date().toISOString() }).eq("id", clinic.id),
      clinicSettings
        ? supabase.from("clinic_settings").update({
            booking_enabled: clinicSettings.booking_enabled,
            gift_card_enabled: clinicSettings.gift_card_enabled,
            campaigns_enabled: clinicSettings.campaigns_enabled,
            loyalty_enabled: clinicSettings.loyalty_enabled,
            push_enabled: clinicSettings.push_enabled,
            updated_at: new Date().toISOString(),
          }).eq("clinic_id", clinic.id)
        : Promise.resolve({ error: null }),
    ]);
    setSaving(null);
    if (clinicError || settingsError) {
      toast.error(clinicError?.message || settingsError?.message || "Kunne ikke lagre");
      return;
    }
    toast.success(`${clinic.name} er oppdatert`);
  };

  return (
    <div className="min-h-screen bg-[#F8F5F0] px-4 py-6 text-[#2C2A26] sm:px-6">
      <div className="mx-auto max-w-6xl">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <Link to="/admin" className="mb-3 inline-flex items-center gap-2 text-sm text-[#756F65]"><ArrowLeft size={16} />Til klinikkadmin</Link>
            <h1 className="text-3xl font-semibold">Yasaflow Clinic plattformadmin</h1>
            <p className="mt-1 max-w-2xl text-sm text-[#756F65]">Administrer kun klinikker som bruker Yasaflow Clinic. Denne siden er separat fra Yasaflow-plattformen for foreninger og fra yasaflow.com.</p>
          </div>
          <button onClick={load} className="inline-flex items-center gap-2 rounded-full border border-[#DDD4C6] bg-white px-4 py-2 text-sm"><RefreshCw size={16} />Oppdater</button>
        </div>

        <div className="mb-6 grid gap-3 sm:grid-cols-3">
          <Stat label="Klinikker" value={clinics.length} />
          <Stat label="Aktive" value={clinics.filter((c) => c.status === "active").length} />
          <Stat label="Inaktive" value={clinics.filter((c) => c.status !== "active").length} />
        </div>

        {loading ? (
          <div className="rounded-3xl border border-[#EBE5DC] bg-white p-6 text-sm text-[#756F65]">Henter klinikker …</div>
        ) : (
          <div className="space-y-4">
            {clinics.map((clinic) => {
              const row = settingsByClinic.get(clinic.id);
              return (
                <section key={clinic.id} className="rounded-3xl border border-[#E5DED3] bg-white p-5 shadow-sm">
                  <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="grid h-11 w-11 place-items-center rounded-2xl bg-[#F3EBDD]"><Building2 size={20} /></div>
                      <div>
                        <input value={clinic.name} onChange={(e) => patchClinic(clinic.id, { name: e.target.value })} className="w-full border-0 bg-transparent p-0 text-xl font-semibold outline-none" />
                        <div className="text-xs text-[#8A8379]">/{clinic.slug}</div>
                      </div>
                    </div>
                    <button onClick={() => saveClinic(clinic)} disabled={saving === clinic.id} className="inline-flex items-center gap-2 rounded-full bg-[#2C2A26] px-4 py-2 text-sm text-white disabled:opacity-50"><Save size={16} />{saving === clinic.id ? "Lagrer …" : "Lagre"}</button>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <label className="text-sm">Domene
                      <div className="mt-1 flex items-center gap-2 rounded-2xl border border-[#E5DED3] px-3 py-2">
                        <input value={clinic.primary_domain || ""} onChange={(e) => patchClinic(clinic.id, { primary_domain: e.target.value })} placeholder="klinikk.yasaflow.com" className="min-w-0 flex-1 bg-transparent outline-none" />
                        {clinic.primary_domain && <a href={`https://${clinic.primary_domain}`} target="_blank" rel="noreferrer"><ExternalLink size={16} /></a>}
                      </div>
                    </label>
                    <label className="text-sm">Status
                      <select value={clinic.status} onChange={(e) => patchClinic(clinic.id, { status: e.target.value })} className="mt-1 w-full rounded-2xl border border-[#E5DED3] bg-white px-3 py-2 outline-none">
                        <option value="active">Aktiv</option>
                        <option value="inactive">Inaktiv</option>
                        <option value="suspended">Suspendert</option>
                      </select>
                    </label>
                  </div>

                  <div className="mt-5">
                    <h2 className="mb-2 text-sm font-medium">Clinic-moduler</h2>
                    <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
                      {MODULES.map(([key, label]) => (
                        <label key={key} className="flex items-center justify-between rounded-2xl border border-[#E5DED3] px-3 py-2 text-sm">
                          {label}
                          <input type="checkbox" checked={Boolean(row?.[key])} onChange={(e) => patchSettings(clinic.id, { [key]: e.target.checked })} disabled={!row} />
                        </label>
                      ))}
                    </div>
                  </div>
                </section>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function Stat({ label, value }) {
  return <div className="rounded-3xl border border-[#E5DED3] bg-white p-4"><div className="text-xs uppercase tracking-wide text-[#8A8379]">{label}</div><div className="mt-1 text-2xl font-semibold">{value}</div></div>;
}
