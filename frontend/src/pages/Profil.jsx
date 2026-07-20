import { Bell, ChevronRight, LockKeyhole, LogIn, LogOut, ShieldCheck, UserRound } from "lucide-react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";

const benefits = [
  "Samle stempler og behold dem på alle enhetene dine",
  "Få tilgang til ditt digitale lojalitetskort",
  "Velg selv hvilke varsler du ønsker å motta",
];

export default function Profil() {
  const { user, profile, isAdmin, loading, signOut } = useAuth();

  const handleSignOut = async () => {
    const { error } = await signOut();
    if (error) {
      toast.error("Kunne ikke logge ut");
      return;
    }
    toast.success("Du er logget ut");
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

      <section className="mt-5 bg-white rounded-3xl border border-[#EBE5DC] overflow-hidden">
        {[
          { label: "Personopplysninger", icon: UserRound },
          { label: "Endre passord", icon: LockKeyhole },
          { label: "Varsler", icon: Bell },
        ].map(({ label, icon: Icon }, index) => (
          <button
            type="button"
            key={label}
            disabled={!user}
            className={`w-full px-5 py-4 flex items-center gap-3 text-left ${
              !user ? "opacity-50" : ""
            } ${index > 0 ? "border-t border-[#EBE5DC]" : ""}`}
          >
            <Icon size={19} strokeWidth={1.5} className="text-[#B89953]" />
            <span className="text-sm text-[#2C2A26] flex-1">{label}</span>
            <ChevronRight size={18} strokeWidth={1.5} />
          </button>
        ))}
      </section>
    </div>
  );
}
