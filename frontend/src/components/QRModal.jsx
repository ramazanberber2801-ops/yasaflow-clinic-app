import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { QRCodeSVG } from "qrcode.react";

export default function QRModal({ open, onClose, deviceId }) {
  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose?.()}>
      <DialogContent className="bg-white rounded-3xl border-[#EBE5DC] max-w-sm" data-testid="qr-modal">
        <DialogHeader>
          <DialogTitle className="text-center font-serif-display text-3xl text-[#2C2A26]">
            Din QR-kode
          </DialogTitle>
          <DialogDescription className="text-center text-[#6B655B]">
            Vis denne til personalet for å samle stempel
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col items-center py-4">
          <div className="p-5 bg-[#FDFBF7] rounded-2xl border border-[#EBE5DC]">
            {deviceId ? (
              <QRCodeSVG
                value={deviceId}
                size={220}
                level="M"
                fgColor="#2C2A26"
                bgColor="#FDFBF7"
                data-testid="qr-svg"
              />
            ) : null}
          </div>
          <p className="mt-5 text-[10px] tracking-[0.2em] uppercase text-[#9C968C]">
            Kunde-ID
          </p>
          <p className="text-xs text-[#6B655B] font-mono mt-1 break-all px-4 text-center" data-testid="qr-device-id">
            {deviceId}
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
