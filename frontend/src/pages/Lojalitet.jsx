import { useEffect, useState } from "react";
import { Sparkles, Check, QrCode } from "lucide-react";
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

  const refresh = async () => {
    try {
      const card = await getLoyalty(deviceId);
      setStamps(card.stamps || 0);
      setCompleted(card.total_completed || 0);
    } catch (e) {
      // ignore
    } finally {
      setLoading(false);
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
