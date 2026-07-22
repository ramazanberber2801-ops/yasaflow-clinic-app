import { Link } from "react-router-dom";
import { Bell, Building2, Gift, QrCode, Settings, Sparkles } from "lucide-react";
import AdminV2 from "@/pages/AdminV2";
import { useAuth } from "@/contexts/AuthContext";

export default function AdminHub() {
  const { isPlatformAdmin } = useAuth();

  return (
    <div className="relative">
      <AdminV2 />
      <div className="fixed bottom-5 right-5 z-40 flex flex-col items-end gap-3">
        {isPlatformAdmin && (
          <Link
            to="/clinic-platform-admin"
            className="flex h-14 items-center gap-2 rounded-full bg-[#7C5CFC] px-5 text-sm text-white shadow-xl"
            aria-label="Åpne Yasaflow Clinic plattformadmin"
          >
            <Building2 size={18} /> Plattformadmin
          </Link>
        )}
        <Link
          to="/admin/loyalty-campaigns"
          className="flex h-14 items-center gap-2 rounded-full bg-[#C5A059] px-5 text-sm text-white shadow-xl"
          aria-label="Administrer lojalitetskampanjer"
        >
          <Gift size={18} /> Lojalitet
        </Link>
        <Link
          to="/admin/notifications"
          className="flex h-14 items-center gap-2 rounded-full bg-[#B89953] px-5 text-sm text-white shadow-xl"
          aria-label="Administrer push-varsler"
        >
          <Bell size={18} /> Push-varsler
        </Link>
        <Link
          to="/admin"
          className="flex h-14 items-center gap-2 rounded-full bg-[#2C2A26] px-5 text-sm text-white shadow-xl"
          aria-label="Administrer kampanjer og tilbud"
        >
          <Sparkles size={18} /> Kampanjer
        </Link>
        <Link
          to="/admin/app-install"
          className="flex h-14 items-center gap-2 rounded-full bg-white px-5 text-sm text-[#2C2A26] shadow-xl ring-1 ring-[#EBE5DC]"
          aria-label="Vis QR-kode for installasjon"
        >
          <QrCode size={18} /> Installer app
        </Link>
        <Link
          to="/admin/settings"
          className="flex h-14 items-center gap-2 rounded-full bg-white px-5 text-sm text-[#2C2A26] shadow-xl ring-1 ring-[#EBE5DC]"
          aria-label="Rediger klinikkinfo og Timma-lenker"
        >
          <Settings size={18} /> Innstillinger
        </Link>
      </div>
    </div>
  );
}
