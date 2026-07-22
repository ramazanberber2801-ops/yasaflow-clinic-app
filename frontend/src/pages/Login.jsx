import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeft, Eye, EyeOff, LockKeyhole, Mail, Phone, UserRound } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { PASSWORD_REQUIREMENTS_TEXT, validatePassword } from "@/lib/passwordPolicy";

const PRODUCTION_URL = "https://seldaesthetic-app.vercel.app";
const AUTH_REDIRECT_URL = `${PRODUCTION_URL}/profil`;

export default function Login() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [mode, setMode] = useState(searchParams.get("mode") === "signup" ? "signup" : "login");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [form, setForm] = useState({ name: "", phone: "", email: "", password: "" });

  const updateField = (field) => (event) => {
    setForm((current) => ({ ...current, [field]: event.target.value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (mode === "signup") {
      const passwordError = validatePassword(form.password);
      if (passwordError) {
        toast.error(passwordError);
        return;
      }
    }

    setLoading(true);

    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email: form.email.trim(),
          password: form.password,
          options: {
            emailRedirectTo: AUTH_REDIRECT_URL,
            data: {
              full_name: form.name.trim(),
              phone: form.phone.trim(),
              role: "customer",
            },
          },
        });

        if (error) throw error;
        toast.success("Kontoen er opprettet. Sjekk e-posten din for bekreftelse.");
        setMode("login");
        return;
      }

      const { error } = await supabase.auth.signInWithPassword({
        email: form.email.trim(),
        password: form.password,
      });

      if (error) throw error;
      toast.success("Du er logget inn");
      navigate("/profil", { replace: true });
    } catch (error) {
      toast.error(error.message || "Noe gikk galt. Prøv igjen.");
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!form.email.trim()) {
      toast.error("Skriv inn e-postadressen din først");
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(form.email.trim(), {
        redirectTo: AUTH_REDIRECT_URL,
      });
      if (error) throw error;
      toast.success("Lenke for nytt passord er sendt på e-post");
    } catch (error) {
      toast.error(error.message || "Kunne ikke sende lenken");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8F5F0] px-5 py-8">
      <div className="mx-auto max-w-md">
        <Link to="/profil" className="inline-flex items-center gap-2 text-sm text-[#5F594F]">
          <ArrowLeft size={18} /> Tilbake
        </Link>

        <section className="mt-6 rounded-3xl border border-[#EBE5DC] bg-white p-6 shadow-sm">
          <div className="flex rounded-2xl bg-[#F0E9DF] p-1">
            <button type="button" onClick={() => setMode("login")} className={`flex-1 rounded-xl px-3 py-2.5 text-sm font-medium ${mode === "login" ? "bg-white text-[#2C2A26] shadow-sm" : "text-[#6B655B]"}`}>
              Logg inn
            </button>
            <button type="button" onClick={() => setMode("signup")} className={`flex-1 rounded-xl px-3 py-2.5 text-sm font-medium ${mode === "signup" ? "bg-white text-[#2C2A26] shadow-sm" : "text-[#6B655B]"}`}>
              Opprett konto
            </button>
          </div>

          <h1 className="mt-6 font-serif text-3xl text-[#2C2A26]">
            {mode === "login" ? "Velkommen tilbake" : "Opprett kundekonto"}
          </h1>
          <p className="mt-2 text-sm leading-6 text-[#6B655B]">
            {mode === "login" ? "Logg inn for å se profilen og lojalitetskortet ditt." : "Kontoen brukes til lojalitetskort, tilbud og varsler."}
          </p>

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            {mode === "signup" && (
              <>
                <Field icon={UserRound} label="Navn">
                  <input required value={form.name} onChange={updateField("name")} className="w-full bg-transparent text-sm outline-none" placeholder="Fullt navn" />
                </Field>
                <Field icon={Phone} label="Telefon">
                  <input required type="tel" value={form.phone} onChange={updateField("phone")} className="w-full bg-transparent text-sm outline-none" placeholder="Telefonnummer" />
                </Field>
              </>
            )}

            <Field icon={Mail} label="E-post">
              <input required type="email" autoComplete="email" value={form.email} onChange={updateField("email")} className="w-full bg-transparent text-sm outline-none" placeholder="navn@epost.no" />
            </Field>

            <Field icon={LockKeyhole} label="Passord">
              <input required minLength={6} type={showPassword ? "text" : "password"} autoComplete={mode === "login" ? "current-password" : "new-password"} value={form.password} onChange={updateField("password")} className="w-full bg-transparent text-sm outline-none" placeholder={mode === "signup" ? PASSWORD_REQUIREMENTS_TEXT : "Passord"} />
              <button type="button" onClick={() => setShowPassword((value) => !value)} aria-label={showPassword ? "Skjul passord" : "Vis passord"}>
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </Field>

            {mode === "signup" && (
              <p className="text-xs leading-5 text-[#8A8378]">{PASSWORD_REQUIREMENTS_TEXT}.</p>
            )}

            {mode === "login" && (
              <button type="button" onClick={handleForgotPassword} className="text-sm font-medium text-[#9A7B3F]">
                Glemt passord?
              </button>
            )}

            <button type="submit" disabled={loading} className="w-full rounded-2xl bg-[#2C2A26] px-4 py-3.5 text-sm font-medium text-white disabled:opacity-60">
              {loading ? "Vennligst vent …" : mode === "login" ? "Logg inn" : "Opprett konto"}
            </button>
          </form>
        </section>
      </div>
    </div>
  );
}

function Field({ icon: Icon, label, children }) {
  return (
    <label className="block">
      <span className="mb-2 block text-xs font-medium uppercase tracking-wide text-[#8A8378]">{label}</span>
      <span className="flex items-center gap-3 rounded-2xl border border-[#DED7CC] px-4 py-3.5 text-[#6B655B] focus-within:border-[#B89953]">
        <Icon size={18} strokeWidth={1.5} className="shrink-0 text-[#B89953]" />
        {children}
      </span>
    </label>
  );
}
