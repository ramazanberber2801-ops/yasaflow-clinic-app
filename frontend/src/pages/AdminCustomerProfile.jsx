import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Bell, CalendarDays, Gift, Save, Star, Tags, UserRound } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { getCurrentClinicId } from "@/lib/currentClinic";
import { sendPushNotification } from "@/lib/pushAdmin";

const REWARD_TYPES = [
  { value: "custom", label: "Annet" },
  { value: "discount", label: "Rabatt" },
  { value: "free_treatment", label: "Gratis behandling" },
  { value: "product", label: "Produkt" },
  { value: "gift_card", label: "Gavekort" },
];

export default function AdminCustomerProfile() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [sending, setSending] = useState(false);
  const [rewardSaving, setRewardSaving] = useState(false);
  const [clinicId, setClinicId] = useState(null);
  const [profile, setProfile] = useState({ full_name: "", phone: "", birth_date: "", tags: [], admin_notes: "" });
  const [preferences, setPreferences] = useState({ vip: false, archived: false, marketing_consent: true, preferred_contact_channel: "push", last_visit_at: null, total_visits: 0, lifetime_value_nok: 0 });
  const [loyalty, setLoyalty] = useState(null);
  const [rewards, setRewards] = useState([]);
  const [activity, setActivity] = useState([]);
  const [tagText, setTagText] = useState("");
  const [rewardForm, setRewardForm] = useState({ title: "", reward_type: "custom", description: "", expires_at: "" });

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const currentClinicId = await getCurrentClinicId();
        setClinicId(currentClinicId);
        const [{ data: member, error: memberError }, { data: profileData, error: profileError }, { data: preferenceData, error: preferenceError }, { data: loyaltyData, error: loyaltyError }, { data: rewardData, error: rewardError }, { data: activityData, error: activityError }] = await Promise.all([
          supabase.from("clinic_members").select("user_id").eq("clinic_id", currentClinicId).eq("user_id", id).eq("role", "customer").maybeSingle(),
          supabase.from("profiles").select("id,full_name,phone,birth_date,tags,admin_notes,updated_at").eq("id", id).maybeSingle(),
          supabase.from("crm_customer_preferences").select("*").eq("clinic_id", currentClinicId).eq("user_id", id).maybeSingle(),
          supabase.from("loyalty_cards").select("user_id,stamps,stamp_goal,total_completed,last_stamped_at,campaign_name,reward").eq("clinic_id", currentClinicId).eq("user_id", id).maybeSingle(),
          supabase.from("customer_rewards").select("id,title,reward_type,description,status,expires_at,redeemed_at,created_at").eq("clinic_id", currentClinicId).eq("user_id", id).order("created_at", { ascending: false }),
          supabase.from("crm_customer_activity").select("id,activity_type,title,description,occurred_at").eq("clinic_id", currentClinicId).eq("user_id", id).order("occurred_at", { ascending: false }).limit(30),
        ]);
        if (memberError) throw memberError;
        if (!member) throw new Error("Kunden finnes ikke i denne klinikken");
        if (profileError) throw profileError;
        if (preferenceError) throw preferenceError;
        if (loyaltyError) throw loyaltyError;
        if (rewardError) throw rewardError;
        if (activityError) throw activityError;
        if (active) {
          setProfile({ full_name: profileData?.full_name || "", phone: profileData?.phone || "", birth_date: profileData?.birth_date || "", tags: profileData?.tags || [], admin_notes: profileData?.admin_notes || "" });
          setPreferences((current) => ({ ...current, ...(preferenceData || {}) }));
          setLoyalty(loyaltyData || null);
          setRewards(rewardData || []);
          setActivity(activityData || []);
        }
      } catch (error) {
        toast.error(error.message || "Kunne ikke laste kundeprofilen");
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, [id]);

  const remaining = useMemo(() => loyalty ? Math.max(0, loyalty.stamp_goal - loyalty.stamps) : null, [loyalty]);
  const activeRewards = useMemo(() => rewards.filter((reward) => reward.status === "active" && (!reward.expires_at || new Date(reward.expires_at) >= new Date())), [rewards]);
  const rewardHistory = useMemo(() => rewards.filter((reward) => reward.status !== "active" || (reward.expires_at && new Date(reward.expires_at) < new Date())), [rewards]);

  const save = async () => {
    if (!clinicId) return;
    setSaving(true);
    try {
      const [{ error: profileError }, { error: preferenceError }, { error: activityError }] = await Promise.all([
        supabase.from("profiles").update({ full_name: profile.full_name.trim(), phone: profile.phone.trim() || null, birth_date: profile.birth_date || null, tags: profile.tags, admin_notes: profile.admin_notes.trim() || null }).eq("id", id),
        supabase.from("crm_customer_preferences").upsert({ clinic_id: clinicId, user_id: id, vip: preferences.vip, archived: preferences.archived, marketing_consent: preferences.marketing_consent, preferred_contact_channel: preferences.preferred_contact_channel, updated_at: new Date().toISOString() }, { onConflict: "clinic_id,user_id" }),
        supabase.from("crm_customer_activity").insert({ clinic_id: clinicId, user_id: id, activity_type: "updated", title: "Kundeprofil oppdatert", description: "Kontaktinformasjon, etiketter eller kundepreferanser ble endret." }),
      ]);
      if (profileError) throw profileError;
      if (preferenceError) throw preferenceError;
      if (activityError) throw activityError;
      setActivity((current) => [{ id: crypto.randomUUID(), activity_type: "updated", title: "Kundeprofil oppdatert", description: "Kontaktinformasjon, etiketter eller kundepreferanser ble endret.", occurred_at: new Date().toISOString() }, ...current]);
      toast.success("Kunden er lagret");
    } catch (error) {
      toast.error(error.message || "Kunne ikke lagre kunden");
    } finally {
      setSaving(false);
    }
  };

  const addTag = () => {
    const tag = tagText.trim();
    if (!tag || profile.tags.some((item) => item.toLowerCase() === tag.toLowerCase())) return;
    setProfile((current) => ({ ...current, tags: [...current.tags, tag] }));
    setTagText("");
  };

  const sendDirectPush = async () => {
    setSending(true);
    try {
      await sendPushNotification({ title: `Hei ${profile.full_name || "kunde"}`, message: "Vi har en personlig melding til deg fra klinikken.", category: "news", target_user_id: id, clinic_id: clinicId });
      if (clinicId) await supabase.from("crm_customer_activity").insert({ clinic_id: clinicId, user_id: id, activity_type: "notification", title: "Personlig push sendt", description: "Et direkte push-varsel ble sendt til kunden." });
      toast.success("Push-varsel sendt");
    } catch (error) {
      toast.error(error.message || "Kunne ikke sende push-varsel");
    } finally {
      setSending(false);
    }
  };

  const createReward = async () => {
    if (!clinicId || !rewardForm.title.trim()) return toast.error("Skriv inn navn på belønningen");
    setRewardSaving(true);
    try {
      const { data, error } = await supabase.from("customer_rewards").insert({
        clinic_id: clinicId,
        user_id: id,
        title: rewardForm.title.trim(),
        reward_type: rewardForm.reward_type,
        description: rewardForm.description.trim() || null,
        expires_at: rewardForm.expires_at ? new Date(`${rewardForm.expires_at}T23:59:59`).toISOString() : null,
      }).select("id,title,reward_type,description,status,expires_at,redeemed_at,created_at").single();
      if (error) throw error;
      const activityItem = { id: crypto.randomUUID(), activity_type: "loyalty", title: "Belønning tildelt", description: data.title, occurred_at: new Date().toISOString() };
      const { error: activityError } = await supabase.from("crm_customer_activity").insert({ clinic_id: clinicId, user_id: id, activity_type: "loyalty", title: "Belønning tildelt", description: data.title });
      if (activityError) throw activityError;
      setRewards((current) => [data, ...current]);
      setActivity((current) => [activityItem, ...current]);
      setRewardForm({ title: "", reward_type: "custom", description: "", expires_at: "" });
      toast.success("Belønningen er tildelt");
    } catch (error) {
      toast.error(error.message || "Kunne ikke tildele belønningen");
    } finally {
      setRewardSaving(false);
    }
  };

  const redeemReward = async (reward) => {
    if (!clinicId || !window.confirm(`Innløs «${reward.title}»?`)) return;
    try {
      const now = new Date().toISOString();
      const { error } = await supabase.from("customer_rewards").update({ status: "redeemed", redeemed_at: now }).eq("id", reward.id).eq("clinic_id", clinicId);
      if (error) throw error;
      const { error: activityError } = await supabase.from("crm_customer_activity").insert({ clinic_id: clinicId, user_id: id, activity_type: "loyalty", title: "Belønning innløst", description: reward.title });
      if (activityError) throw activityError;
      setRewards((current) => current.map((item) => item.id === reward.id ? { ...item, status: "redeemed", redeemed_at: now } : item));
      setActivity((current) => [{ id: crypto.randomUUID(), activity_type: "loyalty", title: "Belønning innløst", description: reward.title, occurred_at: now }, ...current]);
      toast.success("Belønningen er innløst");
    } catch (error) {
      toast.error(error.message || "Kunne ikke innløse belønningen");
    }
  };

  if (loading) return <div className="min-h-screen bg-paper p-6 text-sm">Laster kundeprofil …</div>;

  return (
    <div className="min-h-screen bg-paper text-[#2C2A26]">
      <header className="sticky top-0 z-30 border-b border-[#EBE5DC] bg-white">
        <div className="mx-auto flex max-w-screen-lg items-center justify-between px-4 py-3">
          <button onClick={() => navigate("/admin/customers")} className="flex items-center gap-2 text-sm"><ArrowLeft size={18}/>Kunder</button>
          <div className="font-serif-display text-xl text-[#B89953]">Kundeprofil</div>
          <button disabled={saving} onClick={save} className="flex items-center gap-2 rounded-full bg-[#2C2A26] px-4 py-2 text-xs text-white disabled:opacity-50"><Save size={15}/>{saving ? "Lagrer" : "Lagre"}</button>
        </div>
      </header>

      <main className="mx-auto grid max-w-screen-lg gap-5 px-4 py-6 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="space-y-5">
          <section className="rounded-3xl border border-[#EBE5DC] bg-white p-5">
            <div className="flex items-center gap-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#F4ECD8] text-2xl font-semibold text-[#8D7139]">{(profile.full_name || "K").slice(0,1).toUpperCase()}</div>
              <div><h1 className="font-serif-display text-3xl">{profile.full_name || "Uten navn"}</h1><p className="mt-1 text-sm text-[#746E65]">CRM-kunde</p></div>
            </div>
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <Field label="Navn"><input value={profile.full_name} onChange={(e) => setProfile({ ...profile, full_name: e.target.value })} className="input"/></Field>
              <Field label="Telefon"><input value={profile.phone} onChange={(e) => setProfile({ ...profile, phone: e.target.value })} className="input"/></Field>
              <Field label="Fødselsdato"><input type="date" value={profile.birth_date} onChange={(e) => setProfile({ ...profile, birth_date: e.target.value })} className="input"/></Field>
              <Field label="Kontaktkanal"><select value={preferences.preferred_contact_channel || "push"} onChange={(e) => setPreferences({ ...preferences, preferred_contact_channel: e.target.value })} className="input"><option value="push">Push</option><option value="email">E-post</option><option value="phone">Telefon</option><option value="sms">SMS</option><option value="none">Ingen</option></select></Field>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}

function Field({ label, children }) {
  return <label className="block text-xs text-[#746E65]"><span className="mb-2 block">{label}</span>{children}</label>;
}
