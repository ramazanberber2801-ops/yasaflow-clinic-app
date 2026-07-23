import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, CalendarDays, ChevronRight, Search, Star, Tags, UserRound, Users } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { getCurrentClinicId } from "@/lib/currentClinic";

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
          supabase.from("crm_customer_preferences").select("user_id,vip,archived,last_visit_at,total_visits,lifetime_value_nok,preferred_contact_channel").eq("clinic_id", clinicId).in("user_id", userIds),
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

  const filtered = useMemo(() => {
    const text = query.trim().toLowerCase();
    return customers.filter((customer) => {
      const matchText = !text || [customer.full_name, customer.phone, ...(customer.tags || [])].filter(Boolean).some((value) => String(value).toLowerCase().includes(text));
      const lastActivity = customer.preferences?.last_visit_at || customer.loyalty?.last_stamped_at || customer.updated_at;
      const nearReward = customer.loyalty && customer.loyalty.stamp_goal - customer.loyalty.stamps <= 1;
      const matchFilter = filter === "all"
        || (filter === "birthday" && monthMatches(customer.birth_date))
        || (filter === "near_reward" && nearReward)
        || (filter === "inactive" && daysSince(lastActivity) >= 90)
        || (filter === "vip" && customer.preferences?.vip);
      return matchText && matchFilter && !customer.preferences?.archived;
    });
  }, [customers, query, filter]);

  const stats = useMemo(() => ({
    total: customers.filter((item) => !item.preferences?.archived).length,
    birthdays: customers.filter((item) => monthMatches(item.birth_date)).length,
    nearReward: customers.filter((item) => item.loyalty && item.loyalty.stamp_goal - item.loyalty.stamps <= 1).length,
    vip: customers.filter((item) => item.preferences?.vip).length,
  }), [customers]);

  return (
    <div className="min-h-screen bg-paper text-[#2C2A26]">
      <header className="sticky top-0 z-30 border-b border-[#EBE5DC] bg-white">
        <div className="mx-auto flex max-w-screen-lg items-center justify-between px-4 py-3">
          <button onClick={() => navigate("/admin")} className="flex items-center gap-2 text-sm"><ArrowLeft size={18}/>Tilbake</button>
          <div className="font-serif-display text-xl text-[#B89953]">Kunder</div>
          <div className="w-16" />
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
    </div>
  );
}

function Stat({ icon: Icon, label, value }) {
  return <div className="rounded-3xl border border-[#EBE5DC] bg-white p-4"><Icon size={18} className="text-[#B89953]"/><div className="mt-3 text-2xl font-semibold">{value}</div><div className="mt-1 text-xs text-[#6B655B]">{label}</div></div>;
}
