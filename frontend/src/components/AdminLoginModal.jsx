import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Lock } from "lucide-react";
import { adminLogin, setAdminToken } from "@/lib/api";
import { toast } from "sonner";

export default function AdminLoginModal({ open, onClose, onSuccess }) {
  const [pwd, setPwd] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await adminLogin(pwd);
      if (res?.token) setAdminToken(res.token);
      sessionStorage.setItem("seld_admin", "1");
      toast.success("Velkommen, admin");
      setPwd("");
      onSuccess?.();
    } catch (err) {
      toast.error("Feil passord");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose?.()}>
      <DialogContent className="bg-white rounded-3xl border-[#EBE5DC] max-w-sm" data-testid="admin-login-modal">
        <DialogHeader>
          <div className="mx-auto w-14 h-14 rounded-full bg-[#F4ECD8] flex items-center justify-center mb-2">
            <Lock size={22} strokeWidth={1.5} className="text-[#B89953]" />
          </div>
          <DialogTitle className="text-center font-serif-display text-2xl text-[#2C2A26]">
            Admin tilgang
          </DialogTitle>
          <DialogDescription className="text-center text-[#6B655B]">
            Skriv inn passord for å fortsette
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4 mt-2">
          <Input
            type="password"
            value={pwd}
            onChange={(e) => setPwd(e.target.value)}
            placeholder="Passord"
            data-testid="admin-password-input"
            className="rounded-2xl h-12 border-[#EBE5DC] focus-visible:ring-[#C5A059]"
            autoFocus
          />
          <button
            type="submit"
            disabled={loading || !pwd}
            data-testid="admin-login-submit"
            className="w-full h-12 rounded-full bg-[#C5A059] text-white font-medium hover:bg-[#B89953] transition-colors disabled:opacity-50 active:scale-95"
          >
            {loading ? "Verifiserer..." : "Logg inn"}
          </button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
