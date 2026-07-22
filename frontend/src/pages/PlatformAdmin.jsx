import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, ArrowLeft, Building2, Database, ExternalLink, Plus, RefreshCw, Save, Search, ShieldCheck, Users, X } from "lucide-react";
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
  name: "", slug: "", primaryDomain: "", ownerEmail: "", status: "active",
  booking_enabled: false, gift_card_enabled: false, campaigns_enabled: true,
  loyalty_enabled: true, push_enabled: true,
};

const GB = 1024 * 1024 * 1024;
const formatGb = (bytes = 0) => `${(Number(bytes) / GB).toFixed(bytes > GB / 10 ? 2 : 3)} GB`;
const formatDate = (value) => value ? new Date(value).toLocaleString("nb-NO") : "—";

function slugify(value) {
  return value.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

export default function PlatformAdmin() {
  const [clinics, setClinics] = useState([]);
  const [settings, setSettings] = useState([]);
  const [members, setMembers] = useState([]);
  const [licenses, setLicenses] = useState([]);
  const [storage, setStorage] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [audit, setAudit] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(null);
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [refreshingStorage, setRefreshingStorage] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [moduleFilter, setModuleFilter] = useState("all");

  const load = async () => {
    setLoading(true);
    const [clinicResult, settingsResult, membersResult, licenseResult, storageResult, alertsResult, auditResult] = await Promise.all([
      supabase.from("clinics").select("id,slug,name,primary_domain,status,created_at,updated_at").order("created_at", { ascending: false }),
      supabase.from("clinic_settings").select("clinic_id,clinic_name,booking_enabled,booking_url,gift_card_enabled,campaigns_enabled,loyalty_enabled,push_enabled"),
      supabase.from("clinic_members").select("clinic_id,role,status"),
      supabase.from("clinic_licenses").select("clinic_id,status,monthly_price_nok,storage_quota_bytes,trial_ends_at,starts_at,ends_at,notes,updated_at"),
      supabase.from("clinic_storage_usage").select("clinic_id,used_bytes,file_count,image_count,document_count,calculated_at"),
      supabase.from("platform_clinic_alerts").select("*").order("severity"),
      supabase.from("platform_audit_log").select("id,clinic_id,actor_user_id,action,entity_type,entity_id,created_at").order("created_at", { ascending: false }).limit(20),
    ]);
    setLoading(false);
    const error = clinicResult.error || settingsResult.error || membersResult.error || licenseResult.error || storageResult.error || alertsResult.error || auditResult.error;
    if (error) return toast.error(error.message || "Kunne ikke hente plattformdata");
    setClinics(clinicResult.data || []);
    setSettings(settingsResult.data || []);
    setMembers(membersResult.data || []);
    setLicenses(licenseResult.data || []);
    setStorage(storageResult.data || []);
    setAlerts(alertsResult.data || []);
    setAudit(auditResult.data || []);
  };

  useEffect(() => { load(); }, []);

  const settingsByClinic = useMemo(() => new Map(settings.map((row) => [row.clinic_id, row])), [settings]);
  const licenseByClinic = useMemo(() => new Map(licenses.map((row) => [row.clinic_id, row])), [licenses]);
  const storageByClinic = useMemo(() => new Map(storage.map((row) => [row.clinic_id, row])), [storage]);
  const clinicNameById = useMemo(() => new Map(clinics.map((row) => [row.id, row.name])), [clinics]);
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
      const matchesQuery = !normalizedQuery || [clinic.name, clinic.slug, clinic.primary_domain].filter(Boolean).some((value) => value.toLowerCase().includes(normalizedQuery));
      return matchesQuery && (statusFilter === "all" || clinic.status === statusFilter) && (moduleFilter === "all" || Boolean(row?.[moduleFilter]));
    });
  }, [clinics, moduleFilter, query, settingsByClinic, statusFilter]);

  const patchClinic = (clinicId, patch) => setClinics((rows) => rows.map((row) => row.id === clinicId ? { ...row, ...patch } : row));
  const patchSettings = (clinicId, patch) => setSettings((rows) => rows.map((row) => row.clinic_id === clinicId ? { ...row, ...patch } : row));
  const patchLicense = (clinicId, patch) => setLicenses((rows) => rows.map((row) => row.clinic_id === clinicId ? { ...row, ...patch } : row));

  const saveClinic = async (clinic) => {
    const clinicSettings = settingsByClinic.get(clinic.id);
    const license = licenseByClinic.get(clinic.id);
    setSaving(clinic.id);
    const [clinicResult, settingsResult, licenseResult] = await Promise.all([
      supabase.from("clinics").update({ name: clinic.name, primary_domain: clinic.primary_domain || null, status: clinic.status, updated_at: new Date().toISOString() }).eq("id", clinic.id),
      clinicSettings ? supabase.from("clinic_settings").update({ ...Object.fromEntries(MODULES.map(([key]) => [key, clinicSettings[key]])), updated_at: new Date().toISOString() }).eq("clinic_id", clinic.id) : Promise.resolve({ error: null }),
      license ? supabase.from("clinic_licenses").update({ status: license.status, storage_quota_bytes: Number(license.storage_quota_bytes), notes: license.notes || null, updated_at: new Date().toISOString() }).eq("clinic_id", clinic.id) : Promise.resolve({ error: null }),
    ]);
    setSaving(null);
    const error = clinicResult.error || settingsResult.error || licenseResult.error;
    if (error) return toast.error(error.message || "Kunne ikke lagre");
    toast.success(`${clinic.name} er oppdatert`);
    await load();
  };

  const refreshStorage = async () => {
    setRefreshingStorage(true);
    const { error } = await supabase.rpc("refresh_clinic_storage_usage", { p_clinic_id: null });
    setRefreshingStorage(false);
    if (error) return toast.error(error.message || "Kunne ikke oppdatere lagringsbruk");
    toast.success("Lagringsbruk er oppdatert");
    await load();
  };

  const updateForm = (patch) => setForm((current) => ({ ...current, ...patch }));
  const handleNameChange = (name) => setForm((current) => ({ ...current, name, slug: current.slug && current.slug !== slugify(current.name) ? current.slug : slugify(name) }));

  const createClinic = async (event) => {
    event.preventDefault();
    if (!form.name.trim() || !form.slug.trim()) return toast.error("Klinikknavn og slug er påkrevd");
    setCreating(true);
    const { data, error } = await supabase.rpc("create_clinic_onboarding", {
      p_name: form.name.trim(), p_slug: form.slug.trim(), p_primary_domain: form.primaryDomain.trim() || null,
      p_owner_email: form.ownerEmail.trim() || null, p_status: form.status,
      ...Object.fromEntries(MODULES.map(([key]) => [`p_${key}`, form[key]])),
    });
    setCreating(false);
    if (error) return toast.error(error.message || "Kunne ikke opprette klinikken");
    toast.success(`${data?.name || form.name} er opprettet med 499 kr/mnd og 2 GB lagring`);
    setForm(EMPTY_FORM); setShowCreate(false); await load();
  };

  const totalUsed = storage.reduce((sum, row) => sum + Number(row.used_bytes || 0), 0);

  return (
    <div className="min-h-screen bg-[#F8F5F0] px-4 py-6 text-[#2C2A26] sm:px-6">
      <div className="mx-auto max-w-6xl">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div><Link to="/admin" className="mb-3 inline-flex items-center gap-2 text-sm text-[#756F65]"><ArrowLeft size={16} />Til klinikkadmin</Link><h1 className="text-3xl font-semibold">Yasaflow Clinic plattformadmin</h1><p className="mt-1 text-sm text-[#756F65]">Klinikker, lisens, 2 GB lagringskvote, varsler og audit-logg.</p></div>
          <div className="flex flex-wrap gap-2">
            <button onClick={refreshStorage} disabled={refreshingStorage} className="inline-flex items-center gap-2 rounded-full border border-[#DDD4C6] bg-white px-4 py-2 text-sm disabled:opacity-50"><Database size={16} />{refreshingStorage ? "Beregner …" : "Oppdater lagring"}</button>
            <button onClick={() => setShowCreate((value) => !value)} className="inline-flex items-center gap-2 rounded-full bg-[#7C5CFC] px-4 py-2 text-sm text-white">{showCreate ? <X size={16} /> : <Plus size={16} />}{showCreate ? "Lukk" : "Ny klinikk"}</button>
            <button onClick={load} className="inline-flex items-center gap-2 rounded-full border border-[#DDD4C6] bg-white px-4 py-2 text-sm"><RefreshCw size={16} />Oppdater</button>
          </div>
        </div>

        {showCreate && <form onSubmit={createClinic} className="mb-6 rounded-3xl border border-[#DCD2FF] bg-white p-5 shadow-sm"><h2 className="text-xl font-semibold">Opprett ny klinikk</h2><p className="mt-1 text-sm text-[#756F65]">Standardlisens: 499 kr per måned og 2 GB lagring. Betaling kobles til Paddle senere.</p><div className="mt-5 grid gap-4 md:grid-cols-2"><Field label="Klinikknavn" required><input value={form.name} onChange={(e) => handleNameChange(e.target.value)} className="field-input" /></Field><Field label="Slug" required><input value={form.slug} onChange={(e) => updateForm({ slug: slugify(e.target.value) })} className="field-input" /></Field><Field label="Domene"><input value={form.primaryDomain} onChange={(e) => updateForm({ primaryDomain: e.target.value.toLowerCase().replace(/^https?:\/\//, "").replace(/\/$/, "") })} className="field-input" /></Field><Field label="Eierens e-post"><input type="email" value={form.ownerEmail} onChange={(e) => updateForm({ ownerEmail: e.target.value })} className="field-input" /></Field></div><div className="mt-5 grid gap-2 sm:grid-cols-2 lg:grid-cols-5">{MODULES.map(([key, label]) => <label key={key} className="flex items-center justify-between rounded-2xl border border-[#E5DED3] px-3 py-2 text-sm">{label}<input type="checkbox" checked={Boolean(form[key])} onChange={(e) => updateForm({ [key]: e.target.checked })} /></label>)}</div><div className="mt-5 flex justify-end"><button disabled={creating} className="rounded-full bg-[#2C2A26] px-5 py-2.5 text-sm text-white">{creating ? "Oppretter …" : "Opprett klinikk"}</button></div></form>}

        <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-5"><Stat label="Klinikker" value={clinics.length} /><Stat label="Aktive lisenser" value={licenses.filter((row) => row.status === "active").length} /><Stat label="Suspendert" value={licenses.filter((row) => row.status === "suspended").length} /><Stat label="Lagring brukt" value={formatGb(totalUsed)} /><Stat label="Aktive varsler" value={alerts.length} /></div>

        {alerts.length > 0 && <section className="mb-6 rounded-3xl border border-[#F0D7A8] bg-[#FFF9ED] p-5"><div className="mb-3 flex items-center gap-2 font-semibold"><AlertTriangle size={18} />Systemvarsler</div><div className="grid gap-2 md:grid-cols-2">{alerts.map((alert, index) => <div key={`${alert.clinic_id}-${alert.alert_type}-${index}`} className="rounded-2xl bg-white px-4 py-3 text-sm"><strong>{alert.clinic_name}</strong><div className="text-[#756F65]">{alert.message}</div></div>)}</div></section>}

        <div className="mb-5 grid gap-3 rounded-3xl border border-[#E5DED3] bg-white p-4 md:grid-cols-[1fr_180px_200px]"><label className="flex items-center gap-2 rounded-2xl border border-[#E5DED3] px-3 py-2"><Search size={17} /><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Søk klinikk" className="min-w-0 flex-1 bg-transparent text-sm outline-none" /></label><select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="rounded-2xl border border-[#E5DED3] px-3 py-2 text-sm"><option value="all">Alle statuser</option><option value="active">Aktive</option><option value="inactive">Inaktive</option><option value="suspended">Suspenderte</option></select><select value={moduleFilter} onChange={(e) => setModuleFilter(e.target.value)} className="rounded-2xl border border-[#E5DED3] px-3 py-2 text-sm"><option value="all">Alle moduler</option>{MODULES.map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></div>

        {loading ? <div className="rounded-3xl bg-white p-6">Henter plattformdata …</div> : <div className="space-y-4">{filteredClinics.map((clinic) => {
          const row = settingsByClinic.get(clinic.id); const summary = memberSummary.get(clinic.id) || { total: 0, owners: 0, staff: 0, customers: 0 }; const license = licenseByClinic.get(clinic.id); const usage = storageByClinic.get(clinic.id); const quota = Number(license?.storage_quota_bytes || 2 * GB); const used = Number(usage?.used_bytes || 0); const percent = Math.min(100, quota ? (used / quota) * 100 : 0);
          return <section key={clinic.id} className="rounded-3xl border border-[#E5DED3] bg-white p-5 shadow-sm"><div className="mb-5 flex flex-wrap items-start justify-between gap-3"><div className="flex items-center gap-3"><div className="grid h-11 w-11 place-items-center rounded-2xl bg-[#F3EBDD]"><Building2 size={20} /></div><div><input value={clinic.name} onChange={(e) => patchClinic(clinic.id, { name: e.target.value })} className="w-full bg-transparent text-xl font-semibold outline-none" /><div className="text-xs text-[#8A8379]">/{clinic.slug} · Opprettet {new Date(clinic.created_at).toLocaleDateString("nb-NO")}</div></div></div><button onClick={() => saveClinic(clinic)} disabled={saving === clinic.id} className="inline-flex items-center gap-2 rounded-full bg-[#2C2A26] px-4 py-2 text-sm text-white"><Save size={16} />{saving === clinic.id ? "Lagrer …" : "Lagre"}</button></div>
          <div className="mb-5 grid gap-2 sm:grid-cols-4"><MemberStat label="Totalt" value={summary.total} /><MemberStat label="Eiere" value={summary.owners} /><MemberStat label="Ansatte" value={summary.staff} /><MemberStat label="Kunder" value={summary.customers} /></div>
          <div className="grid gap-4 lg:grid-cols-3"><Field label="Domene"><div className="flex items-center gap-2"><input value={clinic.primary_domain || ""} onChange={(e) => patchClinic(clinic.id, { primary_domain: e.target.value })} className="field-input" />{clinic.primary_domain && <a href={`https://${clinic.primary_domain}`} target="_blank" rel="noreferrer"><ExternalLink size={16} /></a>}</div></Field><Field label="Klinikkstatus"><select value={clinic.status} onChange={(e) => patchClinic(clinic.id, { status: e.target.value })} className="field-input"><option value="active">Aktiv</option><option value="inactive">Inaktiv</option><option value="suspended">Suspendert</option></select></Field><Field label="Lisensstatus"><select value={license?.status || "active"} onChange={(e) => patchLicense(clinic.id, { status: e.target.value })} className="field-input"><option value="trial">Prøveperiode</option><option value="active">Aktiv</option><option value="suspended">Suspendert</option><option value="cancelled">Avsluttet</option></select></Field></div>
          <div className="mt-5 rounded-2xl bg-[#F8F5F0] p-4"><div className="flex flex-wrap items-center justify-between gap-2 text-sm"><strong>499 kr/mnd · Lagring</strong><span>{formatGb(used)} av {formatGb(quota)} · {usage?.file_count || 0} filer</span></div><div className="mt-3 h-2 overflow-hidden rounded-full bg-[#E5DED3]"><div className="h-full rounded-full bg-[#7C5CFC]" style={{ width: `${percent}%` }} /></div><div className="mt-2 text-xs text-[#756F65]">{percent.toFixed(1)} % brukt · Sist beregnet {formatDate(usage?.calculated_at)}</div><div className="mt-3 grid gap-3 sm:grid-cols-2"><Field label="Lagringskvote i GB"><input type="number" min="0.1" step="0.1" value={(quota / GB).toFixed(1)} onChange={(e) => patchLicense(clinic.id, { storage_quota_bytes: Math.round(Number(e.target.value) * GB) })} className="field-input" /></Field><Field label="Internt notat"><input value={license?.notes || ""} onChange={(e) => patchLicense(clinic.id, { notes: e.target.value })} className="field-input" /></Field></div></div>
          <div className="mt-5 grid gap-2 sm:grid-cols-2 lg:grid-cols-5">{MODULES.map(([key, label]) => <label key={key} className="flex items-center justify-between rounded-2xl border border-[#E5DED3] px-3 py-2 text-sm">{label}<input type="checkbox" checked={Boolean(row?.[key])} onChange={(e) => patchSettings(clinic.id, { [key]: e.target.checked })} disabled={!row} /></label>)}</div></section>;
        })}</div>}

        <section className="mt-8 rounded-3xl border border-[#E5DED3] bg-white p-5"><div className="mb-4 flex items-center gap-2"><ShieldCheck size={19} /><h2 className="text-lg font-semibold">Siste audit-hendelser</h2></div><div className="space-y-2">{audit.length === 0 ? <div className="text-sm text-[#756F65]">Ingen hendelser ennå.</div> : audit.map((event) => <div key={event.id} className="flex flex-wrap items-center justify-between gap-2 rounded-2xl bg-[#F8F5F0] px-4 py-3 text-sm"><span><strong>{clinicNameById.get(event.clinic_id) || "Plattform"}</strong> · {event.action} {event.entity_type}</span><span className="text-xs text-[#756F65]">{formatDate(event.created_at)}</span></div>)}</div></section>
      </div>
      <style>{`.field-input{margin-top:.25rem;width:100%;border:1px solid #E5DED3;border-radius:1rem;background:#fff;padding:.65rem .8rem;outline:none}.field-input:focus{border-color:#7C5CFC}`}</style>
    </div>
  );
}

function Field({ label, required, children }) { return <label className="text-sm"><span className="font-medium">{label}{required ? " *" : ""}</span>{children}</label>; }
function Stat({ label, value }) { return <div className="rounded-3xl border border-[#E5DED3] bg-white p-4"><div className="text-xs uppercase tracking-wide text-[#8A8379]">{label}</div><div className="mt-1 text-2xl font-semibold">{value}</div></div>; }
function MemberStat({ label, value }) { return <div className="flex items-center gap-2 rounded-2xl bg-[#F8F5F0] px-3 py-2 text-sm"><Users size={15} /><span className="text-[#756F65]">{label}</span><strong className="ml-auto">{value}</strong></div>; }
