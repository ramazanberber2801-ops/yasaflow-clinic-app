import { Bell, ChevronRight, LockKeyhole, LogIn, UserRound } from "lucide-react";

const benefits = [
  "Samle stempler og behold dem på alle enhetene dine",
  "Få tilgang til ditt digitale lojalitetskort",
  "Velg selv hvilke varsler du ønsker å motta",
];

export default function Profil() {
  return (
    <div className="px-5 pt-24 pb-8" data-testid="page-profil">
      <section className="bg-white rounded-3xl border border-[#EBE5DC] p-6 shadow-sm">
        <div className="h-14 w-14 rounded-2xl bg-[#F0E9DF] flex items-center justify-center text-[#B89953]">
          <UserRound size={28} strokeWidth={1.5} />
        </div>
        <h1 className="font-serif text-3xl text-[#2C2A26] mt-5">Min profil</h1>
        <p className="text-sm leading-6 text-[#6B655B] mt-2">
          Logg inn eller opprett en konto for å bruke lojalitetskortet på alle telefoner.
        </p>

        <div className="mt-6 space-y-3">
          <button
            type="button"
            className="w-full rounded-2xl bg-[#2C2A26] text-white py-3.5 px-4 flex items-center justify-center gap-2 text-sm font-medium"
          >
            <LogIn size={18} strokeWidth={1.6} />
            Logg inn
          </button>
          <button
            type="button"
            className="w-full rounded-2xl bg-[#F0E9DF] text-[#2C2A26] py-3.5 px-4 text-sm font-medium"
          >
            Opprett konto
          </button>
        </div>

        <p className="text-xs text-[#8A8378] mt-4 text-center">
          Innlogging kobles til Supabase i neste utviklingstrinn.
        </p>
      </section>

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

      <section className="mt-5 bg-white rounded-3xl border border-[#EBE5DC] overflow-hidden">
        {[
          { label: "Personopplysninger", icon: UserRound },
          { label: "Endre passord", icon: LockKeyhole },
          { label: "Varsler", icon: Bell },
        ].map(({ label, icon: Icon }, index) => (
          <button
            type="button"
            key={label}
            disabled
            className={`w-full px-5 py-4 flex items-center gap-3 text-left opacity-50 ${
              index > 0 ? "border-t border-[#EBE5DC]" : ""
            }`}
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
