import { useEffect, useState } from "react";
import { Download, X } from "lucide-react";

export default function InstallPrompt() {
  const [evt, setEvt] = useState(null);
  const [hidden, setHidden] = useState(
    typeof window !== "undefined" && localStorage.getItem("seld_pwa_dismissed") === "1"
  );

  useEffect(() => {
    const handler = (e) => {
      e.preventDefault();
      setEvt(e);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  if (!evt || hidden) return null;

  const install = async () => {
    evt.prompt();
    const { outcome } = await evt.userChoice;
    if (outcome === "accepted" || outcome === "dismissed") setEvt(null);
  };
  const dismiss = () => {
    localStorage.setItem("seld_pwa_dismissed", "1");
    setHidden(true);
  };

  return (
    <div
      className="fixed left-3 right-3 bottom-24 z-40 bg-white rounded-2xl border border-[#EBE5DC] shadow-[0_12px_32px_rgba(44,42,38,0.12)] p-3 flex items-center gap-3 fade-up"
      data-testid="pwa-install-banner"
    >
      <div className="w-10 h-10 rounded-full bg-[#F4ECD8] flex items-center justify-center shrink-0">
        <Download size={18} strokeWidth={1.5} className="text-[#B89953]" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm text-[#2C2A26] font-medium">Installer Seldaesthetic</div>
        <div className="text-[11px] text-[#6B655B]">Få rask tilgang fra hjemskjermen</div>
      </div>
      <button
        onClick={install}
        className="bg-[#C5A059] hover:bg-[#B89953] text-white text-xs px-4 py-2 rounded-full"
        data-testid="pwa-install-button"
      >
        Installer
      </button>
      <button
        onClick={dismiss}
        aria-label="Lukk"
        className="p-1 rounded-full text-[#9C968C] hover:bg-[#F4F0EA]"
        data-testid="pwa-install-dismiss"
      >
        <X size={14} strokeWidth={1.5} />
      </button>
    </div>
  );
}
