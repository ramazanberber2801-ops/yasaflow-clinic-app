import { useEffect, useState } from "react";
import { Bell, X } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { enablePushNotifications, registerPushNotifications } from "@/lib/pushNotifications";

export default function PushPermissionPrompt() {
  const { user } = useAuth();
  const [visible, setVisible] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!("Notification" in window)) return;
    if (Notification.permission === "granted") {
      registerPushNotifications(user?.id || null).catch((error) => console.warn("Push token refresh failed:", error));
      return;
    }
    if (Notification.permission === "default" && localStorage.getItem("push-prompt-dismissed") !== "1") {
      const timer = window.setTimeout(() => setVisible(true), 1800);
      return () => window.clearTimeout(timer);
    }
  }, [user]);

  if (!visible) return null;

  const enable = async () => {
    setBusy(true);
    try {
      const token = await enablePushNotifications(user?.id || null);
      if (!token) {
        toast.error("Varsler ble ikke aktivert. Kontroller varslingsinnstillingene på telefonen.");
        return;
      }
      setVisible(false);
      localStorage.removeItem("push-prompt-dismissed");
      toast.success(user ? "Push-varsler er aktivert" : "Tilbud og nyheter er aktivert");
    } catch (error) {
      toast.error(error.message || "Kunne ikke aktivere push-varsler");
    } finally {
      setBusy(false);
    }
  };

  const dismiss = () => {
    localStorage.setItem("push-prompt-dismissed", "1");
    setVisible(false);
  };

  return (
    <div className="fixed inset-x-4 bottom-24 z-[100] mx-auto max-w-md rounded-3xl border border-[#E6DED2] bg-white p-5 shadow-2xl">
      <button type="button" onClick={dismiss} className="absolute right-4 top-4 text-[#8A8378]" aria-label="Lukk">
        <X size={18} />
      </button>
      <div className="flex gap-3 pr-7">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#F4ECD8] text-[#B89953]">
          <Bell size={21} />
        </div>
        <div>
          <h3 className="font-serif text-xl text-[#2C2A26]">Få varsler fra Seldaesthetic</h3>
          <p className="mt-1 text-sm leading-5 text-[#6B655B]">
            {user ? "Få tilbud, nyheter og personlige belønninger direkte på telefonen." : "Få tilbud og nyheter direkte på telefonen. Du trenger ikke å opprette konto."}
          </p>
        </div>
      </div>
      <button type="button" disabled={busy} onClick={enable} className="mt-4 w-full rounded-2xl bg-[#B89953] px-4 py-3.5 text-sm font-medium text-white disabled:opacity-60">
        {busy ? "Aktiverer …" : "Slå på varsler"}
      </button>
    </div>
  );
}