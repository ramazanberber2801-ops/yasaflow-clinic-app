import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, Bell, Cake, CheckCircle2, Gift, Megaphone, Sparkles, Stamp, Tags, Users } from "lucide-react";
import { toast } from "sonner";
import { listCustomers, listLoyaltyCampaigns, listNotifications, listOffers } from "@/lib/api";

const ACTIONS = [
  { to: "/admin/loyalty-campaigns", label: "Opprett stempelkort", icon: Stamp },
  { to: "/admin", label: "Lag kampanje", icon: Megaphone },
  { to: "/admin/notifications", label: "Send push-varsel", icon: Bell },
  { to: "/admin/birthdays", label: "Bursdagshilsener", icon: Cake },
];

function isBirthdayToday(value) {
  if (!value) return false;
  const birthday = new Date(`${value}T12:00:00`);
  const today = new Date();
  return birthday.getMonth() === today.getMonth() && birthday.getDate() === today.getDate();
}

function isBirthdayThisMonth(value) {
  if (!value) return false;
  return new Date(`${value}T12:00:00`).getMonth() === new Date().getMonth();
}

export default function AdminOverview() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState({ customers: [], loyalty: [], offers: [], notifications: [] });

  useEffect(() => {
    let active = true;
    Promise.all([listCustomers(), listLoyaltyCampaigns(), listOffers(), listNotifications()])
      .then(([customers, loyalty, offers, notifications]) => {
        if (active) setData({ customers: customers || [], loyalty: loyalty || [], offers: offers || [], notifications: notifications || [] });
      })
      .catch((error) => toast.error(error.message || "Kunne ikke laste dashboardet"))
      .finally(() => active && setLoading(false));
    return () => { active = false; };
  }, []);

  const birthdays = useMemo(() => data.customers.filter((customer) => isBirthdayToday(customer.birth_date)), [data.customers]);
  const activeCards = data.loyalty.filter((item) => item.status === "active").length;
  const nearReward = data.customers.filter((customer) => Number(customer.stamp_goal || 10) - Number(customer.stamps || 0) <= 2 && Number(customer.stamps || 0) > 0).length;
  const inactive = data.customers.filter((customer) => !customer.last_stamped_at || Date.now() - new Date(customer.last_stamped_at).getTime() > 90 * 86400000).length;
  const birthdayMonth = data.customers.filter((customer) => isBirthdayThisMonth(customer.birth_date)).length;
  const checklist = [
    { label: "Legg til første kunde", done: data.customers.length > 0, to: "/admin" },
    { label: "Opprett første stempelkort", done: data.loyalty.length > 0, to: "/admin/loyalty-campaigns" },
    { label: "Opprett første kampanje", done: data.offers.length > 0, to: "/admin" },
    { label: "Send første push-varsel", done: data.notifications.length > 0, to: "/admin/notifications" },
    { label: "Sett opp bursdagshilsen", done: false, to: "/admin/birthdays" },
  ];

  return (
    <div className="min-h-screen bg-paper text-[#2C2A26]">
      <header className="sticky top-0 z-30 border-b border-[#EBE5DC] bg-white">
        <div className="mx-auto flex max-w-screen-lg items-center justify-between px-4 py-3">
          <button onClick={() => navigate("/")} className="flex items-center gap-2 text-sm"><ArrowLeft size={18}/>Til appen</button>
          <div className="font-serif-display text-xl text-[#B89953]">Klinikkdashboard</div>
          <Link to="/admin/settings" className="text-xs text-[#6B655B]">Innstillinger</Link>
        </div>
      </header>

      <main className="mx-auto max-w-screen-lg space-y-6 px-4 py-6">
        <section className="rounded-[2rem] bg-[#2C2A26] p-6 text-white">
          <div className="flex items-center gap-2 text-sm text-[#D8C998]"><Sparkles size={17}/>Yasaflow Kundelojalitet</div>
          <h1 className="mt-3 font-serif-display text-4xl">Få kundene tilbake oftere.</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-white/70">Administrer kunder, etiketter, stempelkort, kampanjer, bursdager og push-varsler fra ett sted.</p>
        </section>

        <section className="grid grid-cols-2 gap-3 lg:grid-cols-5">
          <Stat icon={Users} label="Kunder" value={data.customers.length} loading={loading}/>
          <Stat icon={Stamp} label="Aktive kort" value={activeCards} loading={loading}/>
          <Stat icon={Megaphone} label="Kampanjer" value={data.offers.length} loading={loading}/>
          <Stat icon={Bell} label="Push-varsler" value={data.notifications.length} loading={loading}/>
          <Stat icon={Gift} label="Bursdager i dag" value={birthdays.length} loading={loading}/>
        </section>

        <section className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-3xl border border-[#EBE5DC] bg-white p-5">
            <h2 className="font-serif-display text-2xl">Kom i gang</h2>
            <div className="mt-4 space-y-2">
              {checklist.map((item) => <Link key={item.label} to={item.to} className="flex items-center gap-3 rounded-2xl bg-[#F8F5F0] p-3">
                <CheckCircle2 size={19} className={item.done ? "text-emerald-600" : "text-[#B8B0A4]"}/>
                <span className={item.done ? "line-through opacity-60" : ""}>{item.label}</span>
              </Link>)}
            </div>
          </div>

          <div className="rounded-3xl border border-[#EBE5DC] bg-white p-5">
            <h2 className="font-serif-display text-2xl">Hurtighandlinger</h2>
            <div className="mt-4 grid grid-cols-2 gap-3">
              {ACTIONS.map(({ to, label, icon: Icon }) => <Link key={to} to={to} className="rounded-2xl border border-[#EBE5DC] p-4 text-sm">
                <Icon size={20} className="mb-3 text-[#B89953]"/>{label}
              </Link>)}
            </div>
          </div>
        </section>

        <section className="rounded-3xl border border-[#EBE5DC] bg-white p-5">
          <div className="flex items-center gap-2"><Tags size={20} className="text-[#B89953]"/><h2 className="font-serif-display text-2xl">Kundesegmenter</h2></div>
          <p className="mt-2 text-sm text-[#6B655B]">Bruk disse gruppene når du planlegger kampanjer og målrettede varsler.</p>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <Segment label="Bursdag denne måneden" value={birthdayMonth}/>
            <Segment label="Nær belønning" value={nearReward}/>
            <Segment label="Inaktive i 90 dager" value={inactive}/>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">{[...new Set(data.customers.flatMap((customer) => customer.tags || []))].slice(0, 12).map((tag) => <span key={tag} className="rounded-full bg-[#F4ECD8] px-3 py-2 text-xs">{tag}</span>)}{!data.customers.some((customer) => customer.tags?.length) && <span className="text-sm text-[#8A8379]">Ingen etiketter opprettet ennå.</span>}</div>
        </section>
      </main>
    </div>
  );
}

function Stat({ icon: Icon, label, value, loading }) {
  return <div className="rounded-3xl border border-[#EBE5DC] bg-white p-4"><Icon size={18} className="text-[#B89953]"/><div className="mt-3 text-2xl font-semibold">{loading ? "–" : value}</div><div className="mt-1 text-xs text-[#6B655B]">{label}</div></div>;
}

function Segment({ label, value }) {
  return <div className="rounded-2xl bg-[#F8F5F0] p-4"><div className="text-2xl font-semibold">{value}</div><div className="mt-1 text-xs text-[#6B655B]">{label}</div></div>;
}
