import { useEffect, useState } from "react";
import { Sparkles, Check, QrCode, Shield, Pencil } from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import Header from "@/components/Header";
import QRModal from "@/components/QRModal";
import { getDeviceId } from "@/lib/deviceId";
import { getLoyalty } from "@/lib/api";

const REWARDS = {
  3: "10%",
  6: "20%",
  10: "Gratis peel",
};

export default function Lojalitet() {
  const [deviceId] = useState(() => getDeviceId());
  const [stamps, setStamps] = useState(0);
  const [completed, setCompleted] = useState(0);
  const [loading, setLoading] = useState(true);
  const [qrOpen, setQrOpen] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [savedName, setSavedName] = useState("");
  const [savedPhone, setSavedPhone] = useState("");
  const [editingProfile, setEditingProfile] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);

  const refresh = async () => {
    try {
      const card = await getLoyalty(deviceId);
      setStamps(card.stamps || 0);
      setCompleted(card.total_completed || 0);
      if (card.name) setSavedName(card.name);
      if (card.phone) setSavedPhone(card.phone);
      if (!card.name && !card.phone) setEditingProfile(true);
    } catch (e) {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  const handleSaveProfile = async () => {
    if (!name.trim() || !phone.trim()) {
      toast.error("Vennligst fyll inn både navn og mobilnummer");
      return;
    }
    setSavingProfile(true);
    try {
      const updated = await saveLoyaltyProfile(deviceId, name.trim(), phone.trim());
      setSavedName(updated.name || name.trim());
      setSavedPhone(updated.phone || phone.trim());
      setEditingProfile(false);
      setName("");
      setPhone("");
      toast.success(
        "Kortet ditt er nå sikret! Hvis du bytter telefon i fremtiden, kan klinikken enkelt gjenopprette stemplene dine ved hjelp av mobilnummeret ditt.",
        { duration: 7000 }
      );
    } catch (err) {
      const msg =
        err?.response?.data?.detail ||
        err?.message ||
        "Kunne ikke lagre profil. Sjekk internett og prøv igjen.";
      console.error("Profile save failed:", err?.response || err);
      toast.error(msg);
    } finally {
      setSavingProfile(false);
    }
  };

  useEffect(() => {
    refresh();
    const onVisible = () => document.visibilityState === "visible" && refresh();
    document.addEventListener("visibilitychange", onVisible);
    const i = setInterval(refresh, 10000);
    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      clearInterval(i);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Milestone celebration: detect stamp transitions that hit 3 / 6 / 10
  useEffect(() => {
    if (loading) return;
    const KEY = "seld_last_stamps";
    const prev = parseInt(sessionStorage.getItem(KEY) || "-1", 10);
    if (prev >= 0 && stamps > prev) {
      const REWARDS_TEXT = {
        3: "Du har låst opp 10% rabatt på neste behandling!",
        6: "Du har låst opp 20% rabatt på neste behandling!",
        10: "Du har låst opp en GRATIS peel-behandling!",
      };
      if (REWARDS_TEXT[stamps]) {
        // Mini celebration
        toast.success(REWARDS_TEXT[stamps], { duration: 6000 });
        // Vibrate if supported
        try { navigator.vibrate?.([60, 40, 120]); } catch {}
      }
    }
    sessionStorage.setItem(KEY, String(stamps));
  }, [stamps, loading]);

  return (
    <div data-testid="page-lojalitet">
      <Header
        title="Lojalitetskort"
        subtitle="Samle stempler og få belønning"
        icon={Sparkles}
      />

      <div className="px-5 mt-6">
        {/* Card */}
        <div className="bg-white rounded-3xl p-6 border border-[#EBE5DC]/60 shadow-[0_8px_32px_rgba(44,42,38,0.06)] fade-up">
          <div className="flex items-center justify-between mb-5">
            <div>
              <p className="font-serif-display text-2xl text-[#2C2A26] leading-none">
                Stempelkort
              </p>
              <p className="text-xs text-[#6B655B] mt-1">
                {stamps}/10 stempler
                {completed > 0 ? ` • ${completed} fullført` : ""}
              </p>
            </div>
            <div className="w-12 h-12 rounded-full bg-[#F4ECD8] flex items-center justify-center">
              <span className="font-serif-display text-2xl text-[#B89953] -mt-0.5">S</span>
            </div>
          </div>

          {/* Stamps grid */}
          <div className="grid grid-cols-5 gap-3" data-testid="stamps-grid">
            {Array.from({ length: 10 }).map((_, i) => {
              const num = i + 1;
              const filled = num <= stamps && !loading;
              const reward = REWARDS[num];
              return (
                <div
                  key={num}
                  data-testid={`stamp-${num}${filled ? "-filled" : "-empty"}`}
                  className={`aspect-square rounded-full flex flex-col items-center justify-center text-center transition-all ${
                    filled
                      ? "bg-gradient-to-br from-[#D4B36A] to-[#B89953] text-white shadow-md stamp-pop"
                      : reward
                      ? "bg-[#F4ECD8] border-2 border-dashed border-[#C5A059]/60 text-[#8C6B2F]"
                      : "bg-[#F4F0EA] border border-[#EBE5DC] text-[#9C968C]"
                  }`}
                  style={filled ? { animationDelay: `${i * 40}ms` } : {}}
                >
                  {filled ? (
                    reward ? (
                      <Sparkles size={16} strokeWidth={2} />
                    ) : (
                      <Check size={18} strokeWidth={2.5} />
                    )
                  ) : reward ? (
                    <span className="text-[10px] font-semibold leading-none px-0.5">
                      {reward}
                    </span>
                  ) : (
                    <span className="text-xs font-light">{num}</span>
                  )}
                </div>
              );
            })}
          </div>

          {/* Rewards legend */}
          <div className="mt-6 pt-5 border-t border-[#EBE5DC] space-y-2">
            <RewardRow num={3} text="10% rabatt på neste behandling" achieved={stamps >= 3} />
            <RewardRow num={6} text="20% rabatt på neste behandling" achieved={stamps >= 6} />
            <RewardRow num={10} text="Gratis peel behandling" achieved={stamps >= 10} />
          </div>
        </div>

        {/* QR button */}
        <button
          onClick={() => setQrOpen(true)}
          data-testid="show-qr-button"
          className="mt-6 w-full h-14 rounded-full bg-[#C5A059] text-white font-medium flex items-center justify-center gap-3 active:scale-95 transition-transform shadow-[0_8px_24px_rgba(197,160,89,0.35)] hover:bg-[#B89953]"
        >
          <QrCode size={20} strokeWidth={1.75} />
          Vis min QR-kode
        </button>

        <p className="text-center text-xs text-[#6B655B] mt-4 px-6 leading-relaxed">
          Vis QR-koden til personalet etter hver behandling for å samle stempel.
        </p>

        {/* Profile backup */}
        <section
          className="mt-8 bg-white rounded-3xl p-6 border border-[#EBE5DC]/60 shadow-[0_4px_24px_rgba(44,42,38,0.05)]"
          data-testid="profile-backup-section"
        >
          <div className="flex items-start gap-3 mb-1">
            <div className="w-10 h-10 rounded-full bg-[#F4ECD8] flex items-center justify-center shrink-0">
              <Shield size={18} strokeWidth={1.5} className="text-[#B89953]" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="font-serif-display text-xl text-[#2C2A26] leading-tight">
                  Sikre stempelkortet ditt
                </h3>
                <span className="text-[9px] tracking-[0.2em] uppercase bg-[#F4ECD8] text-[#8C6B2F] px-2 py-0.5 rounded-full">
                  Anbefalt
                </span>
              </div>
              <p className="text-xs text-[#6B655B] mt-1 leading-relaxed">
                Knytt navnet og mobilnummeret ditt til kortet — så kan klinikken
                gjenopprette stemplene dine om du bytter telefon.
              </p>
            </div>
          </div>

          {savedName && !editingProfile ? (
            <div className="mt-4 pt-4 border-t border-[#EBE5DC]" data-testid="profile-saved">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-[10px] tracking-[0.2em] uppercase text-[#9C968C]">
                    Sikret som
                  </div>
                  <div className="text-[#2C2A26] mt-1 truncate">{savedName}</div>
                  <div className="text-xs text-[#6B655B] mt-0.5">{savedPhone}</div>
                </div>
                <button
                  onClick={() => {
                    setName(savedName);
                    setPhone(savedPhone);
                    setEditingProfile(true);
                  }}
                  data-testid="profile-edit"
                  className="flex items-center gap-1.5 text-xs text-[#B89953] hover:text-[#8C6B2F] px-3 py-2 rounded-full bg-[#F4ECD8]/60 hover:bg-[#F4ECD8]"
                >
                  <Pencil size={12} strokeWidth={1.75} />
                  Endre
                </button>
              </div>
              <div className="mt-3 flex items-center gap-2 text-xs text-[#4A6741]">
                <Check size={14} strokeWidth={2} />
                <span>Kortet ditt er sikret</span>
              </div>
            </div>
          ) : (
            <div className="mt-4 pt-4 border-t border-[#EBE5DC] space-y-3" data-testid="profile-form">
              <div>
                <label className="text-[10px] tracking-[0.2em] uppercase text-[#6B655B] block mb-1.5">
                  Navn
                </label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Fornavn Etternavn"
                  data-testid="profile-name-input"
                  className="rounded-2xl h-11 border-[#EBE5DC]"
                  autoComplete="name"
                />
              </div>
              <div>
                <label className="text-[10px] tracking-[0.2em] uppercase text-[#6B655B] block mb-1.5">
                  Mobilnummer
                </label>
                <Input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+47 ..."
                  inputMode="tel"
                  data-testid="profile-phone-input"
                  className="rounded-2xl h-11 border-[#EBE5DC]"
                  autoComplete="tel"
                />
              </div>
              <div className="flex gap-2 pt-1">
                <button
                  onClick={handleSaveProfile}
                  disabled={savingProfile}
                  data-testid="profile-save-button"
                  className="flex-1 h-12 rounded-full bg-[#C5A059] hover:bg-[#B89953] text-white font-medium disabled:opacity-50 active:scale-95 transition-transform"
                >
                  {savingProfile ? "Lagrer..." : "Lagre profil"}
                </button>
                {savedName && (
                  <button
                    onClick={() => {
                      setEditingProfile(false);
                      setName("");
                      setPhone("");
                    }}
                    data-testid="profile-cancel-button"
                    className="h-12 px-5 rounded-full bg-[#F4F0EA] text-[#2C2A26] font-medium active:scale-95"
                  >
                    Avbryt
                  </button>
                )}
              </div>
            </div>
          )}
        </section>
      </div>

      <QRModal open={qrOpen} onClose={() => setQrOpen(false)} deviceId={deviceId} />
    </div>
  );
}

function RewardRow({ num, text, achieved }) {
  return (
    <div className="flex items-center gap-3 text-sm" data-testid={`reward-row-${num}`}>
      <div
        className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold ${
          achieved
            ? "bg-[#C5A059] text-white"
            : "bg-[#F4ECD8] text-[#8C6B2F] border border-[#C5A059]/40"
        }`}
      >
        {num}
      </div>
      <span className={`${achieved ? "text-[#2C2A26]" : "text-[#6B655B]"} font-light`}>
        {text}
      </span>
      {achieved ? <Check size={14} className="text-[#B89953] ml-auto" strokeWidth={2} /> : null}
    </div>
  );
}
