import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Html5Qrcode } from "html5-qrcode";
import { ArrowLeft, Bell, Camera, Check, History, Minus, Pencil, Plus, RefreshCw, Search, Send, Tags, Trash2, Upload, Users, X } from "lucide-react";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  createNotification,
  createOffer,
  deleteOffer,
  getLoyalty,
  getLoyaltyHistory,
  listCustomers,
  listLoyalty,
  listNotifications,
  listOffers,
  resetLoyalty,
  stampLoyalty,
  unstampLoyalty,
  updateCustomer,
  updateOffer,
  uploadImage,
} from "@/lib/api";
import { supabase } from "@/lib/supabase";

const EMPTY_OFFER = { title: "", description: "", price: "", before_price: "", image_url: "", badge: "TILBUD" };
const DEFAULT_TAGS = ["Hijama", "Laser", "Botox", "Filler", "Profhilo", "Hudpleie", "VIP", "Fast kunde", "Tyrkisktalende", "Arabisk", "Norsk"];

export default function AdminV2() {
  const navigate = useNavigate();
  const logout = async () => {
    await supabase.auth.signOut();
    navigate("/login?mode=login", { replace: true });
  };

  return (
    <div className="min-h-screen bg-paper">
      <div className="sticky top-0 z-30 border-b border-[#EBE5DC] bg-white">
        <div className="mx-auto flex max-w-screen-md items-center justify-between px-4 py-3">
          <button onClick={() => navigate("/")} className="flex items-center gap-2 text-sm text-[#2C2A26]"><ArrowLeft size={18} />Tilbake</button>
          <div className="font-serif-display text-xl text-[#B89953]">Admin</div>
          <button onClick={logout} className="text-xs text-[#6B655B]">Logg ut</button>
        </div>
      </div>
      <div className="mx-auto max-w-screen-md px-4 py-6">
        <Tabs defaultValue="customers">
          <TabsList className="mb-6 grid h-auto grid-cols-5 rounded-2xl border border-[#EBE5DC] bg-white p-1">
            <TabsTrigger value="customers" className="rounded-xl py-2.5 text-[11px] data-[state=active]:bg-[#C5A059] data-[state=active]:text-white">Kunder</TabsTrigger>
            <TabsTrigger value="scan" className="rounded-xl py-2.5 text-[11px] data-[state=active]:bg-[#C5A059] data-[state=active]:text-white">Stempel</TabsTrigger>
            <TabsTrigger value="offers" className="rounded-xl py-2.5 text-[11px] data-[state=active]:bg-[#C5A059] data-[state=active]:text-white">Tilbud</TabsTrigger>
            <TabsTrigger value="notifications" className="rounded-xl py-2.5 text-[11px] data-[state=active]:bg-[#C5A059] data-[state=active]:text-white">Varsler</TabsTrigger>
            <TabsTrigger value="history" className="rounded-xl py-2.5 text-[11px] data-[state=active]:bg-[#C5A059] data-[state=active]:text-white">Historikk</TabsTrigger>
          </TabsList>
          <TabsContent value="customers"><CustomersTab /></TabsContent>
          <TabsContent value="scan"><ScanTab /></TabsContent>
          <TabsContent value="offers"><OffersTab /></TabsContent>
          <TabsContent value="notifications"><NotificationsTab /></TabsContent>
          <TabsContent value="history"><HistoryTab /></TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

function CustomersTab() {
  const [customers, setCustomers] = useState([]);
  const [query, setQuery] = useState("");
  const [tagFilter, setTagFilter] = useState("");
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(null);
  const [busy, setBusy] = useState(false);

  const refresh = async () => {
    try { setCustomers(await listCustomers()); }
    catch (e) { toast.error(e.message || "Kunne ikke laste kunder"); }
  };
  useEffect(() => { refresh(); }, []);

  const allTags = useMemo(() => [...new Set([...DEFAULT_TAGS, ...customers.flatMap((c) => c.tags || [])])].sort(), [customers]);
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return customers.filter((c) => {
      const matchesText = !q || [c.name, c.phone, c.email, ...(c.tags || [])].filter(Boolean).some((value) => String(value).toLowerCase().includes(q));
      const matchesTag = !tagFilter || (c.tags || []).includes(tagFilter);
      return matchesText && matchesTag;
    });
  }, [customers, query, tagFilter]);

  const openEdit = (customer) => {
    setEditing(customer.user_id);
    setForm({
      name: customer.name || "",
      phone: customer.phone || "",
      birth_date: customer.birth_date || "",
      language: customer.language || "",
      tags: customer.tags || [],
      admin_notes: customer.admin_notes || "",
      customTag: "",
    });
  };

  const toggleTag = (tag) => setForm((current) => ({
    ...current,
    tags: current.tags.includes(tag) ? current.tags.filter((item) => item !== tag) : [...current.tags, tag],
  }));

  const addCustomTag = () => {
    const tag = form.customTag.trim();
    if (!tag || form.tags.includes(tag)) return;
    setForm((current) => ({ ...current, tags: [...current.tags, tag], customTag: "" }));
  };

  const save = async () => {
    setBusy(true);
    try {
      await updateCustomer(editing, form);
      toast.success("Kunden er oppdatert");
      setEditing(null);
      setForm(null);
      await refresh();
    } catch (e) {
      toast.error(e.message || "Kunne ikke lagre kunden");
    } finally { setBusy(false); }
  };

  if (editing && form) return (
    <div className="space-y-4">
      <button onClick={() => setEditing(null)} className="flex items-center gap-2 text-sm"><ArrowLeft size={16} />Tilbake til kundelisten</button>
      <div className="space-y-4 rounded-3xl border border-[#EBE5DC] bg-white p-5">
        <div className="flex items-center gap-2"><Users size={18} className="text-[#B89953]" /><h2 className="font-serif-display text-2xl">Rediger kunde</h2></div>
        <Input placeholder="Navn" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        <Input placeholder="Telefon" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
        <Input type="date" value={form.birth_date} onChange={(e) => setForm({ ...form, birth_date: e.target.value })} />
        <select className="h-12 w-full rounded-2xl border border-[#DED7CC] bg-white px-4 text-sm" value={form.language} onChange={(e) => setForm({ ...form, language: e.target.value })}>
          <option value="">Velg språk</option><option value="Norsk">Norsk</option><option value="Tyrkisk">Tyrkisk</option><option value="Arabisk">Arabisk</option><option value="Engelsk">Engelsk</option><option value="Annet">Annet</option>
        </select>
        <div>
          <div className="mb-2 flex items-center gap-2 text-sm font-medium"><Tags size={15} />Etiketter</div>
          <div className="flex flex-wrap gap-2">{allTags.map((tag) => <button key={tag} type="button" onClick={() => toggleTag(tag)} className={`rounded-full border px-3 py-1.5 text-xs ${form.tags.includes(tag) ? "border-[#C5A059] bg-[#F4ECD8] text-[#8C6B2F]" : "border-[#DED7CC] bg-white"}`}>{tag}</button>)}</div>
          <div className="mt-3 flex gap-2"><Input placeholder="Ny etikett" value={form.customTag} onChange={(e) => setForm({ ...form, customTag: e.target.value })} /><button type="button" onClick={addCustomTag} className="rounded-2xl bg-[#2C2A26] px-4 text-white"><Plus size={17} /></button></div>
        </div>
        <Textarea placeholder="Interne notater, for eksempel foretrekker hijama eller ønsker tyrkisk kommunikasjon" value={form.admin_notes} onChange={(e) => setForm({ ...form, admin_notes: e.target.value })} />
        <button disabled={busy} onClick={save} className="h-12 w-full rounded-full bg-[#C5A059] text-white disabled:opacity-50">{busy ? "Lagrer..." : "Lagre kundekort"}</button>
      </div>
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="rounded-3xl border border-[#EBE5DC] bg-white p-5">
        <div className="flex items-center gap-2"><Users size={18} className="text-[#B89953]" /><h2 className="font-serif-display text-2xl">Kundeoversikt</h2></div>
        <p className="mt-1 text-sm text-[#6B655B]">Kunder vises automatisk etter at de registrerer en konto.</p>
        <div className="relative mt-4"><Search className="absolute left-4 top-1/2 -translate-y-1/2 text-[#9C968C]" size={16} /><Input className="h-12 rounded-2xl pl-10" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Søk navn, telefon eller etikett" /></div>
        <select className="mt-3 h-12 w-full rounded-2xl border border-[#DED7CC] bg-white px-4 text-sm" value={tagFilter} onChange={(e) => setTagFilter(e.target.value)}><option value="">Alle grupper</option>{allTags.map((tag) => <option key={tag} value={tag}>{tag}</option>)}</select>
      </div>
      <div className="text-xs text-[#6B655B]">{filtered.length} av {customers.length} kunder</div>
      {filtered.map((customer) => (
        <button key={customer.user_id} onClick={() => openEdit(customer)} className="w-full rounded-3xl border border-[#EBE5DC] bg-white p-4 text-left">
          <div className="flex items-start justify-between gap-3"><div><div className="font-medium text-[#2C2A26]">{customer.name || "Kunde uten navn"}</div><div className="mt-1 text-xs text-[#6B655B]">{customer.phone || "Telefon mangler"}</div></div><span className="rounded-full bg-[#F4ECD8] px-3 py-1 text-xs">{customer.stamps || 0}/10</span></div>
          {!!customer.tags?.length && <div className="mt-3 flex flex-wrap gap-1.5">{customer.tags.map((tag) => <span key={tag} className="rounded-full bg-[#F4F0EA] px-2.5 py-1 text-[10px] text-[#6B655B]">{tag}</span>)}</div>}
          <div className="mt-3 flex items-center gap-1 text-xs text-[#B89953]"><Pencil size={13} />Åpne kundekort</div>
        </button>
      ))}
      {!filtered.length && <div className="rounded-3xl bg-white p-8 text-center text-sm text-[#6B655B]">Ingen kunder funnet.</div>}
    </div>
  );
}

function CustomerCard({ card, onStamp, onUnstamp, onReset, busy }) {
  if (!card) return null;
  return <div className="rounded-3xl border border-[#EBE5DC] bg-white p-5 shadow-sm"><div className="flex items-start justify-between gap-3"><div><div className="text-[10px] uppercase tracking-[0.2em] text-[#9C968C]">Valgt kunde</div><div className="mt-1 font-serif-display text-2xl">{card.name || "Kunde"}</div><div className="text-sm text-[#6B655B]">{card.phone}</div></div><span className="rounded-full bg-[#F4ECD8] px-3 py-1 text-xs">{card.stamps || 0}/10</span></div><div className="mt-4 grid grid-cols-10 gap-1.5">{Array.from({ length: 10 }).map((_, i) => <div key={i} className={`aspect-square rounded-full ${i < (card.stamps || 0) ? "bg-gradient-to-br from-[#D4B36A] to-[#B89953]" : "border border-[#EBE5DC] bg-[#F4F0EA]"}`} />)}</div><button disabled={busy || card.stamps >= 10} onClick={onStamp} className="mt-5 flex h-12 w-full items-center justify-center gap-2 rounded-full bg-[#C5A059] text-white disabled:opacity-50"><Check size={17} />Bekreft og gi stempel</button><div className="mt-2 grid grid-cols-2 gap-2"><button disabled={busy || card.stamps <= 0} onClick={onUnstamp} className="h-11 rounded-full border border-[#EBE5DC] text-sm"><Minus size={15} className="inline" /> Fjern</button><button disabled={busy || card.stamps < 10} onClick={onReset} className="h-11 rounded-full bg-[#2C2A26] text-sm text-white"><RefreshCw size={15} className="inline" /> Nytt kort</button></div></div>;
}

function ScanTab() {
  const [customers, setCustomers] = useState([]); const [query, setQuery] = useState(""); const [selected, setSelected] = useState(null); const [busy, setBusy] = useState(false); const [scanning, setScanning] = useState(false); const qrRef = useRef(null);
  const loadCustomers = async () => { try { setCustomers(await listLoyalty()); } catch (e) { toast.error(e.message || "Kunne ikke laste kunder"); } };
  useEffect(() => { loadCustomers(); return () => { qrRef.current?.stop?.().catch(() => {}); }; }, []);
  const results = useMemo(() => { const q = query.trim().toLowerCase(); if (!q) return []; return customers.filter((c) => [c.name, c.phone, c.email, ...(c.tags || [])].filter(Boolean).some((v) => String(v).toLowerCase().includes(q))).slice(0, 15); }, [customers, query]);
  const chooseById = async (id) => { try { setSelected(await getLoyalty(id)); setQuery(""); } catch (e) { toast.error(e.message || "Fant ikke kunden"); } };
  const startCamera = async () => { try { const qr = new Html5Qrcode("admin-qr-reader"); qrRef.current = qr; await qr.start({ facingMode: "environment" }, { fps: 10, qrbox: 230 }, async (text) => { await qr.stop().catch(() => {}); setScanning(false); await chooseById(text); }, () => {}); setScanning(true); } catch { toast.error("Kunne ikke starte kamera"); } };
  const doAction = async (action) => { if (!selected) return; setBusy(true); try { const updated = await action(selected.user_id); setSelected({ ...selected, ...updated }); await loadCustomers(); toast.success("Kundekortet er oppdatert"); } catch (e) { toast.error(e.message || "Kunne ikke oppdatere kortet"); } finally { setBusy(false); } };
  return <div className="space-y-4"><div className="rounded-3xl border border-[#EBE5DC] bg-white p-5"><Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Søk navn, telefon eller etikett" className="h-12 rounded-2xl" />{query && <div className="mt-3 space-y-2">{results.map((c) => <button key={c.user_id} onClick={() => setSelected(c)} className="w-full rounded-2xl border p-3 text-left"><div className="font-medium">{c.name || "Kunde"}</div><div className="text-xs text-[#6B655B]">{c.phone}</div></button>)}</div>}</div><div className="rounded-3xl border border-[#EBE5DC] bg-white p-5"><div id="admin-qr-reader" className="overflow-hidden rounded-2xl bg-[#2C2A26]" /><button onClick={scanning ? async () => { await qrRef.current?.stop?.().catch(() => {}); setScanning(false); } : startCamera} className="mt-3 flex h-12 w-full items-center justify-center gap-2 rounded-full bg-[#2C2A26] text-white">{scanning ? <X size={17} /> : <Camera size={17} />}{scanning ? "Stopp kamera" : "Skann QR-kode"}</button></div><CustomerCard card={selected} busy={busy} onStamp={() => doAction(stampLoyalty)} onUnstamp={() => doAction(unstampLoyalty)} onReset={() => doAction(resetLoyalty)} /></div>;
}

function OffersTab() {
  const [offers, setOffers] = useState([]); const [editing, setEditing] = useState(null); const [form, setForm] = useState(EMPTY_OFFER); const [busy, setBusy] = useState(false);
  const refresh = async () => { try { setOffers(await listOffers()); } catch { toast.error("Kunne ikke laste tilbud"); } };
  useEffect(() => { refresh(); }, []);
  const save = async () => { if (!form.title.trim() || !form.price.trim() || !form.image_url.trim()) return toast.error("Tittel, pris og bilde må fylles ut"); setBusy(true); try { editing === "new" ? await createOffer(form) : await updateOffer(editing, form); toast.success("Tilbud lagret"); setEditing(null); setForm(EMPTY_OFFER); await refresh(); } catch { toast.error("Kunne ikke lagre tilbud"); } finally { setBusy(false); } };
  return <div className="space-y-4">{!editing && <button onClick={() => { setEditing("new"); setForm(EMPTY_OFFER); }} className="flex h-12 w-full items-center justify-center gap-2 rounded-full bg-[#C5A059] text-white"><Plus size={18} />Nytt tilbud</button>}{editing && <div className="space-y-3 rounded-3xl border bg-white p-5"><Input placeholder="Tittel" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /><Textarea placeholder="Beskrivelse" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /><Input placeholder="Pris" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} /><OfferImage value={form.image_url} onChange={(image_url) => setForm({ ...form, image_url })} /><button disabled={busy} onClick={save} className="h-12 w-full rounded-full bg-[#C5A059] text-white">Lagre</button></div>}{offers.map((o) => <div key={o.id} className="flex gap-3 rounded-3xl border bg-white p-4"><img src={o.image_url} alt="" className="h-20 w-20 rounded-2xl object-cover" /><div className="flex-1"><div className="font-serif-display text-lg">{o.title}</div><div className="text-sm text-[#B89953]">{o.price}</div></div><button onClick={() => { setEditing(o.id); setForm({ ...EMPTY_OFFER, ...o }); }}><Pencil size={15} /></button><button onClick={async () => { if (window.confirm("Slette tilbudet?")) { await deleteOffer(o.id); refresh(); } }}><Trash2 size={15} /></button></div>)}</div>;
}

function OfferImage({ value, onChange }) { const ref = useRef(null); const [uploading, setUploading] = useState(false); const upload = async (file) => { if (!file) return; setUploading(true); try { const result = await uploadImage(file); onChange(result.full_url); } catch { toast.error("Opplasting feilet"); } finally { setUploading(false); } }; return <div><button type="button" onClick={() => ref.current?.click()} className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-[#C5A059]"><Upload size={17} />{uploading ? "Laster opp..." : "Last opp bilde"}</button><input ref={ref} type="file" accept="image/*" className="hidden" onChange={(e) => upload(e.target.files?.[0])} /><Input className="mt-2" placeholder="Bilde-URL" value={value || ""} onChange={(e) => onChange(e.target.value)} /></div>; }

function NotificationsTab() {
  const [form, setForm] = useState({ title: "", message: "", category: "news", targetMode: "all", targetValue: "" });
  const [customers, setCustomers] = useState([]); const [sent, setSent] = useState([]); const [busy, setBusy] = useState(false);
  const refresh = async () => { try { const [c, n] = await Promise.all([listCustomers(), listNotifications()]); setCustomers(c); setSent(n); } catch (e) { toast.error(e.message || "Kunne ikke laste varsler"); } };
  useEffect(() => { refresh(); }, []);
  const tags = useMemo(() => [...new Set(customers.flatMap((c) => c.tags || []))].sort(), [customers]);
  const recipients = useMemo(() => {
    if (form.targetMode === "customer") return customers.filter((c) => c.user_id === form.targetValue);
    if (form.targetMode === "tag") return customers.filter((c) => (c.tags || []).includes(form.targetValue));
    if (form.targetMode === "language") return customers.filter((c) => c.language === form.targetValue);
    return customers;
  }, [customers, form.targetMode, form.targetValue]);
  const send = async () => {
    if (!form.title.trim() || !form.message.trim()) return toast.error("Skriv tittel og melding");
    if (form.targetMode !== "all" && !form.targetValue) return toast.error("Velg mottakergruppe");
    if (form.targetMode !== "all" && !recipients.length) return toast.error("Gruppen har ingen kunder");
    setBusy(true);
    try {
      await createNotification({ title: form.title, message: form.message, category: form.category, target_user_ids: form.targetMode === "all" ? [] : recipients.map((c) => c.user_id) });
      toast.success(form.targetMode === "all" ? "Varsel sendt til alle" : `Varsel sendt til ${recipients.length} kunder`);
      setForm({ title: "", message: "", category: "news", targetMode: "all", targetValue: "" });
      await refresh();
    } catch (e) { toast.error(e.message || "Kunne ikke sende varsel"); }
    finally { setBusy(false); }
  };
  return <div className="space-y-4"><div className="rounded-3xl border bg-white p-5"><div className="mb-4 flex items-center gap-2"><Bell size={18} className="text-[#B89953]" /><h2 className="font-serif-display text-2xl">Send varsel</h2></div><div className="space-y-3"><Input placeholder="Tittel" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /><Textarea placeholder="Melding" value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} /><select className="h-12 w-full rounded-2xl border bg-white px-4 text-sm" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}><option value="news">Nyheter</option><option value="offers">Tilbud</option><option value="loyalty">Lojalitet</option></select><select className="h-12 w-full rounded-2xl border bg-white px-4 text-sm" value={form.targetMode} onChange={(e) => setForm({ ...form, targetMode: e.target.value, targetValue: "" })}><option value="all">Alle kunder</option><option value="tag">Etikett / kundegruppe</option><option value="language">Språkgruppe</option><option value="customer">Én bestemt kunde</option></select>{form.targetMode === "tag" && <select className="h-12 w-full rounded-2xl border bg-white px-4 text-sm" value={form.targetValue} onChange={(e) => setForm({ ...form, targetValue: e.target.value })}><option value="">Velg etikett</option>{tags.map((tag) => <option key={tag} value={tag}>{tag}</option>)}</select>}{form.targetMode === "language" && <select className="h-12 w-full rounded-2xl border bg-white px-4 text-sm" value={form.targetValue} onChange={(e) => setForm({ ...form, targetValue: e.target.value })}><option value="">Velg språk</option><option value="Norsk">Norsk</option><option value="Tyrkisk">Tyrkisk</option><option value="Arabisk">Arabisk</option><option value="Engelsk">Engelsk</option></select>}{form.targetMode === "customer" && <select className="h-12 w-full rounded-2xl border bg-white px-4 text-sm" value={form.targetValue} onChange={(e) => setForm({ ...form, targetValue: e.target.value })}><option value="">Velg kunde</option>{customers.map((c) => <option key={c.user_id} value={c.user_id}>{c.name || c.phone || "Kunde"}</option>)}</select>}<div className="rounded-2xl bg-[#F4F0EA] p-3 text-sm text-[#6B655B]">Mottakere: <strong>{form.targetMode === "all" ? customers.length : recipients.length}</strong></div><button disabled={busy} onClick={send} className="flex h-12 w-full items-center justify-center gap-2 rounded-full bg-[#C5A059] text-white disabled:opacity-50"><Send size={17} />{busy ? "Sender..." : "Send varsel"}</button></div></div><div className="rounded-3xl border bg-white p-5"><h3 className="font-serif-display text-xl">Tidligere varsler</h3><div className="mt-3 space-y-3">{sent.slice(0, 30).map((n) => <div key={n.id} className="border-b pb-3"><div className="font-medium">{n.title}</div><div className="text-sm text-[#6B655B]">{n.message}</div><div className="text-[10px] text-[#9C968C]">{new Date(n.created_at).toLocaleString("no-NO")}</div></div>)}</div></div></div>;
}

function HistoryTab() {
  const [customers, setCustomers] = useState([]); const [query, setQuery] = useState(""); const [detail, setDetail] = useState(null); const [loading, setLoading] = useState(true);
  useEffect(() => { listLoyalty().then(setCustomers).catch((e) => toast.error(e.message || "Kunne ikke laste historikk")).finally(() => setLoading(false)); }, []);
  const filtered = useMemo(() => { const q = query.toLowerCase().trim(); return customers.filter((c) => !q || [c.name, c.phone, ...(c.tags || [])].filter(Boolean).some((v) => String(v).toLowerCase().includes(q))); }, [customers, query]);
  const open = async (c) => { try { setDetail(await getLoyaltyHistory(c.user_id)); } catch (e) { toast.error(e.message || "Kunne ikke laste kundehistorikk"); } };
  if (detail) return <div className="space-y-4"><button onClick={() => setDetail(null)} className="flex items-center gap-2 text-sm"><ArrowLeft size={16} />Tilbake</button><div className="rounded-3xl border bg-white p-5"><div className="font-serif-display text-2xl">{detail.card.name || "Kunde"}</div><div className="text-sm text-[#6B655B]">{detail.card.phone}</div><div className="mt-2 text-sm text-[#B89953]">{detail.card.stamps}/10 stempler</div></div><div className="rounded-3xl border bg-white p-5"><h3 className="mb-3 font-serif-display text-xl">Aktivitet</h3>{detail.events.length ? detail.events.map((e) => <div key={e.id} className="border-b py-3"><div className="text-sm">{e.type === "stamp" ? `Stempel #${e.stamps_after}` : e.type === "unstamp" ? `Stempel fjernet – ${e.stamps_after}/10` : "Kort tilbakestilt"}</div><div className="text-[10px] text-[#9C968C]">{new Date(e.created_at).toLocaleString("no-NO")}</div></div>) : <div className="text-sm text-[#6B655B]">Ingen aktivitet ennå.</div>}</div></div>;
  return <div className="space-y-3"><div className="relative"><Search className="absolute left-4 top-1/2 -translate-y-1/2 text-[#9C968C]" size={16} /><Input className="h-12 rounded-2xl pl-10" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Søk navn, telefon eller etikett" /></div>{loading ? <div className="py-8 text-center">Laster...</div> : filtered.map((c) => <button key={c.user_id} onClick={() => open(c)} className="flex w-full items-center gap-3 rounded-2xl border bg-white p-4 text-left"><History size={16} /><div className="flex-1"><div className="font-medium">{c.name || "Kunde"}</div><div className="text-xs text-[#6B655B]">{c.phone}</div></div><span className="rounded-full bg-[#F4ECD8] px-3 py-1 text-xs">{c.stamps || 0}/10</span></button>)}</div>;
}