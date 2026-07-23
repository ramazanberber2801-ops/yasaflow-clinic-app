import { useEffect, useMemo, useState } from "react";
import { Check, Gift, LockKeyhole, LogIn, QrCode, Sparkles, UserPlus } from "lucide-react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import Header from "@/components/Header";
import QRModal from "@/components/QRModal";
import { getLoyalty, getLoyaltyRewardStatus, saveLoyaltyProfile } from "@/lib/api";
import { listMyCustomerRewards } from "@/lib/customerRewards";
import { useAuth } from "@/contexts/AuthContext";

export default function Lojalitet() {
  const { user, profile, loading: authLoading } = useAuth();
  const [card, setCard] = useState(null);
  const [rewards, setRewards] = useState([]);
  const [assignedRewards, setAssignedRewards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [qrOpen, setQrOpen] = useState(false);
  const customerId = user?.id || null;
  const fullName = useMemo(() => profile?.full_name || user?.user_metadata?.full_name || "Kunde", [profile, user]);
  const phone = profile?.phone || user?.user_metadata?.phone || "";

  const refresh = async () => {
    if (!customerId) {
      setCard(null);
      setRewards([]);
      setAssignedRewards([]);
      setLoading(false);
      return;
    }
    try {
      let currentCard = await getLoyalty(customerId);
      if ((!currentCard.name || !currentCard.phone) && fullName && phone) {
        const updated = await saveLoyaltyProfile(customerId, fullName, phone);
        currentCard = { ...currentCard, ...updated };
      }
      const [status, customerRewards] = await Promise.all([
        getLoyaltyRewardStatus(customerId, currentCard),
        listMyCustomerRewards(),
      ]);
      setCard(status.card);
      setRewards(status.rewards);
      setAssignedRewards(customerRewards);
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

  if (authLoading) return <div><Header title="Lojalitetskort" subtitle="Samle stempler og få belønning" icon={Sparkles}/><div className="px-5 mt-6"><div className="rounded-3xl border bg-white p-6 text-sm">Laster …</div></div></div>;
  if (!user) return <LockedLoyaltyCard/>;

  const stamps = card?.stamps || 0;
  const completed = card?.total_completed || 0;
  const goal = card?.stamp_goal || 10;
  const remaining = Math.max(0, goal - stamps);
  const progress = Math.min(100, (stamps / goal) * 100);
  const nextReward = rewards.find((reward) => !reward.redeemed && !reward.achieved);
  const readyRewards = rewards.filter((reward) => reward.achieved && !reward.redeemed);
  const activeAssignedRewards = assignedRewards.filter((reward) => reward.display_status === "active");
  const assignedRewardHistory = assignedRewards.filter((reward) => reward.display_status !== "active");

  return (
    <div data-testid="page-lojalitet">
      <Header title="Lojalitetskort" subtitle="Ditt digitale stempelkort" icon={Sparkles}/>
      <div className="px-5 mt-6 pb-8">
        <section className="overflow-hidden rounded-[32px] bg-[#2C2A26] text-white shadow-[0_18px_50px_rgba(44,42,38,0.18)]">
          <div className="p-6 sm:p-7">
            <div className="flex items-start justify-between gap-4"><div><p className="text-[10px] uppercase tracking-[0.28em] text-white/55">{card?.campaign_name || "Seldaesthetic"}</p><h2 className="mt-2 font-serif-display text-3xl">{fullName}</h2><p className="mt-1 text-sm text-white/65">{loading ? "Laster kortet …" : `${stamps} av ${goal} stempler`}{completed > 0 ? ` • ${completed} fullført` : ""}</p></div><div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10"><Sparkles size={23} className="text-[#D4B36A]"/></div></div>
            <div className={`mt-7 grid gap-3 ${goal <= 10 ? "grid-cols-5" : "grid-cols-6"}`}>
              {Array.from({ length: goal }).map((_, index) => { const number = index + 1; const filled = number <= stamps && !loading; const tier = rewards.find((reward) => reward.stamps_required === number); return <div key={number} className={`aspect-square rounded-full flex items-center justify-center text-center ${filled ? "bg-gradient-to-br from-[#D4B36A] to-[#B89953] text-white shadow-lg" : tier ? "border border-dashed border-[#D4B36A]/70 bg-white/8 text-[#E6C985]" : "border border-white/10 bg-white/5 text-white/40"}`}>{filled ? <Check size={18}/> : tier ? <Gift size={15}/> : <span className="text-xs">{number}</span>}</div>; })}
            </div>
            <div className="mt-7 h-1.5 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full bg-gradient-to-r from-[#D4B36A] to-[#B89953]" style={{ width: `${progress}%` }}/></div>
            <p className="mt-3 text-xs text-white/60">{readyRewards.length ? `${readyRewards.length} belønning${readyRewards.length === 1 ? "" : "er"} klar` : nextReward ? `${Math.max(0, nextReward.stamps_required - stamps)} stempler til neste belønning` : stamps >= goal ? "Sluttbelønningen er klar" : `${remaining} stempler igjen`}</p>
          </div>
        </section>

        <button type="button" onClick={() => setQrOpen(true)} disabled={loading || !card} className="mt-5 flex h-14 w-full items-center justify-center gap-3 rounded-full bg-[#C5A059] font-medium text-white disabled:opacity-50"><QrCode size={20}/>Vis min QR-kode</button>
        <p className="mt-4 px-5 text-center text-xs leading-relaxed text-[#6B655B]">Vis QR-koden til personalet etter behandlingen. Personalet kan gi stempel og løse inn tilgjengelige belønninger.</p>

        <section className="mt-7 rounded-3xl border border-[#EBE5DC] bg-white p-5">
          <h3 className="font-serif-display text-xl text-[#2C2A26]">Dine aktive belønninger</h3>
          <p className="mt-1 text-xs text-[#6B655B]">Belønninger løses inn av personalet i klinikken.</p>
          <div className="mt-4 space-y-3">
            {activeAssignedRewards.map((reward) => <AssignedReward key={reward.id} reward={reward}/>) }
            {!activeAssignedRewards.length && <div className="text-sm text-[#6B655B]">Ingen aktive belønninger akkurat nå.</div>}
          </div>
        </section>

        <section className="mt-7 rounded-3xl border border-[#EBE5DC] bg-white p-5">
          <h3 className="font-serif-display text-xl text-[#2C2A26]">Stempelfordeler</h3>
          <div className="mt-4 space-y-3">
            {rewards.map((reward) => <div key={reward.id} className="flex items-start gap-3 rounded-2xl bg-[#F7F3EC] p-4"><div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${reward.redeemed ? "bg-[#E8E5DF] text-[#777168]" : reward.achieved ? "bg-[#C5A059] text-white" : "bg-[#F4ECD8] text-[#8C6B2F]"}`}>{reward.redeemed || reward.achieved ? <Check size={17}/> : <Gift size={17}/>}</div><div className="min-w-0"><div className="font-medium text-[#2C2A26]">{reward.title}</div><div className="mt-1 text-xs text-[#6B655B]">{reward.redeemed ? "Innløst av klinikken" : reward.achieved ? "Klar – vis til personalet" : `Krever ${reward.stamps_required} stempler`}{reward.validity_days ? ` • gyldig i ${reward.validity_days} dager etter innløsning` : ""}</div>{reward.description && <div className="mt-1 text-xs text-[#777168]">{reward.description}</div>}</div></div>)}
            {!rewards.length && <div className="text-sm text-[#6B655B]">Ingen belønningstrinn er satt opp ennå.</div>}
          </div>
        </section>

        {assignedRewardHistory.length > 0 && <section className="mt-7 rounded-3xl border border-[#EBE5DC] bg-white p-5"><h3 className="font-serif-display text-xl text-[#2C2A26]">Belønningshistorikk</h3><div className="mt-4 space-y-3">{assignedRewardHistory.map((reward) => <AssignedReward key={reward.id} reward={reward}/>)}</div></section>}
      </div>
      {customerId && <QRModal open={qrOpen} onClose={() => setQrOpen(false)} deviceId={customerId}/>} 
    </div>
  );
}

function AssignedReward({ reward }) {
  const statusLabel = reward.display_status === "redeemed" ? "Innløst" : reward.display_status === "expired" ? "Utløpt" : "Aktiv";
  return <div className="flex items-start gap-3 rounded-2xl bg-[#F7F3EC] p-4"><div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${reward.display_status === "active" ? "bg-[#C5A059] text-white" : "bg-[#E8E5DF] text-[#777168]"}`}><Gift size={17}/></div><div className="min-w-0"><div className="font-medium text-[#2C2A26]">{reward.title}</div><div className="mt-1 text-xs text-[#6B655B]">{statusLabel}{reward.expires_at && reward.display_status === "active" ? ` • gyldig til ${new Date(reward.expires_at).toLocaleDateString("no-NO")}` : ""}{reward.redeemed_at ? ` • ${new Date(reward.redeemed_at).toLocaleDateString("no-NO")}` : ""}</div>{reward.description && <div className="mt-1 text-xs text-[#777168]">{reward.description}</div>}</div></div>;
}

function LockedLoyaltyCard() {
  return <div><Header title="Lojalitetskort" subtitle="Samle stempler og få belønning" icon={Sparkles}/><div className="px-5 mt-6 pb-8"><section className="relative overflow-hidden rounded-[32px] bg-[#2C2A26] p-7 text-center text-white"><div className="relative mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-white/10"><LockKeyhole size={29} className="text-[#D4B36A]"/></div><h2 className="relative mt-5 font-serif-display text-3xl">Aktiver lojalitetskortet</h2><p className="relative mx-auto mt-3 max-w-sm text-sm leading-6 text-white/65">Opprett en gratis kundekonto for å samle stempler og få belønninger.</p><div className="relative mt-7 grid gap-3"><Link to="/login?mode=signup" className="flex items-center justify-center gap-2 rounded-full bg-[#C5A059] px-5 py-3.5 text-sm"><UserPlus size={18}/>Opprett konto og aktiver</Link><Link to="/login?mode=login" className="flex items-center justify-center gap-2 rounded-full border border-white/15 px-5 py-3.5 text-sm"><LogIn size={18}/>Jeg har allerede en konto</Link></div></section></div></div>;
}
