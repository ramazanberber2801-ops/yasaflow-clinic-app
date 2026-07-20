import { useEffect, useState } from "react";
import { Bell, CheckCheck } from "lucide-react";
import Header from "@/components/Header";
import { listNotifications, markNotificationRead } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export default function Varsler() {
  const { user, profile, loading: authLoading } = useAuth();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setLoading(false);
      return;
    }

    listNotifications()
      .then((data) => {
        const filtered = data.filter((item) => {
          if (item.category === "offers") return profile?.notifications_offers ?? true;
          if (item.category === "loyalty") return profile?.notifications_loyalty ?? true;
          return profile?.notifications_news ?? true;
        });
        setItems(filtered);
      })
      .catch((error) => toast.error(error.message || "Kunne ikke laste varsler"))
      .finally(() => setLoading(false));
  }, [authLoading, user, profile]);

  const markRead = async (id) => {
    try {
      await markNotificationRead(id);
      toast.success("Markert som lest");
    } catch (error) {
      toast.error(error.message || "Kunne ikke oppdatere varselet");
    }
  };

  return (
    <div data-testid="page-varsler">
      <Header title="Varsler" subtitle="Meldinger fra Seldaesthetic" icon={Bell} />
      <div className="px-5 py-6">
        {authLoading || loading ? (
          <div className="rounded-3xl border border-[#EBE5DC] bg-white p-6 text-sm text-[#6B655B]">Laster varsler …</div>
        ) : !user ? (
          <div className="rounded-3xl border border-[#EBE5DC] bg-white p-6 text-sm text-[#6B655B]">Logg inn for å se varslene dine.</div>
        ) : items.length ? (
          <div className="space-y-3">
            {items.map((item) => (
              <article key={item.id} className="rounded-3xl border border-[#EBE5DC] bg-white p-5 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-[10px] uppercase tracking-[0.18em] text-[#B89953]">{item.category}</div>
                    <h2 className="mt-1 font-serif-display text-xl text-[#2C2A26]">{item.title}</h2>
                    <p className="mt-2 text-sm leading-6 text-[#6B655B]">{item.message}</p>
                    <p className="mt-3 text-[10px] text-[#9C968C]">{new Date(item.created_at).toLocaleString("no-NO")}</p>
                  </div>
                  <button type="button" onClick={() => markRead(item.id)} className="rounded-full bg-[#F4ECD8] p-2 text-[#8C6B2F]" aria-label="Marker som lest">
                    <CheckCheck size={16} />
                  </button>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="rounded-3xl border border-[#EBE5DC] bg-white p-8 text-center text-sm text-[#6B655B]">Du har ingen varsler ennå.</div>
        )}
      </div>
    </div>
  );
}
