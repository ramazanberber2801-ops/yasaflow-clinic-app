import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Building2, ExternalLink, Plus, RefreshCw, Save, Search, Users, X } from "lucide-react";
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

const EMPTY_FORM = {
  name: "",
  slug: "",
  primaryDomain: "",
  ownerEmail: "",
  status: "active",
  booking_enabled: false,
  gift_card_enabled: false,
  campaigns_enabled: true,
  loyalty_enabled: true,
  push_enabled: true,
};

function slugify(value) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export default function PlatformAdmin() {
  const [clinics, setClinics] = useState([]);
  const [settings, setSettings] = useState([]);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(null);
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [moduleFilter, setModuleFilter] = useState("all");

  const load = async () => {
    setLoading(true);
    const [clinicResult, settingsResult, membersResult] = await Promise.all([
      supabase.from("clinics").select("id,slug,name,primary_domain,status,created_at,updated_at").order("created_at", { ascending: false }),
      supabase.from("clinic_settings").select("clinic_id,clinic_name,booking_enabled,booking_url,gift_card_enabled,campaigns_enabled,loyalty_enabled,push_enabled"),
      supabase.from("clinic_members").select("clinic_id,role,status"),
    ]);
    setLoading(false);
    const error = clinicResult.error || settingsResult.error || membersResult.error;
    if (error) {
      toast.error(error.message || "Kunne ikke hente klinikker");
      return;
    }
    setClinics(clinicResult.data || []);
    setSettings(settingsResult.data || []);
    setMembers(membersResult.data || []);
  };

  useEffect(() => { load(); }, []);

  const settingsByClinic = useMemo(() => new Map(settings.map((row) => [row.clinic_id, row])), [settings]);
  const memberSummary = useMemo(() => {
    const map = new Map();
    members.forEach((member) => {
      const current = map.get(member.clinic_id) || { total: 0, owners: 0, staff: 0, customers: 0 };
      if (member.status === "active") {
        current.total += 1;
        if (member.role === "owner") current.owners += 1;
        else if (member.role === "admin" || member.role === "staff") current.staff += 1;
        else if (member.role === "customer") current.customers += 1;
      }
      map.set(member.clinic_id, current);
    });
    return map;
  }, [members]);

  const filteredClinics = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return clinics.filter((clinic) => {
      const row = settingsByClinic.get(clinic.id);
      const matchesQuery = !normalizedQuery || [clinic.name, clinic.slug, clinic.primary_domain]
        .filter(Boolean)
        .some((value) => value.toLowerCase().includes(normalizedQuery));
      const matchesStatus = statusFilter === "all" || clinic.status === statusFilter;
      const matchesModule = moduleFilter === "all" || Boolean(row?.[moduleFilter]);
      return matchesQuery && matchesStatus && matchesModule;
    });
  }, [clinics, moduleFilter, query, settingsByClinic, statusFilter]);

  const patchClinic = (clinicId, patch) => setClinics((rows) => rows.map((row) => row.id === clinicId ? { ...row, ...patch } : row));
  const patchSettings = (clinicId, patch) => setSettings((rows) => rows.map((row) => row.clinic_id === clinicId ? { ...row, ...patch } : row));

  const saveClinic = async (clinic) => {
    const clinicSettings = settingsByClinic.get(clinic.id);
    setSaving(clinic.id);
    const [clinicResult, settingsResult] = await Promise.all([
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
    const error = clinicResult.error || settingsResult.error;
    if (error) {
      toast.error(error.message || "Kunne ikke lagre");
      return;
    }
    toast.success(`${clinic.name} er oppdatert`);
  };

  const updateForm = (patch) => setForm((current) => ({ ...current, ...patch }));
  const handleNameChange = (name) => setForm((current) => ({
    ...current,
    name,
    slug: current.slug && current.slug !== slugify(current.name) ? current.slug : slugify(name),
  }));

  const createClinic = async (event) => {
    event.preventDefault();
    if (!form.name.trim() || !form.slug.trim()) {
      toast.error("Klinikknavn og slug er påkrevd");
      return;
    }
    setCreating(true);
    const { data, error } = await supabase.rpc("create_clinic_onboarding", {
      p_name: form.name.trim(),
      p_slug: form.slug.trim(),
      p_primary_domain: form.primaryDomain.trim() || null,
      p_owner_email: form.ownerEmail.trim() || null,
      p_status: form.status,
      p_booking_enabled: form.booking_enabled,
      p_gift_card_enabled: form.gift_card_enabled,
      p_campaigns_enabled: form.campaigns_enabled,
      p_loyalty_enabled: form.loyalty_enabled,
      p_push_enabled: form.push_enabled,
    });
    setCreating(false);
    if (error) {
      toast.error(error.message || "Kunne ikke opprette klinikken");
      return;
    }
    toast.success(`${data?.name || form.name} er opprettet`);
    setForm(EMPTY_FORM);
    setShowCreate(false);
    await load();
  };

  return (
    <div className="min-h-screen bg-[#F8F5F0] px-4 py-6 text-[#2C2A26] sm:px-6">
      <div className="mx-auto max-w-6xl">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <Link to="/admin" className="mb-3 inline-flex items-center gap-2 text-sm text-[#756F65]"><ArrowLeft size={16} />Til klinikkadmin</Link>
            <h1 className="text-3xl font-semibold">Yasaflow Clinic plattformadmin</h1>
            <p className="mt-1 text-sm text-[#756F65]">Administrer klinikker, tilgang, status, domener og Clinic-moduler.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button onClick={() => setShowCreate((value) => !value)} className="inline-flex items-center gap-2 rounded-full bg-[#7C5CFC] px-4 py-2 text-sm text-white">
              {showCreate ? <X size={16} /> : <Plus size={16} />}{showCreate ? "Lukk" : "Ny klinikk"}
            </button>
            <button onClick={load} className="inline-flex items-center gap-2 rounded-full border border-[#DDD4C6] bg-white px-4 py-2 text-sm"><RefreshCw size={16} />Oppdater</button>
          </div>
        </div>

        {showCreate && (
          <form onSubmit={createClinic} className="mb-6 rounded-3xl border border-[#DCD2FF] bg-white p-5 shadow-sm">
            <div className="mb-5">
              <h2 className="text-xl font-semibold">Opprett ny klinikk</h2>
              <p className="mt-1 text-sm text-[#756F65]">Klinikken og standardinnstillingene opprettes samlet. Eier-e-post er valgfri, men brukeren må allerede ha en konto.</p>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Klinikknavn" required><input value={form.name} onChange={(event) => handleNameChange(event.target.value)} placeholder="Eksempelklinikken" className="field-input" /></Field>
              <Field label="Slug" required hint="Brukes som teknisk klinikkadresse"><input value={form.slug} onChange={(event) => updateForm({ slug: slugify(event.target.value) })} placeholder="eksempelklinikken" className="field-input" /></Field>
              <Field label="Domene" hint="Valgfritt, uten https://"><input value={form.primaryDomain} onChange={(event) => updateForm({ primaryDomain: event.target.value.toLowerCase().replace(/^https?:\/\//, "").replace(/\/$/, "") })} placeholder="klinikk.yasaflow.com" className="field-input" /></Field>
              <Field label="Eierens e-post" hint="Må allerede være registrert bruker"><input type="email" value={form.ownerEmail} onChange={(event) => updateForm({ ownerEmail: event.target.value })} placeholder="eier@klinikk.no" className="field-input" /></Field>
              <Field label="Status"><select value={form.status} onChange={(event) => updateForm({ status: event.target.value })} className="field-input"><option value="active">Aktiv</option><option value="inactive">Inaktiv</option><option value="suspended">Suspendert</option></select></Field>
            </div>
            <div className="mt-5">
              <h3 className="mb-2 text-sm font-medium">Clinic-moduler</h3>
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
                {MODULES.map(([key, label]) => <label key={key} className="flex items-center justify-between rounded-2xl border border-[#E5DED3] px-3 py-2 text-sm">{label}<input type="checkbox" checked={Boolean(form[key])} onChange={(event) => updateForm({ [key]: event.target.checked })} /></label>)}
              </div>
            </div>
            <div className="mt-5 flex justify-end"><button type="submit" disabled={creating} className="inline-flex items-center gap-2 rounded-full bg-[#2C2A26] px-5 py-2.5 text-sm text-white disabled:opacity-50"><Plus size={16} />{creating ? "Oppretter …" : "Opprett klinikk"}</button></div>
          </form>
        )}

        <div className="mb-6 grid gap-3 sm:grid-cols-4">
          <Stat label="Klinikker" value={clinics.length} />
          <Stat label="Aktive" value={clinics.filter((clinic) => clinic.status === "active").length} />
          <Stat label="Suspendert" value={clinics.filter((clinic) => clinic.status === "suspended").length} />
          <Stat label="Aktive medlemmer" value={members.filter((member) => member.status === "active").length} />
        </div>

        <div className="mb-5 grid gap-3 rounded-3xl border border-[#E5DED3] bg-white p-4 md:grid-cols-[1fr_180px_200px]">
          <label className="flex items-center gap-2 rounded-2xl border border-[#E5DED3] px-3 py-2"><Search size={17} className="text-[#8A8379]" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Søk etter navn, slug eller domene" className="min-w-0 flex-1 bg-transparent text-sm outline-none" /></label>
          <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} className="rounded-2xl border border-[#E5DED3] bg-white px-3 py-2 text-sm outline-none"><option value="all">Alle statuser</option><option value="active">Aktive</option><option value="inactive">Inaktive</option><option value="suspended">Suspenderte</option></select>
          <select value={moduleFilter} onChange={(event) => setModuleFilter(event.target.value)} className="rounded-2xl border border-[#E5DED3] bg-white px-3 py-2 text-sm outline-none"><option value="all">Alle Clinic-moduler</option>{MODULES.map(([key, label]) => <option key={key} value={key}>{label} aktivert</option>)}</select>
        </div>

        {loading ? (
          <div className="rounded-3xl border border-[#EBE5DC] bg-white p-6 text-sm text-[#756F65]">Henter klinikker …</div>
        ) : filteredClinics.length === 0 ? (
          <div className="rounded-3xl border border-[#EBE5DC] bg-white p-8 text-center text-sm text-[#756F65]">Ingen klinikker matcher filtrene.</div>
        ) : (
          <div className="space-y-4">
            {filteredClinics.map((clinic) => {
              const row = settingsByClinic.get(clinic.id);
              const summary = memberSummary.get(clinic.id) || { total: 0, owners: 0, staff: 0, customers: 0 };
              return (
                <section key={clinic.id} className="rounded-3xl border border-[#E5DED3] bg-white p-5 shadow-sm">
                  <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="grid h-11 w-11 place-items-center rounded-2xl bg-[#F3EBDD]"><Building2 size={20} /></div>
                      <div>
                        <input value={clinic.name} onChange={(event) => patchClinic(clinic.id, { name: event.target.value })} className="w-full border-0 bg-transparent p-0 text-xl font-semibold outline-none" />
                        <div className="text-xs text-[#8A8379]">/{clinic.slug} · Opprettet {new Date(clinic.created_at).toLocaleDateString("nb-NO")}</div>
                      </div>
                    </div>
                    <button onClick={() => saveClinic(clinic)} disabled={saving === clinic.id} className="inline-flex items-center gap-2 rounded-full bg-[#2C2A26] px-4 py-2 text-sm text-white disabled:opacity-50"><Save size={16} />{saving === clinic.id ? "Lagrer …" : "Lagre"}</button>
                  </div>

                  <div className="mb-5 grid gap-2 sm:grid-cols-4">
                    <MemberStat label="Totalt" value={summary.total} />
                    <MemberStat label="Eiere" value={summary.owners} />
                    <MemberStat label="Ansatte" value={summary.staff} />
                    <MemberStat label="Kunder" value={summary.customers} />
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <label className="text-sm">Domene<div className="mt-1 flex items-center gap-2 rounded-2xl border border-[#E5DED3] px-3 py-2"><input value={clinic.primary_domain || ""} onChange={(event) => patchClinic(clinic.id, { primary_domain: event.target.value })} placeholder="klinikk.yasaflow.com" className="min-w-0 flex-1 bg-transparent outline-none" />{clinic.primary_domain && <a href={`https://${clinic.primary_domain}`} target="_blank" rel="noreferrer"><ExternalLink size={16} /></a>}</div></label>
                    <label className="text-sm">Status<select value={clinic.status} onChange={(event) => patchClinic(clinic.id, { status: event.target.value })} className="mt-1 w-full rounded-2xl border border-[#E5DED3] bg-white px-3 py-2 outline-none"><option value="active">Aktiv</option><option value="inactive">Inaktiv</option><option value="suspended">Suspendert</option></select></label>
                  </div>

                  <div className="mt-5">
                    <h2 className="mb-2 text-sm font-medium">Clinic-moduler</h2>
                    <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
                      {MODULES.map(([key, label]) => <label key={key} className="flex items-center justify-between rounded-2xl border border-[#E5DED3] px-3 py-2 text-sm">{label}<input type="checkbox" checked={Boolean(row?.[key])} onChange={(event) => patchSettings(clinic.id, { [key]: event.target.checked })} disabled={!row} /></label>)}
                    </div>
                  </div>
                </section>
              );
            })}
          </div>
        )}
      </div>
      <style>{`.field-input{margin-top:.25rem;width:100%;border:1px solid #E5DED3;border-radius:1rem;background:#fff;padding:.65rem .8rem;outline:none}.field-input:focus{border-color:#7C5CFC}`}</style>
    </div>
  );
}

function Field({ label, hint, required, children }) {
  return <label className="text-sm"><span className="font-medium">{label}{required ? " *" : ""}</span>{hint && <span className="ml-2 text-xs text-[#8A8379]">{hint}</span>}{children}</label>;
}

function Stat({ label, value }) {
  return <div className="rounded-3xl border border-[#E5DED3] bg-white p-4"><div className="text-xs uppercase tracking-wide text-[#8A8379]">{label}</div><div className="mt-1 text-2xl font-semibold">{value}</div></div>;
}

function MemberStat({ label, value }) {
  return <div className="flex items-center gap-2 rounded-2xl bg-[#F8F5F0] px-3 py-2 text-sm"><Users size={15} className="text-[#8A8379]" /><span className="text-[#756F65]">{label}</span><strong className="ml-auto">{value}</strong></div>;
}
