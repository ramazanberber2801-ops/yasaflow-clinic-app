import { useEffect, useState } from "react";
import {
  Bell,
  ChevronDown,
  ChevronRight,
  LockKeyhole,
  LogIn,
  LogOut,
  Save,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";

const benefits = [
  "Samle stempler og behold dem på alle enhetene dine",
  "Få tilgang til ditt digitale lojalitetskort",
  "Velg selv hvilke varsler du ønsker å motta",
];

export default function Profil() {
  const { user, profile, isAdmin, loading, signOut, refreshProfile } = useAuth();
  const [openSection, setOpenSection] = useState(null);
  const [saving, setSaving] = useState(false);
  const [details, setDetails] = useState({ full_name: "", phone: "" });
  const [passwords, setPasswords] = useState({ password: "", confirm: "" });
  const [notifications, setNotifications] = useState({
    notifications_offers: true,
    notifications_loyalty: true,
    notifications_news: true,
  });

  useEffect(() => {
    setDetails({
      full_name: profile?.full_name || user?.user_metadata?.full_name || "",
      phone: profile?.phone || user?.user_metadata?.phone || "",
    });
    setNotifications({
      notifications_offers: profile?.notifications_offers ?? true,
      notifications_loyalty: profile?.notifications_loyalty ?? true,
      notifications_news: profile?.notifications_news ?? true,
    });
  }, [profile, user]);

  const handleSignOut = async () => {
    const { error } = await signOut();
    if (error) {
      toast.error("Kunne ikke logge ut");
      return;
    }
    toast.success("Du er logget ut");
  };

  const saveDetails = async () => {
    if (!details.full_name.trim() || !details.phone.trim()) {
      toast.error("Fyll inn både navn og telefonnummer");
      return;
    }

    setSaving(true);
    try {
      const payload = {
        id: user.id,
        full_name: details.full_name.trim(),
        phone: details.phone.trim(),
        updated_at: new Date().toISOString(),
      };

      const { error: profileError } = await supabase
        .from("profiles")
        .upsert(payload, { onConflict: "id" });
      if (profileError) throw profileError;

      const { error: authError } = await supabase.auth.updateUser({
        data: {
          full_name: details.full_name.trim(),
          phone: details.phone.trim(),
        },
      });
      if (authError) throw authError;

      await refreshProfile();
      toast.success("Personopplysningene er oppdatert");
      setOpenSection(null);
    } catch (error) {
      toast.error(error.message || "Kunne ikke lagre personopplysningene");
    } finally {
      setSaving(false);
    }
  };

  const changePassword = async () => {
    if (passwords.password.length < 6) {
      toast.error("Passordet må ha minst 6 tegn");
      return;
    }
    if (passwords.password !== passwords.confirm) {
      toast.error("Passordene er ikke like");
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: passwords.password });
      if (error) throw error;
      setPasswords({ password: "", confirm: "" });
      setOpenSection(null);
      toast.success("Passordet er endret");
    } catch (error) {
      toast.error(error.message || "Kunne ikke endre passordet");
    } finally {
      setSaving(false);
    }
  };

  const saveNotifications = async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ ...notifications, updated_at: new Date().toISOString() })
        .eq("id", user.id);
      if (error) throw error;
      await refreshProfile();
      setOpenSection(null);
      toast.success("Varselinnstillingene er lagret");
    } catch (error) {
      toast.error(error.message || "Kunne ikke lagre varselinnstillingene");
    } finally {
      setSaving(false);
    }
  };

  const toggleSection = (section) => {
    setOpenSection((current) => (current === section ? null : section));
  };

  if (loading) {
    return (
      <div className="px-5 pt-24 pb-8" data-testid="page-profil">
        <div className="rounded-3xl border border-[#EBE5DC] bg-white p-6 text-sm text-[#6B655B]">
          Laster profilen …
        </div>
      </div>
    );
  }

  const fullName = profile?.full_name || user?.user_metadata?.full_name || "Kunde";
  const phone = profile?.phone || user?.user_metadata?.phone || "Telefonnummer er ikke registrert";

  return (
    <div className="px-5 pt-24 pb-8" data-testid="page-profil">
      <section className="bg-white rounded-3xl border border-[#EBE5DC] p-6 shadow-sm">
        <div className="h-14 w-14 rounded-2xl bg-[#F0E9DF] flex items-center justify-center text-[#B89953]">
          <UserRound size={28} strokeWidth={1.5} />
        </div>
        <h1 className="font-serif text-3xl text-[#2C2A26] mt-5">Min profil</h1>

        {user ? (
          <>
            <div className="mt-4 rounded-2xl bg-[#F8F5F0] p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-medium text-[#2C2A26]">{fullName}</p>
                  <p className="mt-1 text-sm text-[#6B655B]">{user.email}</p>
                  <p className="mt-1 text-sm text-[#6B655B]">{phone}</p>
                </div>
                {isAdmin && (
                  <span className="rounded-full bg-[#EAE2D5] px-3 py-1 text-xs font-medium text-[#7A6135]">
                    Admin
                  </span>
                )}
              </div>
              <p className="mt-2 text-xs text-[#8A8378]">
                {user.email_confirmed_at ? "E-post er bekreftet" : "E-post venter på bekreftelse"}
              </p>
            </div>

            {isAdmin && (
              <Link
                to="/admin"
                className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-[#B89953] px-4 py-3.5 text-sm font-medium text-white"
              >
                <ShieldCheck size={18} strokeWidth={1.6} />
                Åpne adminpanelet
              </Link>
            )}

            <button
              type="button"
              onClick={handleSignOut}
              className="mt-4 w-full rounded-2xl bg-[#2C2A26] text-white py-3.5 px-4 flex items-center justify-center gap-2 text-sm font-medium"
            >
              <LogOut size={18} strokeWidth={1.6} />
              Logg ut
            </button>
          </>
        ) : (
          <>
            <p className="text-sm leading-6 text-[#6B655B] mt-2">
              Logg inn eller opprett en konto for å bruke lojalitetskortet på alle telefoner.
            </p>

            <div className="mt-6 space-y-3">
              <Link
                to="/login?mode=login"
                className="w-full rounded-2xl bg-[#2C2A26] text-white py-3.5 px-4 flex items-center justify-center gap-2 text-sm font-medium"
              >
                <LogIn size={18} strokeWidth={1.6} />
                Logg inn
              </Link>
              <Link
                to="/login?mode=signup"
                className="block w-full rounded-2xl bg-[#F0E9DF] text-[#2C2A26] py-3.5 px-4 text-center text-sm font-medium"
              >
                Opprett konto
              </Link>
            </div>
          </>
        )}
      </section>

      {!user && (
        <section className="mt-5 bg-white rounded-3xl border border-[#EBE5DC] p-5">
          <h2 className="font-serif text-xl text-[#2C2A26]">Fordeler med konto</h2>
          <div className="mt-4 space-y-4">
            {benefits.map((benefit) => (
              <div key={benefit} className="flex gap-3 text-sm text-[#5F594F]">
                <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-[#B89953]" />
                <span>{benefit}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      {user && (
        <section className="mt-5 bg-white rounded-3xl border border-[#EBE5DC] overflow-hidden">
          <SettingsRow
            label="Personopplysninger"
            icon={UserRound}
            open={openSection === "details"}
            onClick={() => toggleSection("details")}
          />
          {openSection === "details" && (
            <div className="border-t border-[#EBE5DC] bg-[#FCFAF7] p-5 space-y-4">
              <Field label="Navn">
                <input
                  value={details.full_name}
                  onChange={(event) => setDetails((current) => ({ ...current, full_name: event.target.value }))}
                  className="w-full rounded-2xl border border-[#DED7CC] bg-white px-4 py-3 text-sm outline-none focus:border-[#B89953]"
                  autoComplete="name"
                />
              </Field>
              <Field label="Telefonnummer">
                <input
                  value={details.phone}
                  onChange={(event) => setDetails((current) => ({ ...current, phone: event.target.value }))}
                  className="w-full rounded-2xl border border-[#DED7CC] bg-white px-4 py-3 text-sm outline-none focus:border-[#B89953]"
                  autoComplete="tel"
                  inputMode="tel"
                />
              </Field>
              <SaveButton onClick={saveDetails} saving={saving} />
            </div>
          )}

          <SettingsRow
            label="Endre passord"
            icon={LockKeyhole}
            open={openSection === "password"}
            onClick={() => toggleSection("password")}
          />
          {openSection === "password" && (
            <div className="border-t border-[#EBE5DC] bg-[#FCFAF7] p-5 space-y-4">
              <Field label="Nytt passord">
                <input
                  type="password"
                  value={passwords.password}
                  onChange={(event) => setPasswords((current) => ({ ...current, password: event.target.value }))}
                  className="w-full rounded-2xl border border-[#DED7CC] bg-white px-4 py-3 text-sm outline-none focus:border-[#B89953]"
                  autoComplete="new-password"
                  placeholder="Minst 6 tegn"
                />
              </Field>
              <Field label="Gjenta nytt passord">
                <input
                  type="password"
                  value={passwords.confirm}
                  onChange={(event) => setPasswords((current) => ({ ...current, confirm: event.target.value }))}
                  className="w-full rounded-2xl border border-[#DED7CC] bg-white px-4 py-3 text-sm outline-none focus:border-[#B89953]"
                  autoComplete="new-password"
                />
              </Field>
              <SaveButton onClick={changePassword} saving={saving} label="Endre passord" />
            </div>
          )}

          <SettingsRow
            label="Varsler"
            icon={Bell}
            open={openSection === "notifications"}
            onClick={() => toggleSection("notifications")}
          />
          {openSection === "notifications" && (
            <div className="border-t border-[#EBE5DC] bg-[#FCFAF7] p-5 space-y-4">
              <Toggle
                label="Tilbud og kampanjer"
                checked={notifications.notifications_offers}
                onChange={(checked) => setNotifications((current) => ({ ...current, notifications_offers: checked }))}
              />
              <Toggle
                label="Lojalitetskort og belønninger"
                checked={notifications.notifications_loyalty}
                onChange={(checked) => setNotifications((current) => ({ ...current, notifications_loyalty: checked }))}
              />
              <Toggle
                label="Nyheter fra Seldaesthetic"
                checked={notifications.notifications_news}
                onChange={(checked) => setNotifications((current) => ({ ...current, notifications_news: checked }))}
              />
              <SaveButton onClick={saveNotifications} saving={saving} label="Lagre varsler" />
            </div>
          )}
        </section>
      )}
    </div>
  );
}

function SettingsRow({ label, icon: Icon, open, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full px-5 py-4 flex items-center gap-3 text-left border-b border-[#EBE5DC] last:border-b-0"
    >
      <Icon size={19} strokeWidth={1.5} className="text-[#B89953]" />
      <span className="text-sm text-[#2C2A26] flex-1">{label}</span>
      {open ? <ChevronDown size={18} strokeWidth={1.5} /> : <ChevronRight size={18} strokeWidth={1.5} />}
    </button>
  );
}

function Field({ label, children }) {
  return (
    <label className="block">
      <span className="mb-2 block text-xs font-medium uppercase tracking-wide text-[#8A8378]">{label}</span>
      {children}
    </label>
  );
}

function SaveButton({ onClick, saving, label = "Lagre endringer" }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={saving}
      className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[#B89953] px-4 py-3.5 text-sm font-medium text-white disabled:opacity-60"
    >
      <Save size={17} strokeWidth={1.6} />
      {saving ? "Lagrer …" : label}
    </button>
  );
}

function Toggle({ label, checked, onChange }) {
  return (
    <label className="flex items-center justify-between gap-4 rounded-2xl border border-[#EBE5DC] bg-white p-4">
      <span className="text-sm text-[#2C2A26]">{label}</span>
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="h-5 w-5 accent-[#B89953]"
      />
    </label>
  );
}
