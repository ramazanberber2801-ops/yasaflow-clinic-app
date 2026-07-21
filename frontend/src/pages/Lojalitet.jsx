import { useEffect, useMemo, useState } from "react";
import { Check, Gift, LockKeyhole, LogIn, QrCode, Sparkles, UserPlus } from "lucide-react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import Header from "@/components/Header";
import QRModal from "@/components/QRModal";
import { getLoyalty, saveLoyaltyProfile } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";

export default function Lojalitet() {
  const { user, profile, loading: authLoading } = useAuth();
  const [card, setCard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [qrOpen, setQrOpen] = useState(false);

  const customerId = user?.id || null;
  const fullName = useMemo(() => profile?.full_name || user?.user_metadata?.full_name || "Kunde", [profile, user]);
  const phone = profile?.phone || user?.user_metadata?.phone || "";

  const refresh = async () => {
    if (!customerId) {
      setCard(null);
      setLoading(false);
      return;
    }
    try {
      const currentCard = await getLoyalty(customerId);
      if ((!currentCard.name || !currentCard.phone) && fullName && phone) {
        const updated = await saveLoyaltyProfile(customerId, fullName, phone);
        setCard({ ...currentCard, ...updated });
      } else {
        setCard(currentCard);
      }
    } catch (error) {
      toast.error(error.message || "Kunne ikke laste lojalitetskortet");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (authLoading) return;
    refresh();
    const onVisible = () => document.visibilityState === "visible" && refresh();
    document.addEventListener("visibilitychange", onVisible);
    const interval = customerId ? setInterval(refresh, 10000) : null;
    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      if (interval) clearInterval(interval);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, customerId, fullName, phone]);

  if (authLoading) {
    return <div data-testid="page-lojalitet"><Header title="Lojalitetskort" subtitle="Samle stempler og få belønning" icon={Sparkles} /><div className="px-5 mt-6"><div className="rounded-3xl border border-[#EBE5DC] bg-white p-6 text-sm text-[#6B655B]">Laster …</div></div></div>;
  }

  if (!user) return <LockedLoyaltyCard />;

  const stamps = card?.stamps || 0;
  const completed = card?.total_completed || 0;
  const goal = card?.stamp_goal || 10;
  const remaining = Math.max(0, goal - stamps);
  const progress = Math.min(100, (stamps / goal) * 100);

  return (
    <div data-testid="page-lojalitet">
      <Header title="Lojalitetskort" subtitle="Ditt digitale stempelkort" icon={Sparkles} />
      <div className="px-5 mt-6 pb-8">
        <section className="overflow-hidden rounded-[32px] bg-[#2C2A26] text-white shadow-[0_18px_50px_rgba(44,42,38,0.18)]">
          <div className="p-6 sm:p-7">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[10px] uppercase tracking-[0.28em] text-white/55">{card?.campaign_name || "Seldaesthetic"}</p>
                <h2 className="mt-2 font-serif-display text-3xl">{fullName}</h2>
                <p className="mt-1 text-sm text-white/65">{loading ? "Laster kortet …" : `${stamps} av ${goal} stempler`}{completed > 0 ? ` • ${completed} fullført` : ""}</p>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10"><Sparkles size={23} strokeWidth={1.5} className="text-[#D4B36A]" /></div>
            </div>

            <div className={`mt-7 grid gap-3 ${goal <= 5 ? "grid-cols-5" : goal <= 10 ? "grid-cols-5" : "grid-cols-6"}`} data-testid="stamps-grid">
              {Array.from({ length: goal }).map((_, index) => {
                const number = index + 1;
                const filled = number <= stamps && !loading;
                return (
                  <div key={number} className={`aspect-square rounded-full flex items-center justify-center text-center transition-all ${filled ? "bg-gradient-to-br from-[#D4B36A] to-[#B89953] text-white shadow-lg" : number === goal ? "border border-dashed border-[#D4B36A]/70 bg-white/8 text-[#E6C985]" : "border border-white/10 bg-white/5 text-white/40"}`}>
                    {filled ? <Check size={18} strokeWidth={2.4} /> : number === goal ? <Gift size={16} /> : <span className="text-xs">{number}</span>}
                  </div>
                );
              })}
            </div>

            <div className="mt-7 h-1.5 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full bg-gradient-to-r from-[#D4B36A] to-[#B89953] transition-all duration-500" style={{ width: `${progress}%` }} /></div>
            <p className="mt-3 text-xs text-white/60">{stamps >= goal ? "Belønningen din er klar" : `${remaining} stempler igjen til fullt kort`}</p>
          </div>
        </section>

        <button type="button" onClick={() => setQrOpen(true)} disabled={loading || !card} className="mt-5 flex h-14 w-full items-center justify-center gap-3 rounded-full bg-[#C5A059] font-medium text-white shadow-[0_10px_28px_rgba(197,160,89,0.28)] transition-transform active:scale-[0.98] disabled:opacity-50">
          <QrCode size={20} strokeWidth={1.7} />Vis min QR-kode
        </button>

        <p className="mt-4 px-5 text-center text-xs leading-relaxed text-[#6B655B]">Vis QR-koden til personalet etter behandlingen. Pågående kort beholdes til det er fullt og innløst, selv om klinikken lanserer et nytt kort.</p>

        <section className="mt-7 rounded-3xl border border-[#EBE5DC] bg-white p-5">
          <h3 className="font-serif-display text-xl text-[#2C2A26]">Din belønning</h3>
          <div className="mt-4 flex items-start gap-3 rounded-2xl bg-[#F7F3EC] p-4">
            <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${stamps >= goal ? "bg-[#C5A059] text-white" : "bg-[#F4ECD8] text-[#8C6B2F]"}`}>{stamps >= goal ? <Check size={17} /> : <Gift size={17} />}</div>
            <div><div className="font-medium text-[#2C2A26]">{card?.reward || "Belønning"}</div><div className="mt-1 text-xs text-[#6B655B]">Krever {goal} stempler</div></div>
          </div>
        </section>
      </div>
      {customerId && <QRModal open={qrOpen} onClose={() => setQrOpen(false)} deviceId={customerId} />}
    </div>
  );
}

function LockedLoyaltyCard() {
  return (
    <div data-testid="page-lojalitet">
      <Header title="Lojalitetskort" subtitle="Samle stempler og få belønning" icon={Sparkles} />
      <div className="px-5 mt-6 pb-8">
        <section className="relative overflow-hidden rounded-[32px] bg-[#2C2A26] p-7 text-center text-white shadow-[0_18px_50px_rgba(44,42,38,0.18)]">
          <div className="absolute -right-12 -top-12 h-40 w-40 rounded-full bg-[#C5A059]/15 blur-2xl" />
          <div className="relative mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-white/10"><LockKeyhole size={29} strokeWidth={1.5} className="text-[#D4B36A]" /></div>
          <h2 className="relative mt-5 font-serif-display text-3xl">Aktiver lojalitetskortet</h2>
          <p className="relative mx-auto mt-3 max-w-sm text-sm leading-6 text-white/65">Opprett en gratis kundekonto for å få ditt personlige QR-kort, samle stempler og beholde dem dersom du bytter telefon.</p>
          <div className="relative mt-7 grid gap-3">
            <Link to="/login?mode=signup" className="flex h-13 items-center justify-center gap-2 rounded-full bg-[#C5A059] px-5 py-3.5 text-sm font-medium text-white"><UserPlus size={18} />Opprett konto og aktiver</Link>
            <Link to="/login?mode=login" className="flex h-13 items-center justify-center gap-2 rounded-full border border-white/15 bg-white/5 px-5 py-3.5 text-sm font-medium text-white"><LogIn size={18} />Jeg har allerede en konto</Link>
          </div>
        </section>
      </div>
    </div>
  );
}
