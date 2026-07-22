import { useEffect, useState } from "react";
import { ArrowLeft, Bell, Clock3, Trash2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";

const formatTimeLeft = (expiresAt) => {
  const remaining = new Date(expiresAt).getTime() - Date.now();
  if (remaining <= 0) return "Slettes snart";
  const totalMinutes = Math.ceil(remaining / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours >= 24) return `${Math.floor(hours / 24)} døgn ${hours % 24} t igjen`;
  if (hours > 0) return `${hours} t ${minutes} min igjen`;
  return `${minutes} min igjen`;
};

export default function AdminNotifications() {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(null);
  const [, setClock] = useState(Date.now());

  const refresh = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("notifications")
      .select("*")
      .gt("expires_at", new Date().toISOString())
      .order("created_at", { ascending: false });
    if (error) toast.error(error.message || "Kunne ikke laste varsler");
    setItems(data || []);
    setLoading(false);
  };

  useEffect(() => { refresh(); }, []);
  useEffect(() => {
    const timer = window.setInterval(() => {
      setClock(Date.now());
      setItems((current) => current.filter((item) => new Date(item.expires_at).getTime() > Date.now()));
    }, 60000);
    return () => window.clearInterval(timer);
  }, []);

  const remove = async (item) => {
    if (!window.confirm(`Slette varselet «${item.title}» permanent? Dette kan ikke angres.`)) return;
    setDeleting(item.id);
    const { error } = await supabase.from("notifications").delete().eq("id", item.id);
    if (error) toast.error(error.message || "Kunne ikke slette varselet");
    else {
      setItems((current) => current.filter((entry) => entry.id !== item.id));
      toast.success("Varselet er permanent slettet");
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
        <div className="rounded-2xl bg-[#F4ECD8] px-4 py-3 text-sm leading-6 text-[#6B655B]">Varsler slettes permanent etter 48 timer og bruker da ikke mer databaseplass. Du kan også slette dem permanent tidligere her.</div>
        {loading ? <div className="rounded-3xl bg-white p-6 text-sm">Laster …</div> : items.length ? items.map((item) => (
          <div key={item.id} className="flex items-start gap-3 rounded-3xl border border-[#EBE5DC] bg-white p-5">
            <Bell size={18} className="mt-1 shrink-0 text-[#B89953]" />
            <div className="min-w-0 flex-1">
              <div className="font-medium text-[#2C2A26]">{item.title}</div>
              <div className="mt-1 text-sm text-[#6B655B]">{item.message}</div>
              <div className="mt-3 flex flex-wrap items-center gap-2 text-[10px] text-[#9C968C]">
                <span>{new Date(item.created_at).toLocaleString("no-NO")}</span>
                <span className="flex items-center gap-1 rounded-full bg-[#F4F0EA] px-2 py-1 text-[#6B655B]"><Clock3 size={11} />{formatTimeLeft(item.expires_at)}</span>
              </div>
            </div>
            <button disabled={deleting === item.id} onClick={() => remove(item)} className="rounded-full bg-[#F8EAEA] p-2 text-[#9E4747] disabled:opacity-50" aria-label="Slett varsel permanent"><Trash2 size={17} /></button>
          </div>
        )) : <div className="rounded-3xl bg-white p-8 text-center text-sm text-[#6B655B]">Ingen aktive varsler.</div>}
      </div>
    </div>
  );
}
