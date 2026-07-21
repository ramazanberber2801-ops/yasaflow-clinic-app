import { useEffect, useState } from "react";
import { ArrowLeft, Bell, Trash2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";

export default function AdminNotifications() {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(null);

  const refresh = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("notifications")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) toast.error(error.message || "Kunne ikke laste varsler");
    setItems(data || []);
    setLoading(false);
  };

  useEffect(() => { refresh(); }, []);

  const remove = async (item) => {
    if (!window.confirm(`Slette varselet «${item.title}»?`)) return;
    setDeleting(item.id);
    const { error } = await supabase.from("notifications").delete().eq("id", item.id);
    if (error) toast.error(error.message || "Kunne ikke slette varselet");
    else {
      setItems((current) => current.filter((entry) => entry.id !== item.id));
      toast.success("Varselet er slettet");
    }
    setDeleting(null);
  };

  return (
    <div className="min-h-screen bg-paper">
      <div className="sticky top-0 z-30 border-b border-[#EBE5DC] bg-white">
        <div className="mx-auto flex max-w-screen-md items-center justify-between px-4 py-3">
          <button onClick={() => navigate("/admin")} className="flex items-center gap-2 text-sm text-[#2C2A26]"><ArrowLeft size={18} />Tilbake</button>
          <div className="font-serif-display text-xl text-[#B89953]">Administrer varsler</div>
          <div className="w-16" />
        </div>
      </div>
      <div className="mx-auto max-w-screen-md space-y-3 px-4 py-6">
        <div className="rounded-2xl bg-[#F4ECD8] px-4 py-3 text-sm text-[#6B655B]">Manuelle varsler vises til kunder i 48 timer. Du kan slette dem tidligere her.</div>
        {loading ? <div className="rounded-3xl bg-white p-6 text-sm">Laster …</div> : items.length ? items.map((item) => (
          <div key={item.id} className="flex items-start gap-3 rounded-3xl border border-[#EBE5DC] bg-white p-5">
            <Bell size={18} className="mt-1 shrink-0 text-[#B89953]" />
            <div className="min-w-0 flex-1">
              <div className="font-medium text-[#2C2A26]">{item.title}</div>
              <div className="mt-1 text-sm text-[#6B655B]">{item.message}</div>
              <div className="mt-2 text-[10px] text-[#9C968C]">{new Date(item.created_at).toLocaleString("no-NO")}</div>
            </div>
            <button disabled={deleting === item.id} onClick={() => remove(item)} className="rounded-full bg-[#F8EAEA] p-2 text-[#9E4747] disabled:opacity-50" aria-label="Slett varsel"><Trash2 size={17} /></button>
          </div>
        )) : <div className="rounded-3xl bg-white p-8 text-center text-sm text-[#6B655B]">Ingen varsler.</div>}
      </div>
    </div>
  );
}
