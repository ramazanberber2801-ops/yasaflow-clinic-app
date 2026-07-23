import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Bell, CalendarDays, ChevronRight, Search, Star, Tags, UserRound, Users, X } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { getCurrentClinicId } from "@/lib/currentClinic";
import { sendPushNotification } from "@/lib/pushAdmin";

const FILTERS = [
  { id: "all", label: "Alle" },
  { id: "birthday", label: "Bursdag denne måneden" },
  { id: "near_reward", label: "Nær belønning" },
  { id: "inactive", label: "Inaktive 90+ dager" },
  { id: "vip", label: "VIP" },
];

function monthMatches(value) {
  if (!value) return false;
  return new Date(`${value}T12:00:00`).getMonth() === new Date().getMonth();
}

function daysSince(value) {
  if (!value) return Infinity;
  return Math.floor((Date.now() - new Date(value).getTime()) / 86400000);
}

export default function AdminCustomers() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [customers, setCustomers] = useState([]);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("all");
  const [selectedTag, setSelectedTag] = useState("");
  const [pushOpen, setPushOpen] = useState(false);
  const [pushTitle, setPushTitle] = useState("");
  const [pushMessage, setPushMessage] = useState("");
  const [sendingPush, setSendingPush] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const clinicId = await getCurrentClinicId();
        const { data: members, error: memberError } = await supabase
          .from("clinic_members")
          .select("user_id,created_at")
          .eq("clinic_id", clinicId)
          .eq("role", "customer")
          .eq("status", "active");
        if (memberError) throw memberError;

        const userIds = (members || []).map((item) => item.user_id);
        if (!userIds.length) {
          if (active) setCustomers([]);
          return;
        }

        const [{ data: profiles, error: profileError }, { data: cards, error: cardError }, { data: preferences, error: preferenceError }] = await Promise.all([
          supabase.from("profiles").select("id,full_name,phone,birth_date,tags,admin_notes,updated_at").in("id", userIds),
          supabase.from("loyalty_cards").select("user_id,stamps,stamp_goal,last_stamped_at,campaign_name").eq("clinic_id", clinicId).in("user_id", userIds),
          supabase.from("crm_customer_preferences").select("user_id,vip,archived,last_visit_at,total_visits,lifetime_value_nok,preferred_contact_channel,marketing_consent").eq("clinic_id", clinicId).in("user_id", userIds),
        ]);
        if (profileError) throw profileError;
        if (cardError) throw cardError;
        if (preferenceError) throw preferenceError;

        const memberMap = new Map((members || []).map((item) => [item.user_id, item]));
        const cardMap = new Map((cards || []).map((item) => [item.user_id, item]));
        const preferenceMap = new Map((preferences || []).map((item) => [item.user_id, item]));
        const rows = (profiles || []).map((profile) => ({
          ...profile,
          joined_at: memberMap.get(profile.id)?.created_at || null,
          loyalty: cardMap.get(profile.id) || null,
          preferences: preferenceMap.get(profile.id) || {},
        }));
        if (active) setCustomers(rows);
      } catch (error) {
        toast.error(error.message || "Kunne ikke laste kundelisten");
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, []);

  const availableTags = useMemo(() => {
    const tags = customers.flatMap((customer) => customer.tags || []);
    return [...new Set(tags.map((tag) => tag.trim()).filter(Boolean))].sort((a, b) => a.localeCompare(b, "no"));
  }, [customers]);

  const filtered = useMemo(() => {
    const text = query.trim().toLowerCase();
    return customers.filter((customer) => {
      const matchText = !text || [customer.full_name, customer.phone, ...(customer.tags || [])].filter(Boolean).some((value) => String(value).toLowerCase().includes(text));
      const matchTag = !selectedTag || (customer.tags || []).some((tag) => tag.toLowerCase() === selectedTag.toLowerCase());
      const lastActivity = customer.preferences?.last_visit_at || customer.loyalty?.last_stamped_at || customer.updated_at;
      const nearReward = customer.loyalty && customer.loyalty.stamp_goal - customer.loyalty.stamps <= 1;
      const matchFilter = filter === "all"
        || (filter === "birthday" && monthMatches(customer.birth_date))
        || (filter === "near_reward" && nearReward)
        || (filter === "inactive" && daysSince(lastActivity) >= 90)
        || (filter === "vip" && customer.preferences?.vip);
      return matchText && matchTag && matchFilter && !customer.preferences?.archived;
    });
  }, [customers, query, filter, selectedTag]);

  const stats = useMemo(() => ({
    total: customers.filter((item) => !item.preferences?.archived).length,
    birthdays: customers.filter((item) => monthMatches(item.birth_date)).length,
    nearReward: customers.filter((item) => item.loyalty && item.loyalty.stamp_goal - item.loyalty.stamps <= 1).length,
    vip: customers.filter((item) => item.preferences?.vip).length,
  }), [customers]);

  const pushRecipients = useMemo(() => {
    const source = selectedTag ? customers.filter((customer) => (customer.tags || []).some((tag) => tag.toLowerCase() === selectedTag.toLowerCase())) : filtered;
    return source.filter((customer) => !customer.preferences?.archived && customer.preferences?.marketing_consent !== false);
  }, [customers, filtered, selectedTag]);

  const sendTagPush = async () => {
    if (!pushTitle.trim() || !pushMessage.trim()) {
      toast.error("Skriv tittel og melding");
      return;
    }
    if (!pushRecipients.length) {
      toast.error("Ingen kunder kan motta denne meldingen");
      return;
    }

    setSendingPush(true);
    try {
      const results = await Promise.allSettled(pushRecipients.map((customer) => sendPushNotification({
        title: pushTitle,
        message: pushMessage,
        category: "offers",
        target_user_id: customer.id,
      })));
      const sent = results.filter((result) => result.status === "fulfilled").length;
      const failed = results.length - sent;
      if (!sent) throw new Error("Ingen push-varsler kunne sendes");
      toast.success(failed ? `${sent} sendt, ${failed} feilet` : `${sent} push-varsler sendt`);
      setPushOpen(false);
      setPushTitle("");
      setPushMessage("");
    } catch (error) {
      toast.error(error.message || "Kunne ikke sende push-varsler");
    } finally {
      setSendingPush(false);
    }
  };

  return (
    <div className="min-h-screen bg-paper text-[#2C2A26]">
      <header className="sticky top-0 z-30 border-b border-[#EBE5DC] bg-white">
        <div className="mx-auto flex max-w-screen-lg items-center justify-between px-4 py-3">
          <button onClick={() => navigate("/admin")} className="flex items-center gap-2 text-sm"><ArrowLeft size={18}/>Tilbake</button>
          <div className="font-serif-display text-xl text-[#B89953]">Kunder</div>
          <button onClick={() => setPushOpen(true)} className="flex items-center gap-2 rounded-full bg-[#2C2A26] px-4 py-2 text-xs text-white"><Bell size={15}/>Send push</button>
        </div>
      </header>

      <main className="mx-auto max-w-screen-lg space-y-5 px-4 py-6">
        <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Stat icon={Users} label="Kunder" value={stats.total}/>
          <Stat icon={CalendarDays} label="Bursdag" value={stats.birthdays}/>
          <Stat icon={Star} label="Nær belønning" value={stats.nearReward}/>
          <Stat icon={UserRound} label="VIP" value={stats.vip}/>
        </section>

        <section className="rounded-3xl border border-[#EBE5DC] bg-white p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9A9388]" size={18}/>
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Søk etter navn, telefon eller etikett" className="w-full rounded-2xl border border-[#EBE5DC] py-3 pl-10 pr-4 outline-none focus:border-[#B89953]"/>
          </div>
          <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
            {FILTERS.map((item) => <button key={item.id} onClick={() => setFilter(item.id)} className={`whitespace-nowrap rounded-full px-3 py-2 text-xs ${filter === item.id ? "bg-[#2C2A26] text-white" : "bg-[#F4F0EA] text-[#6B655B]"}`}>{item.label}</button>)}
          </div>
          {availableTags.length > 0 && (
            <div className="mt-4 border-t border-[#EEE8DE] pt-4">
              <div className="mb-2 flex items-center gap-2 text-xs font-medium text-[#6B655B]"><Tags size={14}/>Filtrer etter etikett</div>
              <div className="flex gap-2 overflow-x-auto pb-1">
                <button onClick={() => setSelectedTag("")} className={`whitespace-nowrap rounded-full px-3 py-2 text-xs ${!selectedTag ? "bg-[#B89953] text-white" : "bg-[#F4F0EA] text-[#6B655B]"}`}>Alle etiketter</button>
                {availableTags.map((tag) => <button key={tag} onClick={() => setSelectedTag(tag)} className={`whitespace-nowrap rounded-full px-3 py-2 text-xs ${selectedTag === tag ? "bg-[#B89953] text-white" : "bg-[#F4F0EA] text-[#6B655B]"}`}>{tag}</button>)}
              </div>
            </div>
          )}
        </section>

        <section className="space-y-3">
          {loading ? <div className="rounded-3xl bg-white p-6 text-sm">Laster kunder …</div> : filtered.length ? filtered.map((customer) => {
            const remaining = customer.loyalty ? Math.max(0, customer.loyalty.stamp_goal - customer.loyalty.stamps) : null;
            return <Link key={customer.id} to={`/admin/customers/${customer.id}`} className="flex items-center gap-4 rounded-3xl border border-[#EBE5DC] bg-white p-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#F4ECD8] font-semibold text-[#8D7139]">{(customer.full_name || "K").slice(0, 1).toUpperCase()}</div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2"><div className="truncate font-medium">{customer.full_name || "Uten navn"}</div>{customer.preferences?.vip && <Star size={14} className="fill-current text-[#B89953]"/>}</div>
                <div className="mt-1 text-xs text-[#746E65]">{customer.phone || "Ingen telefon"}</div>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {(customer.tags || []).slice(0, 3).map((tag) => <span key={tag} className="flex items-center gap-1 rounded-full bg-[#F4F0EA] px-2 py-1 text-[10px]"><Tags size={10}/>{tag}</span>)}
                  {remaining !== null && <span className="rounded-full bg-[#EEF4EC] px-2 py-1 text-[10px] text-[#557153]">{remaining === 0 ? "Belønning klar" : `${remaining} stempel igjen`}</span>}
                </div>
              </div>
              <ChevronRight size={18} className="text-[#A79F94]"/>
            </Link>;
          }) : <div className="rounded-3xl bg-white p-8 text-center text-sm text-[#6B655B]">Ingen kunder matcher søket.</div>}
        </section>
      </main>

      {pushOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/35 p-0 sm:items-center sm:p-4">
          <div className="w-full rounded-t-3xl bg-white p-5 shadow-xl sm:max-w-lg sm:rounded-3xl">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-serif-display text-2xl">Send push</h2>
                <p className="mt-1 text-xs text-[#746E65]">{selectedTag ? `Etikett: ${selectedTag}` : "Kunder i valgt visning"} · {pushRecipients.length} mottakere</p>
              </div>
              <button onClick={() => setPushOpen(false)} className="rounded-full p-2"><X size={19}/></button>
            </div>
            <div className="mt-5 space-y-4">
              <label className="block text-xs text-[#746E65]"><span className="mb-2 block">Tittel</span><input value={pushTitle} onChange={(event) => setPushTitle(event.target.value)} className="w-full rounded-2xl border border-[#EBE5DC] px-4 py-3 outline-none focus:border-[#B89953]"/></label>
              <label className="block text-xs text-[#746E65]"><span className="mb-2 block">Melding</span><textarea value={pushMessage} onChange={(event) => setPushMessage(event.target.value)} rows={5} className="w-full resize-none rounded-2xl border border-[#EBE5DC] px-4 py-3 outline-none focus:border-[#B89953]"/></label>
              <button disabled={sendingPush || !pushRecipients.length} onClick={sendTagPush} className="w-full rounded-2xl bg-[#2C2A26] px-4 py-3 text-sm text-white disabled:opacity-50">{sendingPush ? "Sender …" : `Send til ${pushRecipients.length} kunder`}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Stat({ icon: Icon, label, value }) {
  return <div className="rounded-3xl border border-[#EBE5DC] bg-white p-4"><Icon size={18} className="text-[#B89953]"/><div className="mt-3 text-2xl font-semibold">{value}</div><div className="mt-1 text-xs text-[#6B655B]">{label}</div></div>;
}
