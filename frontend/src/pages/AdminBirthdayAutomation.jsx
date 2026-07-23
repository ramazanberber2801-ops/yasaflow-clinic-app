import { useEffect, useState } from "react";
import { ArrowLeft, Gift, Save, Send } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { getCurrentClinicId } from "@/lib/currentClinic";
import { sendPushNotification } from "@/lib/pushAdmin";
import { listCustomers } from "@/lib/api";

const DEFAULTS = {
  enabled: false,
  title_template: "Gratulerer med dagen, {{name}}! 🎉",
  message_template: "Vi ønsker deg en fantastisk bursdag. Vis denne meldingen i klinikken for å få din bursdagsfordel.",
  reward_text: "",
  send_hour: 10,
};

const birthdayToday = (value) => {
  if (!value) return false;
  const date = new Date(`${value}T12:00:00`);
  const now = new Date();
  return date.getMonth() === now.getMonth() && date.getDate() === now.getDate();
};

const renderTemplate = (template, customer) => String(template || "").replaceAll("{{name}}", customer.name || "kunde");

export default function AdminBirthdayAutomation() {
  const navigate = useNavigate();
  const [form, setForm] = useState(DEFAULTS);
  const [saving, setSaving] = useState(false);
  const [sending, setSending] = useState(false);
  const [todayCount, setTodayCount] = useState(0);

  useEffect(() => {
    (async () => {
      try {
        const clinicId = await getCurrentClinicId();
        const [{ data, error }, customers] = await Promise.all([
          supabase.from("clinic_birthday_automations").select("*").eq("clinic_id", clinicId).maybeSingle(),
          listCustomers(),
        ]);
        if (error) throw error;
        if (data) setForm({ ...DEFAULTS, ...data });
        setTodayCount((customers || []).filter((customer) => birthdayToday(customer.birth_date)).length);
      } catch (error) {
        toast.error(error.message || "Kunne ikke laste bursdagsinnstillinger");
      }
    })();
  }, []);

  const save = async () => {
    setSaving(true);
    try {
      const clinicId = await getCurrentClinicId();
      const { error } = await supabase.from("clinic_birthday_automations").upsert({
        clinic_id: clinicId,
        enabled: form.enabled,
        title_template: form.title_template.trim(),
        message_template: form.message_template.trim(),
        reward_text: form.reward_text.trim() || null,
        send_hour: Number(form.send_hour),
      }, { onConflict: "clinic_id" });
      if (error) throw error;
      toast.success("Bursdagsinnstillingene er lagret");
    } catch (error) {
      toast.error(error.message || "Kunne ikke lagre innstillingene");
    } finally {
      setSaving(false);
    }
  };

  const sendToday = async () => {
    setSending(true);
    try {
      const clinicId = await getCurrentClinicId();
      const customers = (await listCustomers()).filter((customer) => birthdayToday(customer.birth_date));
      let sent = 0;
      for (const customer of customers) {
        const title = renderTemplate(form.title_template, customer);
        const message = [renderTemplate(form.message_template, customer), form.reward_text?.trim()].filter(Boolean).join("\n\n");
        const year = new Date().getFullYear();
        const { data: existing } = await supabase.from("clinic_birthday_sends").select("id,status").eq("clinic_id", clinicId).eq("user_id", customer.user_id).eq("birthday_year", year).maybeSingle();
        if (existing?.status === "sent") continue;
        const { data: notification, error: notificationError } = await supabase.from("notifications").insert({ clinic_id: clinicId, title, message, category: "loyalty", target_user_id: customer.user_id }).select("id").single();
        if (notificationError) throw notificationError;
        await sendPushNotification({ title, message, category: "loyalty", target_user_id: customer.user_id });
        const { error: logError } = await supabase.from("clinic_birthday_sends").upsert({ clinic_id: clinicId, user_id: customer.user_id, birthday_year: year, title, message, reward_text: form.reward_text.trim() || null, status: "sent", notification_id: notification.id, sent_at: new Date().toISOString(), error_message: null }, { onConflict: "clinic_id,user_id,birthday_year" });
        if (logError) throw logError;
        sent += 1;
      }
      toast.success(sent ? `${sent} bursdagshilsen${sent === 1 ? "" : "er"} sendt` : "Ingen nye bursdagshilsener å sende i dag");
    } catch (error) {
      toast.error(error.message || "Kunne ikke sende bursdagshilsener");
    } finally {
      setSending(false);
    }
  };

  return <div className="min-h-screen bg-paper text-[#2C2A26]">
    <header className="sticky top-0 z-30 border-b border-[#EBE5DC] bg-white"><div className="mx-auto flex max-w-screen-md items-center justify-between px-4 py-3"><button onClick={() => navigate("/admin/overview")} className="flex items-center gap-2 text-sm"><ArrowLeft size={18}/>Tilbake</button><div className="font-serif-display text-xl text-[#B89953]">Bursdagshilsener</div><div className="w-16"/></div></header>
    <main className="mx-auto max-w-screen-md space-y-5 px-4 py-6">
      <section className="rounded-3xl bg-[#2C2A26] p-6 text-white"><Gift className="text-[#D8C998]"/><h1 className="mt-3 font-serif-display text-3xl">Automatiske bursdagshilsener</h1><p className="mt-2 text-sm leading-6 text-white/70">Lag en fast bursdagstekst og send til kunder som har bursdag. Systemet hindrer dobbel utsending samme år.</p></section>
      <section className="space-y-4 rounded-3xl border border-[#EBE5DC] bg-white p-5">
        <label className="flex items-center justify-between rounded-2xl bg-[#F8F5F0] p-4"><span><span className="block font-medium">Aktiver automatikk</span><span className="text-xs text-[#6B655B]">Klar for planlagt daglig kjøring når scheduler kobles på.</span></span><input type="checkbox" checked={form.enabled} onChange={(event) => setForm({ ...form, enabled: event.target.checked })}/></label>
        <div><label className="mb-1 block text-sm font-medium">Tittel</label><input className="w-full rounded-2xl border border-[#E5DED3] px-4 py-3" value={form.title_template} onChange={(event) => setForm({ ...form, title_template: event.target.value })}/><p className="mt-1 text-xs text-[#8A8379]">Bruk {"{{name}}"} for kundens navn.</p></div>
        <div><label className="mb-1 block text-sm font-medium">Melding</label><textarea rows={5} className="w-full rounded-2xl border border-[#E5DED3] px-4 py-3" value={form.message_template} onChange={(event) => setForm({ ...form, message_template: event.target.value })}/></div>
        <div><label className="mb-1 block text-sm font-medium">Bursdagsfordel, valgfritt</label><input className="w-full rounded-2xl border border-[#E5DED3] px-4 py-3" placeholder="For eksempel 15 % rabatt denne uken" value={form.reward_text || ""} onChange={(event) => setForm({ ...form, reward_text: event.target.value })}/></div>
        <div><label className="mb-1 block text-sm font-medium">Planlagt klokkeslett</label><input type="number" min="0" max="23" className="w-full rounded-2xl border border-[#E5DED3] px-4 py-3" value={form.send_hour} onChange={(event) => setForm({ ...form, send_hour: event.target.value })}/></div>
        <button disabled={saving} onClick={save} className="flex h-12 w-full items-center justify-center gap-2 rounded-full bg-[#C5A059] text-white disabled:opacity-50"><Save size={17}/>{saving ? "Lagrer …" : "Lagre innstillinger"}</button>
      </section>
      <section className="rounded-3xl border border-[#EBE5DC] bg-white p-5"><div className="text-sm text-[#6B655B]">Bursdager i dag</div><div className="mt-1 text-3xl font-semibold">{todayCount}</div><button disabled={sending || todayCount === 0} onClick={sendToday} className="mt-4 flex h-12 w-full items-center justify-center gap-2 rounded-full bg-[#2C2A26] text-white disabled:opacity-50"><Send size={17}/>{sending ? "Sender …" : "Send dagens hilsener nå"}</button></section>
    </main>
  </div>;
}
