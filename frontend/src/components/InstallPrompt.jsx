import { useEffect, useMemo, useState } from "react";
import { Download, Share, X } from "lucide-react";

const DISMISS_KEY = "seld_pwa_dismissed_at";
const DISMISS_DAYS = 7;

function isStandalone() {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia?.("(display-mode: standalone)")?.matches ||
    window.navigator.standalone === true
  );
}

function recentlyDismissed() {
  if (typeof window === "undefined") return false;
  const value = Number(localStorage.getItem(DISMISS_KEY) || 0);
  if (!value) return false;
  return Date.now() - value < DISMISS_DAYS * 24 * 60 * 60 * 1000;
}

export default function InstallPrompt() {
  const [installEvent, setInstallEvent] = useState(null);
  const [hidden, setHidden] = useState(() => isStandalone() || recentlyDismissed());
  const [installed, setInstalled] = useState(() => isStandalone());

  const isIOS = useMemo(() => {
    if (typeof navigator === "undefined") return false;
    return /iphone|ipad|ipod/i.test(navigator.userAgent);
  }, []);

  useEffect(() => {
    const handleBeforeInstall = (event) => {
      event.preventDefault();
      setInstallEvent(event);
      setHidden(isStandalone() || recentlyDismissed());
    };

    const handleInstalled = () => {
      setInstalled(true);
      setInstallEvent(null);
      setHidden(true);
      localStorage.removeItem(DISMISS_KEY);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstall);
    window.addEventListener("appinstalled", handleInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstall);
      window.removeEventListener("appinstalled", handleInstalled);
    };
  }, []);

  const canShow = !installed && !hidden && (Boolean(installEvent) || isIOS);
  if (!canShow) return null;

  const install = async () => {
    if (!installEvent) return;
    await installEvent.prompt();
    const { outcome } = await installEvent.userChoice;
    if (outcome === "accepted") {
      setInstallEvent(null);
      setHidden(true);
    }
  };

  const dismiss = () => {
    localStorage.setItem(DISMISS_KEY, String(Date.now()));
    setHidden(true);
  };

  return (
    <div
      className="fixed left-4 right-4 bottom-24 z-50 mx-auto max-w-md rounded-3xl border border-[#E7DED1] bg-white p-4 shadow-[0_18px_50px_rgba(44,42,38,0.18)] fade-up"
      data-testid="pwa-install-banner"
      role="dialog"
      aria-label="Installer Seldaesthetic-appen"
    >
      <button
        type="button"
        onClick={dismiss}
        aria-label="Ikke nå"
        className="absolute right-3 top-3 rounded-full p-2 text-[#9C968C] hover:bg-[#F4F0EA]"
        data-testid="pwa-install-dismiss"
      >
        <X size={16} strokeWidth={1.5} />
      </button>

      <div className="flex items-start gap-4 pr-8">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#F4ECD8]">
          <Download size={21} strokeWidth={1.6} className="text-[#B89953]" />
        </div>

        <div className="min-w-0 flex-1">
          <h2 className="font-serif-display text-xl text-[#2C2A26]">
            Installer Seldaesthetic
          </h2>
          <p className="mt-1 text-xs leading-5 text-[#6B655B]">
            Få rask tilgang til bestilling, gavekort og lojalitetskort direkte fra hjemskjermen.
          </p>
        </div>
      </div>

      {isIOS && !installEvent ? (
        <div className="mt-4 rounded-2xl bg-[#F8F5F0] p-3 text-xs leading-5 text-[#5F594F]">
          <div className="flex items-center gap-2 font-medium text-[#2C2A26]">
            <Share size={16} className="text-[#B89953]" />
            Slik installerer du på iPhone
          </div>
          <p className="mt-1">
            Trykk på delingsknappen i Safari, og velg «Legg til på Hjem-skjerm».
          </p>
        </div>
      ) : (
        <button
          type="button"
          onClick={install}
          className="mt-4 w-full rounded-2xl bg-[#C5A059] px-4 py-3.5 text-sm font-medium text-white transition hover:bg-[#B89953] active:scale-[0.99]"
          data-testid="pwa-install-button"
        >
          Installer appen
        </button>
      )}

      <button
        type="button"
        onClick={dismiss}
        className="mt-2 w-full py-2 text-xs font-medium text-[#7A746B]"
      >
        Ikke nå
      </button>
    </div>
  );
}
