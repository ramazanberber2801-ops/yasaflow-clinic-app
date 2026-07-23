import { Link } from "react-router-dom";
import { BarChart3, Bell, Building2, CreditCard, Gift, Instagram, QrCode, Settings, Sparkles, Users } from "lucide-react";
import AdminV2 from "@/pages/AdminV2";
import { useAuth } from "@/contexts/AuthContext";

export default function AdminHub() {
  const { isPlatformAdmin } = useAuth();

  return (
    <div className="relative">
      <AdminV2 />
      <div className="fixed bottom-5 right-5 z-40 flex max-h-[75vh] flex-col items-end gap-3 overflow-y-auto p-1">
        {isPlatformAdmin && (
          <Link to="/clinic-platform-admin" className="flex h-12 items-center gap-2 rounded-full bg-[#7C5CFC] px-4 text-sm text-white shadow-xl" aria-label="Åpne Yasaflow Clinic plattformadmin">
            <Building2 size={17} /> Plattformadmin
          </Link>
        )}
        <Link to="/admin/overview" className="flex h-12 items-center gap-2 rounded-full bg-[#2C2A26] px-4 text-sm text-white shadow-xl" aria-label="Åpne klinikkdashboard">
          <BarChart3 size={17} /> Dashboard
        </Link>
        <Link to="/admin/customers" className="flex h-12 items-center gap-2 rounded-full bg-[#8D7139] px-4 text-sm text-white shadow-xl" aria-label="Åpne kundelisten">
          <Users size={17} /> Kunder
        </Link>
        <Link to="/admin/loyalty-campaigns" className="flex h-12 items-center gap-2 rounded-full bg-[#C5A059] px-4 text-sm text-white shadow-xl" aria-label="Administrer lojalitetskampanjer">
          <Gift size={17} /> Lojalitet
        </Link>
        <Link to="/admin/giveaway" className="flex h-12 items-center gap-2 rounded-full bg-[#A66A52] px-4 text-sm text-white shadow-xl" aria-label="Åpne Instagram Giveaway">
          <Instagram size={17} /> Giveaway
        </Link>
        <Link to="/admin/notifications" className="flex h-12 items-center gap-2 rounded-full bg-[#B89953] px-4 text-sm text-white shadow-xl" aria-label="Administrer push-varsler">
          <Bell size={17} /> Push-varsler
        </Link>
        <Link to="/admin" className="flex h-12 items-center gap-2 rounded-full bg-[#5F574D] px-4 text-sm text-white shadow-xl" aria-label="Administrer kampanjer og tilbud">
          <Sparkles size={17} /> Kampanjer
        </Link>
        <Link to="/admin/subscription" className="flex h-12 items-center gap-2 rounded-full bg-white px-4 text-sm text-[#2C2A26] shadow-xl ring-1 ring-[#EBE5DC]" aria-label="Se abonnement">
          <CreditCard size={17} /> Abonnement
        </Link>
        <Link to="/admin/app-install" className="flex h-12 items-center gap-2 rounded-full bg-white px-4 text-sm text-[#2C2A26] shadow-xl ring-1 ring-[#EBE5DC]" aria-label="Vis QR-kode for installasjon">
          <QrCode size={17} /> Installer app
        </Link>
        <Link to="/admin/settings" className="flex h-12 items-center gap-2 rounded-full bg-white px-4 text-sm text-[#2C2A26] shadow-xl ring-1 ring-[#EBE5DC]" aria-label="Rediger klinikkinfo">
          <Settings size={17} /> Innstillinger
        </Link>
      </div>
    </div>
  );
}
