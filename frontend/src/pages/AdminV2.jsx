import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Html5Qrcode } from "html5-qrcode";
import { ArrowLeft, Bell, Camera, Check, History, Minus, Pencil, Plus, RefreshCw, Search, Send, Trash2, Upload, Users, X } from "lucide-react";
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
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(null);
  const [busy, setBusy] = useState(false);

  const refresh = async () => {
    try { setCustomers(await listCustomers()); }
    catch (e) { toast.error(e.message || "Kunne ikke laste kunder"); }
  };
  useEffect(() => { refresh(); }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return customers.filter((c) => !q || [c.name, c.phone, c.email, ...(c.tags || [])].filter(Boolean).some((v) => String(v).toLowerCase().includes(q)));
  }, [customers, query]);

  const openEdit = (customer) => {
    setEditing(customer.user_id);
    setForm({
      name: customer.name || "",
      phone: customer.phone || "",
      birth_date: customer.birth_date || "",
      language: customer.language || "",
      tags: customer.tags || [],
      admin_notes: customer.admin_notes || "",
    });
  };

  const toggleTag = (tag) => setForm((current) => ({
    ...current,
    tags: current.tags.includes(tag) ? current.tags.filter((t) => t !== tag) : [...current.tags, tag],
  }));

  const save = async () => {
    setBusy(true);
    try {
      await updateCustomer(editing, form);
      toast.success("Kunden er oppdatert");
      setEditing(null);
      setForm(null);
      await refresh();
    } catch (e) {
      toast.error(e.message || "Kunne ikke oppdatere kunden");
    } finally {
      setBusy(false);
    }
  };

  if (editing && form) return (
    <div className="space-y-4">
      <button onClick={() => { setEditing(null); setForm(null); }} className="flex items-center gap-2 text-sm"><ArrowLeft size={16} />Tilbake til kunder</button>
      <div className="space-y-3 rounded-3xl border border-[#EBE5DC] bg-white p-5">
        <h2 className="font-serif-display text-2xl">Rediger kunde</h2>
        <Input placeholder="Navn" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        <Input placeholder="Telefon" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
        <Input type="date" value={form.birth_date} onChange={(e) => setForm({ ...form, birth_date: e.target.value })} />
        <Input placeholder="Språk" value={form.language} onChange={(e) => setForm({ ...form, language: e.target.value })} />
        <div className="flex flex-wrap gap-2">{DEFAULT_TAGS.map((tag) => <button key={tag} type="button" onClick={() => toggleTag(tag)} className={`rounded-full px-3 py-2 text-xs ${form.tags.includes(tag) ? "bg-[#C5A059] text-white" : "bg-[#F4ECD8] text-[#6B655B]"}`}>{tag}</button>)}</div>
        <Textarea placeholder="Interne notater" value={form.admin_notes} onChange={(e) => setForm({ ...form, admin_notes: e.target.value })} />
        <button disabled={busy} onClick={save} className="h-12 w-full rounded-full bg-[#C5A059] text-white disabled:opacity-50">{busy ? "Lagrer..." : "Lagre kunde"}</button>
      </div>
    </div>
  );

  return (
    <div className="space-y-3">
      <div className="relative"><Search className="absolute left-4 top-1/2 -translate-y-1/2 text-[#9C968C]" size={16} /><Input className="h-12 rounded-2xl pl-10" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Søk navn, telefon, e-post eller gruppe" /></div>
      <div className="rounded-2xl bg-[#F4ECD8] px-4 py-3 text-sm text-[#6B655B]">{filtered.length} kunder</div>
      {filtered.map((c) => <button key={c.user_id} onClick={() => openEdit(c)} className="flex w-full items-center gap-3 rounded-2xl border border-[#EBE5DC] bg-white p-4 text-left"><div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#F4ECD8]"><Users size={17} /></div><div className="min-w-0 flex-1"><div className="truncate font-medium">{c.name || "Kunde"}</div><div className="truncate text-xs text-[#6B655B]">{c.phone || c.email || "Ingen kontaktinformasjon"}</div><div className="mt-1 flex flex-wrap gap-1">{(c.tags || []).slice(0, 3).map((tag) => <span key={tag} className="rounded-full bg-[#F4ECD8] px-2 py-0.5 text-[10px]">{tag}</span>)}</div></div><Pencil size={15} /></button>)}
      {!filtered.length && <div className="rounded-3xl bg-white p-8 text-center text-sm text-[#6B655B]">Ingen kunder funnet.</div>}
    </div>
  );
}

function CustomerCard({ card, onStamp, onUnstamp, onReset, busy }) {
  if (!card) return null;
  return <div className="rounded-3xl border border-[#EBE5DC] bg-white p-5 shadow-sm"><div className="flex items-start justify-between gap-3"><div><div className="text-[10px] uppercase tracking-[0.2em] text-[#9C968C]">Valgt kunde</div><div className="mt-1 font-serif-display text-2xl">{card.name?.trim() || "Kunde"}</div>{card.phone && <div className="mt-1 text-sm text-[#6B655B]">{card.phone}</div>}</div><span className="rounded-full bg-[#F4ECD8] px-3 py-1 text-xs">{card.stamps || 0}/10</span></div><div className="mt-4 grid grid-cols-10 gap-1.5">{Array.from({ length: 10 }).map((_, i) => <div key={i} className={`aspect-square rounded-full ${i < (card.stamps || 0) ? "bg-[#C5A059]" : "border border-[#EBE5DC] bg-[#F4F0EA]"}`} />)}</div><button disabled={busy || (card.stamps || 0) >= 10} onClick={onStamp} className="mt-5 flex h-12 w-full items-center justify-center gap-2 rounded-full bg-[#C5A059] text-white disabled:opacity-50"><Check size={17} />Bekreft og gi stempel</button><div className="mt-2 grid grid-cols-2 gap-2"><button disabled={busy || (card.stamps || 0) <= 0} onClick={onUnstamp} className="h-11 rounded-full border border-[#EBE5DC] text-sm text-[#9E4747] disabled:opacity-50"><Minus size={15} className="mr-1 inline" />Fjern</button><button disabled={busy || (card.stamps || 0) < 10} onClick={onReset} className="h-11 rounded-full bg-[#2C2A26] text-sm text-white disabled:opacity-50"><RefreshCw size={15} className="mr-1 inline" />Nytt kort</button></div></div>;
}

function ScanTab() {
  const [customers, setCustomers] = useState([]); const [query, setQuery] = useState(""); const [selected, setSelected] = useState(null); const [busy, setBusy] = useState(false); const [scanning, setScanning] = useState(false); const qrRef = useRef(null);
  const loadCustomers = async () => { try { setCustomers(await listLoyalty()); } catch (e) { toast.error(e.message || "Kunne ikke laste kunder"); } };
  useEffect(() => { loadCustomers(); return () => { qrRef.current?.stop?.().catch(() => {}); }; }, []);
  const results = useMemo(() => { const q = query.trim().toLowerCase(); if (!q) return []; return customers.filter((c) => (c.name || "").toLowerCase().includes(q) || (c.phone || "").includes(q) || (c.device_id || "").toLowerCase().includes(q)).slice(0, 15); }, [customers, query]);
  const chooseById = async (id) => { try { setSelected(await getLoyalty(id)); setQuery(""); } catch (e) { toast.error(e.message || "Fant ikke kunden"); } };
  const startCamera = async () => { try { const qr = new Html5Qrcode("admin-qr-reader"); qrRef.current = qr; await qr.start({ facingMode: "environment" }, { fps: 10, qrbox: 230 }, async (text) => { await qr.stop().catch(() => {}); setScanning(false); await chooseById(text); }, () => {}); setScanning(true); } catch { toast.error("Kunne ikke starte kamera"); } };
  const doAction = async (action) => { if (!selected) return; setBusy(true); try { const updated = await action(selected.device_id); setSelected({ ...selected, ...updated }); await loadCustomers(); toast.success("Kundekortet er oppdatert"); } catch (e) { toast.error(e.message || "Kunne ikke oppdatere kortet"); } finally { setBusy(false); } };
  return <div className="space-y-4"><div className="rounded-3xl border border-[#EBE5DC] bg-white p-5"><Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Søk på navn, telefon eller kunde-ID" />{query && <div className="mt-3 space-y-2">{results.map((c) => <button key={c.device_id} onClick={() => setSelected(c)} className="w-full rounded-2xl border p-3 text-left"><div>{c.name || "Kunde"}</div><div className="text-xs">{c.phone || c.device_id}</div></button>)}</div>}</div><div className="rounded-3xl border border-[#EBE5DC] bg-white p-5"><div id="admin-qr-reader" /><button onClick={scanning ? async () => { await qrRef.current?.stop?.().catch(() => {}); setScanning(false); } : startCamera} className="mt-3 h-12 w-full rounded-full bg-[#2C2A26] text-white"><Camera size={17} className="mr-2 inline" />{scanning ? "Stopp kamera" : "Skann QR-kode"}</button></div><CustomerCard card={selected} busy={busy} onStamp={() => doAction(stampLoyalty)} onUnstamp={() => doAction(unstampLoyalty)} onReset={() => doAction(resetLoyalty)} /></div>;
}

function OffersTab() {
  const [offers, setOffers] = useState([]); const [editing, setEditing] = useState(null); const [form, setForm] = useState(EMPTY_OFFER); const [busy, setBusy] = useState(false);
  const refresh = async () => { try { const data = await listOffers(); setOffers(Array.isArray(data) ? data : []); } catch (e) { toast.error(e.message || "Kunne ikke laste tilbud"); } };
  useEffect(() => { refresh(); }, []);
  const save = async () => { if (!form.title.trim() || !form.price.trim() || !form.image_url.trim()) return toast.error("Tittel, pris og bilde må fylles ut"); setBusy(true); try { editing === "new" ? await createOffer(form) : await updateOffer(editing, form); toast.success("Tilbud lagret"); setEditing(null); setForm(EMPTY_OFFER); await refresh(); } catch (e) { toast.error(e.message || "Kunne ikke lagre tilbud"); } finally { setBusy(false); } };
  return <div className="space-y-4">{!editing && <button onClick={() => { setEditing("new"); setForm(EMPTY_OFFER); }} className="h-12 w-full rounded-full bg-[#C5A059] text-white"><Plus size={18} className="mr-2 inline" />Nytt tilbud</button>}{editing && <div className="space-y-3 rounded-3xl border border-[#EBE5DC] bg-white p-5"><Input placeholder="Tittel" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /><Textarea placeholder="Beskrivelse" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /><Input placeholder="Pris" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} /><Input placeholder="Førpris" value={form.before_price} onChange={(e) => setForm({ ...form, before_price: e.target.value })} /><OfferImage value={form.image_url} onChange={(image_url) => setForm({ ...form, image_url })} /><button disabled={busy} onClick={save} className="h-12 w-full rounded-full bg-[#C5A059] text-white">Lagre</button></div>}{offers.map((o) => <div key={o.id} className="flex gap-3 rounded-3xl border border-[#EBE5DC] bg-white p-4"><img src={o.image_url} alt="" className="h-20 w-20 rounded-2xl object-cover" /><div className="flex-1"><div className="font-serif-display text-lg">{o.title}</div><div className="text-sm text-[#B89953]">{o.price}</div></div><button onClick={() => { setEditing(o.id); setForm({ ...EMPTY_OFFER, ...o }); }}><Pencil size={15} /></button><button onClick={async () => { if (window.confirm("Slette tilbudet?")) { await deleteOffer(o.id); await refresh(); } }}><Trash2 size={15} /></button></div>)}{!offers.length && !editing && <div className="rounded-3xl bg-white p-8 text-center text-sm">Ingen tilbud ennå.</div>}</div>;
}

function OfferImage({ value, onChange }) {
  const ref = useRef(null); const [uploading, setUploading] = useState(false);
  const upload = async (file) => { if (!file) return; setUploading(true); try { const result = await uploadImage(file); onChange(result.full_url); } catch { toast.error("Opplasting feilet"); } finally { setUploading(false); } };
  return <div><button type="button" onClick={() => ref.current?.click()} className="h-12 w-full rounded-2xl border border-dashed border-[#C5A059]"><Upload size={17} className="mr-2 inline" />{uploading ? "Laster opp..." : "Last opp bilde"}</button><input ref={ref} type="file" accept="image/*" className="hidden" onChange={(e) => upload(e.target.files?.[0])} /><Input className="mt-2" placeholder="Bilde-URL" value={value || ""} onChange={(e) => onChange(e.target.value)} /></div>;
}

function NotificationsTab() {
  const [form, setForm] = useState({ title: "", message: "", category: "news", target_user_id: "" }); const [customers, setCustomers] = useState([]); const [sent, setSent] = useState([]); const [busy, setBusy] = useState(false);
  const refresh = async () => { try { const [c, n] = await Promise.all([listLoyalty(), listNotifications()]); setCustomers(c || []); setSent(n || []); } catch (e) { toast.error(e.message || "Kunne ikke laste varsler"); } };
  useEffect(() => { refresh(); }, []);
  const send = async () => { if (!form.title.trim() || !form.message.trim()) return toast.error("Skriv tittel og melding"); setBusy(true); try { await createNotification(form); toast.success("Varsel sendt i appen"); setForm({ title: "", message: "", category: "news", target_user_id: "" }); await refresh(); } catch (e) { toast.error(e.message || "Kunne ikke sende varsel"); } finally { setBusy(false); } };
  return <div className="space-y-4"><div className="space-y-3 rounded-3xl border border-[#EBE5DC] bg-white p-5"><h2 className="font-serif-display text-2xl"><Bell size={18} className="mr-2 inline" />Send varsel</h2><Input placeholder="Tittel" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /><Textarea placeholder="Melding" value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} /><select className="h-12 w-full rounded-2xl border px-4" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}><option value="news">Nyheter</option><option value="offers">Tilbud</option><option value="loyalty">Lojalitet</option></select><select className="h-12 w-full rounded-2xl border px-4" value={form.target_user_id} onChange={(e) => setForm({ ...form, target_user_id: e.target.value })}><option value="">Alle kunder</option>{customers.map((c) => <option key={c.user_id} value={c.user_id}>{c.name || c.phone || c.user_id}</option>)}</select><button disabled={busy} onClick={send} className="h-12 w-full rounded-full bg-[#C5A059] text-white"><Send size={17} className="mr-2 inline" />Send varsel</button></div><div className="rounded-3xl border border-[#EBE5DC] bg-white p-5"><h3 className="font-serif-display text-xl">Tidligere varsler</h3>{sent.map((n) => <div key={n.id} className="border-b py-3"><div className="font-medium">{n.title}</div><div className="text-sm">{n.message}</div></div>)}</div></div>;
}

function HistoryTab() {
  const [customers, setCustomers] = useState([]); const [query, setQuery] = useState(""); const [detail, setDetail] = useState(null); const [loading, setLoading] = useState(true);
  useEffect(() => { listLoyalty().then((d) => setCustomers(d || [])).catch((e) => toast.error(e.message || "Kunne ikke laste historikk")).finally(() => setLoading(false)); }, []);
  const filtered = useMemo(() => { const q = query.toLowerCase().trim(); return customers.filter((c) => !q || (c.name || "").toLowerCase().includes(q) || (c.phone || "").includes(q) || (c.device_id || "").toLowerCase().includes(q)); }, [customers, query]);
  const open = async (c) => { try { setDetail(await getLoyaltyHistory(c.device_id)); } catch (e) { toast.error(e.message || "Kunne ikke laste kundehistorikk"); } };
  if (detail) return <div className="space-y-4"><button onClick={() => setDetail(null)}><ArrowLeft size={16} className="mr-2 inline" />Tilbake</button><div className="rounded-3xl bg-white p-5"><div className="font-serif-display text-2xl">{detail.card.name || "Kunde"}</div><div>{detail.card.stamps}/10 stempler</div></div><div className="rounded-3xl bg-white p-5">{(detail.events || []).map((e) => <div key={e.id} className="border-b py-3">{e.type === "stamp" ? `Stempel #${e.stamps_after}` : e.type === "unstamp" ? `Stempel fjernet – ${e.stamps_after}/10` : "Kort tilbakestilt"}</div>)}</div></div>;
  return <div className="space-y-3"><Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Søk navn, telefon eller ID" />{loading ? <div className="py-8 text-center">Laster...</div> : filtered.map((c) => <button key={c.device_id} onClick={() => open(c)} className="flex w-full items-center gap-3 rounded-2xl border bg-white p-4 text-left"><History size={16} /><div className="flex-1"><div>{c.name || "Kunde"}</div><div className="text-xs">{c.phone || c.device_id}</div></div><span>{c.stamps || 0}/10</span></button>)}</div>;
}
