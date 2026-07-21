import { Link } from "react-router-dom";
import { Settings } from "lucide-react";
import AdminV2 from "@/pages/AdminV2";

export default function AdminHub() {
  return (
    <div className="relative">
      <AdminV2 />
      <Link
        to="/admin/settings"
        className="fixed bottom-5 right-5 z-40 flex h-14 items-center gap-2 rounded-full bg-[#2C2A26] px-5 text-sm text-white shadow-xl"
        aria-label="Rediger klinikkinfo"
      >
        <Settings size={18} />Klinikkinfo
      </Link>
    </div>
  );
}
