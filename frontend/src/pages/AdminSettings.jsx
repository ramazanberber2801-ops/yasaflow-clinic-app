import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Check, ImagePlus, Palette, Plus, RotateCcw, Save, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { getClinicSettings, updateClinicSettings, uploadClinicAsset } from "@/lib/clinicSettings";
import { applyThemeToDocument, CLINIC_THEMES, getTheme, resolveTheme } from "@/lib/themeEngine";

const COLOR_FIELDS = [
  ["primary", "Primærfarge"],
  ["secondary", "Sekundærfarge"],
  ["background", "Bakgrunn"],
  ["card", "Kort og flater"],
  ["text", "Tekstfarge"],
];

export default function AdminSettings() {
  const navigate = useNavigate();
  const [form, setForm] = useState(null);
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState("");

  useEffect(() => {
    getClinicSettings()
      .then(setForm)
      .catch((error) => toast.error(error.message || "Kunne ikke laste innstillinger"));
  }, []);

  const previewTheme = useMemo(
    () => form ? resolveTheme(form.theme_id, form.theme_overrides) : getTheme(),
    [form],
  );

  useEffect(() => {
    if (form) applyThemeToDocument(previewTheme);
  }, [form, previewTheme]);

  const save = async () => {
    if (!form.clinic_name.trim()) return toast.error("Klinikknavn må fylles ut");
    if (form.booking_enabled && !form.booking_url.trim()) return toast.error("Legg inn bookinglenke eller slå av timebestilling");
    if (form.gift_card_enabled && !form.gift_card_url.trim()) return toast.error("Legg inn gavekortlenke eller slå av gavekort");

    setBusy(true);
    try {
      const updated = await updateClinicSettings(form);
      setForm(updated);
      applyThemeToDocument(resolveTheme(updated.theme_id, updated.theme_overrides));
      toast.success("Klinikkinnstillingene er lagret");
    } catch (error) {
      toast.error(error.message || "Kunne ikke lagre innstillingene");
    } finally {
      setBusy(false);
    }
  };

  if (!form) return <div className="min-h-screen bg-paper p-8 text-center text-[#6B655B]">Laster innstillinger...</div>;

  const field = (key, value) => setForm((current) => ({ ...current, [key]: value }));
  const chooseTheme = (themeId) => setForm((current) => ({ ...current, theme_id: themeId, theme_overrides: {} }));
  const setThemeColor = (key, value) => setForm((current) => ({ ...current, theme_overrides: { ...(current.theme_overrides || {}), [key]: value } }));
  const resetThemeColors = () => field("theme_overrides", {});
  const updateSection = (index, key, value) => field("about_sections", form.about_sections.map((section, i) => i === index ? { ...section, [key]: value } : section));
  const addSection = () => field("about_sections", [...form.about_sections, { title: "", text: "" }]);
  const removeSection = (index) => field("about_sections", form.about_sections.filter((_, i) => i !== index));
  const upload = async (event, key, assetKey) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setUploading(key);
    try {
      const url = await uploadClinicAsset(file, assetKey);
      field(key, url);
      toast.success("Bildet er lastet opp. Husk å lagre endringene.");
    } catch (error) {
      toast.error(error.message || "Kunne ikke laste opp bildet");
    } finally {
      setUploading("");
      event.target.value = "";
    }
  };

  return (
    <div className="min-h-screen" style={{ backgroundColor: "var(--brand-background)", color: "var(--brand-text)" }}>
      <div className="sticky top-0 z-30 border-b bg-white" style={{ borderColor: "var(--brand-border)" }}>
        <div className="mx-auto flex max-w-screen-md items-center justify-between px-4 py-3">
          <button onClick={() => navigate("/admin")} className="flex items-center gap-2 text-sm"><ArrowLeft size={18} />Admin</button>
          <div className="font-serif-display text-xl" style={{ color: "var(--brand-primary)" }}>Klinikkinnstillinger</div>
          <div className="w-14" />
        </div>
      </div>

      <div className="mx-auto max-w-screen-md space-y-5 px-4 py-6">
        <SettingsCard title="Tema og design" icon={<Palette size={19} />}>
          <p className="text-sm opacity-70">Velg et ferdig tema og finjuster fargene. Endringene vises direkte før du lagrer.</p>
          <div className="grid gap-3 sm:grid-cols-2">
            {CLINIC_THEMES.map((theme) => {
              const active = form.theme_id === theme.id;
              return (
                <button key={theme.id} type="button" onClick={() => chooseTheme(theme.id)} className="rounded-2xl border-2 p-4 text-left transition" style={{ borderColor: active ? theme.tokens.primary : "var(--brand-border)", backgroundColor: active ? `color-mix(in srgb, ${theme.tokens.primary} 8%, white)` : "var(--brand-card)" }}>
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex gap-1.5">{[theme.tokens.primary, theme.tokens.secondary, theme.tokens.background, theme.tokens.card].map((color) => <span key={color} className="h-7 w-7 rounded-full border" style={{ backgroundColor: color }} />)}</div>
                    {active && <span className="flex h-7 w-7 items-center justify-center rounded-full text-white" style={{ backgroundColor: theme.tokens.primary }}><Check size={15} /></span>}
                  </div>
                  <div className="mt-3 font-medium">{theme.name}</div>
                  <div className="mt-1 text-xs opacity-60">{theme.description}</div>
                </button>
              );
            })}
          </div>
          <div className="rounded-2xl border p-4" style={{ borderColor: "var(--brand-border)", backgroundColor: "var(--brand-subtle)" }}>
            <div className="mb-4 flex items-center justify-between gap-3">
              <div><div className="font-medium">Tilpass farger</div><div className="text-xs opacity-60">Fargene gjelder bare denne klinikken.</div></div>
              <button type="button" onClick={resetThemeColors} className="flex items-center gap-2 rounded-full border px-3 py-2 text-xs" style={{ borderColor: "var(--brand-border)" }}><RotateCcw size={14} />Tilbakestill</button>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {COLOR_FIELDS.map(([key, label]) => (
                <label key={key} className="rounded-2xl bg-white p-3 text-xs">
                  <span className="mb-2 block opacity-65">{label}</span>
                  <div className="flex items-center gap-3">
                    <input type="color" value={previewTheme.tokens[key]} onChange={(event) => setThemeColor(key, event.target.value)} className="h-10 w-12 cursor-pointer rounded border-0 bg-transparent p-0" />
                    <Input value={previewTheme.tokens[key]} onChange={(event) => setThemeColor(key, event.target.value)} className="font-mono uppercase" maxLength={7} />
                  </div>
                </label>
              ))}
            </div>
          </div>
        </SettingsCard>

        <SettingsCard title="Profil og bilder">
          <AssetUpload label="Klinikklogo" value={form.logo_url} busy={uploading === "logo_url"} onChange={(event) => upload(event, "logo_url", "logo")} onRemove={() => field("logo_url", "")} />
          <AssetUpload label="Hovedbilde på Om oss" value={form.about_hero_image_url} busy={uploading === "about_hero_image_url"} onChange={(event) => upload(event, "about_hero_image_url", "about-hero")} onRemove={() => field("about_hero_image_url", "")} />
          <AssetUpload label="Ekstra bilde på Om oss" value={form.about_secondary_image_url} busy={uploading === "about_secondary_image_url"} onChange={(event) => upload(event, "about_secondary_image_url", "about-secondary")} onRemove={() => field("about_secondary_image_url", "")} />
          <p className="text-xs opacity-60">JPG, PNG, WebP eller SVG. Maks 5 MB per bilde.</p>
        </SettingsCard>

        <SettingsCard title="Generelt">
          <Field label="Klinikknavn"><Input value={form.clinic_name} onChange={(e) => field("clinic_name", e.target.value)} /></Field>
          <Field label="Undertittel"><Input value={form.subtitle} onChange={(e) => field("subtitle", e.target.value)} /></Field>
          <Field label="Adresse"><Input value={form.address} onChange={(e) => field("address", e.target.value)} /></Field>
          <Field label="Telefon"><Input value={form.phone} onChange={(e) => field("phone", e.target.value)} /></Field>
          <Field label="E-post"><Input type="email" value={form.email} onChange={(e) => field("email", e.target.value)} /></Field>
          <Field label="Åpningstider"><Textarea rows={5} value={form.opening_hours} onChange={(e) => field("opening_hours", e.target.value)} placeholder="Én linje per dag eller tidsrom" /></Field>
        </SettingsCard>

        <SettingsCard title="Timebestilling og gavekort">
          <Toggle label="Aktiver timebestilling" checked={form.booking_enabled} onChange={(value) => field("booking_enabled", value)} />
          {form.booking_enabled && <Field label="Booking-URL"><Input type="url" value={form.booking_url} onChange={(e) => field("booking_url", e.target.value)} placeholder="https://..." /></Field>}
          <Toggle label="Aktiver gavekort" checked={form.gift_card_enabled} onChange={(value) => field("gift_card_enabled", value)} />
          {form.gift_card_enabled && <Field label="Gavekort-URL"><Input type="url" value={form.gift_card_url} onChange={(e) => field("gift_card_url", e.target.value)} placeholder="https://..." /></Field>}
        </SettingsCard>

        <SettingsCard title="Funksjoner">
          <Toggle label="Kampanjer" checked={form.campaigns_enabled} onChange={(value) => field("campaigns_enabled", value)} />
          <Toggle label="Lojalitetskort" checked={form.loyalty_enabled} onChange={(value) => field("loyalty_enabled", value)} />
          <Toggle label="Push-varsler" checked={form.push_enabled} onChange={(value) => field("push_enabled", value)} />
        </SettingsCard>

        <SettingsCard title="Om klinikken">
          <Field label="Tittel"><Input value={form.about_title} onChange={(e) => field("about_title", e.target.value)} placeholder="Om klinikken" /></Field>
          <Field label="Beskrivelse"><Textarea rows={6} value={form.about_text} onChange={(e) => field("about_text", e.target.value)} placeholder="Skriv klinikkens egen presentasjon" /></Field>
          <div className="space-y-3">
            {form.about_sections.map((section, index) => (
              <div key={index} className="rounded-2xl border p-4" style={{ borderColor: "var(--brand-border)" }}>
                <div className="mb-3 flex items-center justify-between"><span className="text-xs font-medium opacity-70">Informasjonskort {index + 1}</span><button type="button" onClick={() => removeSection(index)} className="opacity-60" aria-label="Fjern informasjonskort"><Trash2 size={17} /></button></div>
                <div className="space-y-3"><Input value={section.title || ""} onChange={(e) => updateSection(index, "title", e.target.value)} placeholder="Overskrift" /><Textarea rows={3} value={section.text || ""} onChange={(e) => updateSection(index, "text", e.target.value)} placeholder="Tekst" /></div>
              </div>
            ))}
            <button type="button" onClick={addSection} className="flex w-full items-center justify-center gap-2 rounded-full border py-3 text-sm" style={{ borderColor: "var(--brand-primary)", color: "var(--brand-primary)" }}><Plus size={17} />Legg til informasjonskort</button>
          </div>
        </SettingsCard>

        <SettingsCard title="Lenker og sosiale medier">
          <Field label="Nettside"><Input type="url" value={form.website_url} onChange={(e) => field("website_url", e.target.value)} /></Field>
          <Field label="Instagram-lenke"><Input type="url" value={form.instagram_url} onChange={(e) => field("instagram_url", e.target.value)} /></Field>
          <Field label="Instagram-navn"><Input value={form.instagram_handle} onChange={(e) => field("instagram_handle", e.target.value)} /></Field>
          <Field label="Facebook-lenke"><Input type="url" value={form.facebook_url} onChange={(e) => field("facebook_url", e.target.value)} /></Field>
        </SettingsCard>

        <button disabled={busy || Boolean(uploading)} onClick={save} className="flex h-12 w-full items-center justify-center gap-2 rounded-full disabled:opacity-50" style={{ backgroundColor: "var(--brand-primary)", color: "var(--brand-primary-text)" }}><Save size={17} />{busy ? "Lagrer..." : "Lagre endringer"}</button>
      </div>
    </div>
  );
}

function SettingsCard({ title, icon, children }) {
  return <section className="space-y-4 rounded-3xl border p-5 shadow-sm" style={{ borderColor: "var(--brand-border)", backgroundColor: "var(--brand-card)", color: "var(--brand-card-text)" }}><h2 className="flex items-center gap-2 font-serif-display text-xl">{icon}{title}</h2>{children}</section>;
}
function Field({ label, children }) { return <div><label className="mb-1 block text-xs opacity-65">{label}</label>{children}</div>; }
function AssetUpload({ label, value, busy, onChange, onRemove }) { return <div className="space-y-2"><div className="text-xs opacity-65">{label}</div>{value ? <img src={value} alt={label} className="h-36 w-full rounded-2xl border object-contain" style={{ borderColor: "var(--brand-border)", backgroundColor: "var(--brand-subtle)" }} /> : <div className="flex h-28 items-center justify-center rounded-2xl border border-dashed opacity-60" style={{ borderColor: "var(--brand-border)", backgroundColor: "var(--brand-subtle)" }}><ImagePlus size={28} /></div>}<div className="flex gap-2"><label className="flex flex-1 cursor-pointer items-center justify-center rounded-full border px-4 py-2 text-sm" style={{ borderColor: "var(--brand-primary)", color: "var(--brand-primary)" }}>{busy ? "Laster opp..." : value ? "Bytt bilde" : "Last opp bilde"}<input type="file" accept="image/jpeg,image/png,image/webp,image/svg+xml" onChange={onChange} disabled={busy} className="hidden" /></label>{value && <button type="button" onClick={onRemove} className="rounded-full border px-4 py-2 text-sm text-red-700" style={{ borderColor: "var(--brand-border)" }}>Fjern</button>}</div></div>; }
function Toggle({ label, checked, onChange }) { return <label className="flex cursor-pointer items-center justify-between gap-4 rounded-2xl px-4 py-3" style={{ backgroundColor: "var(--brand-subtle)" }}><span className="text-sm">{label}</span><input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="h-5 w-5" style={{ accentColor: "var(--brand-primary)" }} /></label>; }
