import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Bell, CalendarDays, Save, Star, Tags, UserRound } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { getCurrentClinicId } from "@/lib/currentClinic";
import { sendPushNotification } from "@/lib/pushAdmin";

export default function AdminCustomerProfile() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [sending, setSending] = useState(false);
  const [clinicId, setClinicId] = useState(null);
  const [profile, setProfile] = useState({ full_name: "", phone: "", birth_date: "", tags: [], admin_notes: "" });
  const [preferences, setPreferences] = useState({ vip: false, archived: false, marketing_consent: true, preferred_contact_channel: "push", last_visit_at: null, total_visits: 0, lifetime_value_nok: 0 });
  const [loyalty, setLoyalty] = useState(null);
  const [activity, setActivity] = useState([]);
  const [tagText, setTagText] = useState("");

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const currentClinicId = await getCurrentClinicId();
        setClinicId(currentClinicId);
        const [{ data: member, error: memberError }, { data: profileData, error: profileError }, { data: preferenceData, error: preferenceError }, { data: loyaltyData, error: loyaltyError }, { data: activityData, error: activityError }] = await Promise.all([
          supabase.from("clinic_members").select("user_id").eq("clinic_id", currentClinicId).eq("user_id", id).eq("role", "customer").maybeSingle(),
          supabase.from("profiles").select("id,full_name,phone,birth_date,tags,admin_notes,updated_at").eq("id", id).maybeSingle(),
          supabase.from("crm_customer_preferences").select("*").eq("clinic_id", currentClinicId).eq("user_id", id).maybeSingle(),
          supabase.from("loyalty_cards").select("user_id,stamps,stamp_goal,total_completed,last_stamped_at,campaign_name,reward").eq("clinic_id", currentClinicId).eq("user_id", id).maybeSingle(),
          supabase.from("crm_customer_activity").select("id,activity_type,title,description,occurred_at").eq("clinic_id", currentClinicId).eq("user_id", id).order("occurred_at", { ascending: false }).limit(30),
        ]);
        if (memberError) throw memberError;
        if (!member) throw new Error("Kunden finnes ikke i denne klinikken");
        if (profileError) throw profileError;
        if (preferenceError) throw preferenceError;
        if (loyaltyError) throw loyaltyError;
        if (activityError) throw activityError;
        if (active) {
          setProfile({ full_name: profileData?.full_name || "", phone: profileData?.phone || "", birth_date: profileData?.birth_date || "", tags: profileData?.tags || [], admin_notes: profileData?.admin_notes || "" });
          setPreferences((current) => ({ ...current, ...(preferenceData || {}) }));
          setLoyalty(loyaltyData || null);
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
      await sendPushNotification({ title: `Hei ${profile.full_name || "kunde"}`, message: "Vi har en personlig melding til deg fra klinikken.", category: "news", target_user_id: id });
      if (clinicId) await supabase.from("crm_customer_activity").insert({ clinic_id: clinicId, user_id: id, activity_type: "notification", title: "Personlig push sendt", description: "Et direkte push-varsel ble sendt til kunden." });
      toast.success("Push-varsel sendt");
    } catch (error) {
      toast.error(error.message || "Kunne ikke sende push-varsel");
    } finally {
      setSending(false);
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

          <section className="rounded-3xl border border-[#EBE5DC] bg-white p-5">
            <div className="flex items-center gap-2"><Tags size={19} className="text-[#B89953]"/><h2 className="font-serif-display text-2xl">Etiketter</h2></div>
            <div className="mt-4 flex gap-2"><input value={tagText} onChange={(e) => setTagText(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addTag(); } }} placeholder="Ny etikett" className="input flex-1"/><button onClick={addTag} className="rounded-2xl bg-[#F4ECD8] px-4 text-sm">Legg til</button></div>
            <div className="mt-3 flex flex-wrap gap-2">{profile.tags.map((tag) => <button key={tag} onClick={() => setProfile((current) => ({ ...current, tags: current.tags.filter((item) => item !== tag) }))} className="rounded-full bg-[#F4F0EA] px-3 py-2 text-xs">{tag} ×</button>)}</div>
          </section>

          <section className="rounded-3xl border border-[#EBE5DC] bg-white p-5">
            <h2 className="font-serif-display text-2xl">Interne notater</h2>
            <textarea value={profile.admin_notes} onChange={(e) => setProfile({ ...profile, admin_notes: e.target.value })} rows={6} placeholder="Skriv notater som kun klinikken kan se" className="input mt-4 resize-none"/>
          </section>
        </div>

        <div className="space-y-5">
          <section className="rounded-3xl border border-[#EBE5DC] bg-white p-5">
            <h2 className="font-serif-display text-2xl">Hurtighandlinger</h2>
            <div className="mt-4 grid grid-cols-2 gap-3">
              <button onClick={() => setPreferences({ ...preferences, vip: !preferences.vip })} className={`rounded-2xl border p-4 text-left text-sm ${preferences.vip ? "border-[#B89953] bg-[#F4ECD8]" : "border-[#EBE5DC]"}`}><Star size={19} className="mb-3"/>{preferences.vip ? "Fjern VIP" : "Marker VIP"}</button>
              <button disabled={sending} onClick={sendDirectPush} className="rounded-2xl border border-[#EBE5DC] p-4 text-left text-sm disabled:opacity-50"><Bell size={19} className="mb-3"/>{sending ? "Sender …" : "Send push"}</button>
              <button onClick={() => setPreferences({ ...preferences, marketing_consent: !preferences.marketing_consent })} className="rounded-2xl border border-[#EBE5DC] p-4 text-left text-sm"><UserRound size={19} className="mb-3"/>{preferences.marketing_consent ? "Markedsføring på" : "Markedsføring av"}</button>
              <button onClick={() => setPreferences({ ...preferences, archived: !preferences.archived })} className="rounded-2xl border border-[#EBE5DC] p-4 text-left text-sm"><CalendarDays size={19} className="mb-3"/>{preferences.archived ? "Aktiver kunde" : "Arkiver kunde"}</button>
            </div>
          </section>

          <section className="rounded-3xl border border-[#EBE5DC] bg-white p-5">
            <h2 className="font-serif-display text-2xl">Lojalitet</h2>
            {loyalty ? <div className="mt-4 space-y-3 text-sm"><div className="flex justify-between"><span>Stempler</span><strong>{loyalty.stamps}/{loyalty.stamp_goal}</strong></div><div className="h-2 overflow-hidden rounded-full bg-[#EEE8DE]"><div className="h-full bg-[#B89953]" style={{ width: `${Math.min(100, (loyalty.stamps / loyalty.stamp_goal) * 100)}%` }}/></div><p className="text-xs text-[#746E65]">{remaining === 0 ? "Belønning er klar" : `${remaining} stempel igjen til belønning`}</p></div> : <p className="mt-3 text-sm text-[#746E65]">Ingen aktivt stempelkort.</p>}
          </section>

          <section className="rounded-3xl border border-[#EBE5DC] bg-white p-5">
            <h2 className="font-serif-display text-2xl">Historikk</h2>
            <div className="mt-4 space-y-3">{activity.length ? activity.map((item) => <div key={item.id} className="rounded-2xl bg-[#F8F5F0] p-3"><div className="text-sm font-medium">{item.title}</div>{item.description && <div className="mt-1 text-xs text-[#746E65]">{item.description}</div>}<div className="mt-2 text-[10px] text-[#9A9388]">{new Date(item.occurred_at).toLocaleString("no-NO")}</div></div>) : <p className="text-sm text-[#746E65]">Ingen registrert aktivitet ennå.</p>}</div>
          </section>
        </div>
      </main>
    </div>
  );
}

function Field({ label, children }) { return <label className="block text-xs text-[#746E65]"><span className="mb-2 block">{label}</span>{children}</label>; }
