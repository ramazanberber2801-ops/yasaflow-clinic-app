import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Html5Qrcode } from "html5-qrcode";
import { ArrowLeft, Camera, Check, History, Minus, Pencil, Plus, RefreshCw, ScanLine, Search, Trash2, Upload, X } from "lucide-react";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  createOffer,
  deleteOffer,
  getLoyalty,
  getLoyaltyHistory,
  listLoyalty,
  listOffers,
  resetLoyalty,
  stampLoyalty,
  unstampLoyalty,
  updateOffer,
  uploadImage,
} from "@/lib/api";
import { supabase } from "@/lib/supabase";

const EMPTY_OFFER = { title: "", description: "", price: "", before_price: "", image_url: "", badge: "TILBUD" };

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
        <Tabs defaultValue="scan">
          <TabsList className="mb-6 grid h-auto grid-cols-3 rounded-full border border-[#EBE5DC] bg-white p-1">
            <TabsTrigger value="scan" className="rounded-full py-2.5 data-[state=active]:bg-[#C5A059] data-[state=active]:text-white">Skanning</TabsTrigger>
            <TabsTrigger value="offers" className="rounded-full py-2.5 data-[state=active]:bg-[#C5A059] data-[state=active]:text-white">Tilbud</TabsTrigger>
            <TabsTrigger value="history" className="rounded-full py-2.5 data-[state=active]:bg-[#C5A059] data-[state=active]:text-white">Historikk</TabsTrigger>
          </TabsList>
          <TabsContent value="scan"><ScanTab /></TabsContent>
          <TabsContent value="offers"><OffersTab /></TabsContent>
          <TabsContent value="history"><HistoryTab /></TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

function CustomerCard({ card, onStamp, onUnstamp, onReset, busy }) {
  if (!card) return null;
  const displayName = card.name?.trim() || "Uregistrert kunde";
  return (
    <div className="rounded-3xl border border-[#EBE5DC] bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-[10px] uppercase tracking-[0.2em] text-[#9C968C]">Valgt kunde</div>
          <div className="mt-1 font-serif-display text-2xl text-[#2C2A26]">{displayName}</div>
          {card.phone && <div className="mt-1 text-sm text-[#6B655B]">{card.phone}</div>}
          {card.email && <div className="text-sm text-[#6B655B]">{card.email}</div>}
        </div>
        <span className="rounded-full bg-[#F4ECD8] px-3 py-1 text-xs text-[#8C6B2F]">{card.stamps || 0}/10</span>
      </div>
      {!card.name && <div className="mt-3 rounded-2xl bg-[#FFF4E5] p-3 text-xs text-[#7A5317]">Navn er ikke registrert. Kontroller kunden før du gir stempel.</div>}
      <div className="mt-4 grid grid-cols-10 gap-1.5">{Array.from({ length: 10 }).map((_, i) => <div key={i} className={`aspect-square rounded-full ${i < (card.stamps || 0) ? "bg-gradient-to-br from-[#D4B36A] to-[#B89953]" : "border border-[#EBE5DC] bg-[#F4F0EA]"}`} />)}</div>
      <button disabled={busy || (card.stamps || 0) >= 10} onClick={onStamp} className="mt-5 flex h-12 w-full items-center justify-center gap-2 rounded-full bg-[#C5A059] font-medium text-white disabled:opacity-50"><Check size={17} />Bekreft og gi stempel til {displayName}</button>
      <div className="mt-2 grid grid-cols-2 gap-2">
        <button disabled={busy || (card.stamps || 0) <= 0} onClick={onUnstamp} className="flex h-11 items-center justify-center gap-2 rounded-full border border-[#EBE5DC] text-sm text-[#9E4747] disabled:opacity-50"><Minus size={15} />Fjern stempel</button>
        <button disabled={busy || (card.stamps || 0) < 10} onClick={onReset} className="flex h-11 items-center justify-center gap-2 rounded-full bg-[#2C2A26] text-sm text-white disabled:opacity-50"><RefreshCw size={15} />Nytt kort</button>
      </div>
      <div className="mt-3 break-all text-[10px] text-[#9C968C]">Kunde-ID: {card.device_id}</div>
    </div>
  );
}

function ScanTab() {
  const [customers, setCustomers] = useState([]);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState(null);
  const [busy, setBusy] = useState(false);
  const [scanning, setScanning] = useState(false);
  const qrRef = useRef(null);

  const loadCustomers = async () => {
    try { const data = await listLoyalty(); setCustomers(Array.isArray(data) ? data : []); }
    catch (e) { toast.error(e?.response?.data?.detail || "Kunne ikke laste kunder"); }
  };
  useEffect(() => { loadCustomers(); return () => { qrRef.current?.stop?.().catch(() => {}); }; }, []);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    const digits = q.replace(/\D/g, "");
    return customers.filter((c) => {
      const phone = (c.phone || "").replace(/\D/g, "");
      return (c.name || "").toLowerCase().includes(q) || (c.email || "").toLowerCase().includes(q) || (c.device_id || "").toLowerCase().includes(q) || (digits.length >= 3 && phone.includes(digits));
    }).slice(0, 15);
  }, [customers, query]);

  const chooseById = async (id) => {
    try { const card = await getLoyalty(id); setSelected(card); setQuery(""); }
    catch { toast.error("Fant ikke kunden"); }
  };

  const startCamera = async () => {
    try {
      const qr = new Html5Qrcode("admin-qr-reader"); qrRef.current = qr;
      await qr.start({ facingMode: "environment" }, { fps: 10, qrbox: 230 }, async (text) => {
        await qr.stop().catch(() => {}); setScanning(false); await chooseById(text);
      }, () => {});
      setScanning(true);
    } catch { toast.error("Kunne ikke starte kamera"); }
  };

  const doAction = async (action) => {
    if (!selected) return;
    setBusy(true);
    try {
      const updated = await action(selected.device_id);
      setSelected({ ...selected, ...updated });
      await loadCustomers();
      toast.success("Kundekortet er oppdatert");
    } catch (e) { toast.error(e?.response?.data?.detail || "Kunne ikke oppdatere kortet"); }
    finally { setBusy(false); }
  };

  return <div className="space-y-4">
    <div className="rounded-3xl border border-[#EBE5DC] bg-white p-5">
      <div className="mb-3 flex items-center gap-2"><Search size={17} className="text-[#B89953]" /><h2 className="font-serif-display text-xl">Finn kunde</h2></div>
      <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Søk på navn, telefon, e-post eller kunde-ID" className="h-12 rounded-2xl" />
      {query.trim() && <div className="mt-3 space-y-2">{results.length ? results.map((c) => <button key={c.device_id} onClick={() => setSelected(c)} className="w-full rounded-2xl border border-[#EBE5DC] p-3 text-left hover:bg-[#FDFBF7]"><div className="font-medium text-[#2C2A26]">{c.name || "Uregistrert kunde"}</div><div className="text-xs text-[#6B655B]">{[c.phone, c.email].filter(Boolean).join(" · ") || c.device_id}</div><div className="mt-1 text-xs text-[#B89953]">{c.stamps || 0}/10 stempler</div></button>) : <div className="py-3 text-sm text-[#6B655B]">Ingen kunde funnet.</div>}</div>}
    </div>
    <div className="rounded-3xl border border-[#EBE5DC] bg-white p-5">
      <div id="admin-qr-reader" className="overflow-hidden rounded-2xl bg-[#2C2A26]" />
      <button onClick={scanning ? async () => { await qrRef.current?.stop?.().catch(() => {}); setScanning(false); } : startCamera} className="mt-3 flex h-12 w-full items-center justify-center gap-2 rounded-full bg-[#2C2A26] text-white">{scanning ? <X size={17} /> : <Camera size={17} />}{scanning ? "Stopp kamera" : "Skann QR-kode"}</button>
    </div>
    <CustomerCard card={selected} busy={busy} onStamp={() => doAction(stampLoyalty)} onUnstamp={() => doAction(unstampLoyalty)} onReset={() => doAction(resetLoyalty)} />
  </div>;
}

function OffersTab() {
  const [offers, setOffers] = useState([]); const [editing, setEditing] = useState(null); const [form, setForm] = useState(EMPTY_OFFER); const [busy, setBusy] = useState(false);
  const refresh = async () => { try { const data = await listOffers(); setOffers(Array.isArray(data) ? data : []); } catch (e) { toast.error(e?.response?.data?.detail || "Kunne ikke laste tilbud"); } };
  useEffect(() => { refresh(); }, []);
  const save = async () => { if (!form.title.trim() || !form.price.trim() || !form.image_url.trim()) return toast.error("Tittel, pris og bilde må fylles ut"); setBusy(true); try { editing === "new" ? await createOffer(form) : await updateOffer(editing, form); toast.success("Tilbud lagret"); setEditing(null); setForm(EMPTY_OFFER); await refresh(); } catch (e) { toast.error(e?.response?.data?.detail || "Kunne ikke lagre tilbud"); } finally { setBusy(false); } };
  return <div className="space-y-4">
    {!editing && <button onClick={() => { setEditing("new"); setForm(EMPTY_OFFER); }} className="flex h-12 w-full items-center justify-center gap-2 rounded-full bg-[#C5A059] text-white"><Plus size={18} />Nytt tilbud</button>}
    {editing && <div className="space-y-3 rounded-3xl border border-[#EBE5DC] bg-white p-5"><div className="flex justify-between"><h2 className="font-serif-display text-2xl">{editing === "new" ? "Nytt tilbud" : "Rediger tilbud"}</h2><button onClick={() => setEditing(null)}><X size={18} /></button></div><Input placeholder="Tittel" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /><Textarea placeholder="Beskrivelse" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /><div className="grid grid-cols-2 gap-2"><Input placeholder="Pris" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} /><Input placeholder="Førpris" value={form.before_price} onChange={(e) => setForm({ ...form, before_price: e.target.value })} /></div><Input placeholder="Etikett" value={form.badge} onChange={(e) => setForm({ ...form, badge: e.target.value })} /><OfferImage value={form.image_url} onChange={(image_url) => setForm({ ...form, image_url })} /><button disabled={busy} onClick={save} className="h-12 w-full rounded-full bg-[#C5A059] text-white disabled:opacity-50">Lagre</button></div>}
    {offers.map((o) => <div key={o.id} className="flex gap-3 rounded-3xl border border-[#EBE5DC] bg-white p-4"><img src={o.image_url} alt="" className="h-20 w-20 rounded-2xl object-cover" /><div className="min-w-0 flex-1"><div className="truncate font-serif-display text-lg">{o.title}</div><div className="text-sm text-[#B89953]">{o.price}</div></div><div className="flex flex-col gap-2"><button onClick={() => { setEditing(o.id); setForm({ ...EMPTY_OFFER, ...o }); }} className="rounded-full bg-[#F4ECD8] p-2"><Pencil size={14} /></button><button onClick={async () => { if (!window.confirm("Slette tilbudet?")) return; try { await deleteOffer(o.id); await refresh(); } catch { toast.error("Kunne ikke slette"); } }} className="rounded-full bg-[#FCE8E8] p-2 text-[#9E4747]"><Trash2 size={14} /></button></div></div>)}
    {!offers.length && !editing && <div className="rounded-3xl bg-white p-8 text-center text-sm text-[#6B655B]">Ingen tilbud ennå.</div>}
  </div>;
}

function OfferImage({ value, onChange }) {
  const ref = useRef(null); const [uploading, setUploading] = useState(false);
  const upload = async (file) => { if (!file) return; setUploading(true); try { const result = await uploadImage(file); onChange(result.full_url); toast.success("Bilde lastet opp"); } catch (e) { toast.error(e?.response?.data?.detail || "Opplasting feilet"); } finally { setUploading(false); } };
  return <div><button type="button" disabled={uploading} onClick={() => ref.current?.click()} className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-[#C5A059]"><Upload size={17} />{uploading ? "Laster opp..." : "Last opp bilde"}</button><input ref={ref} type="file" accept="image/*" className="hidden" onChange={(e) => upload(e.target.files?.[0])} /><Input className="mt-2" placeholder="Eller lim inn bilde-URL" value={value || ""} onChange={(e) => onChange(e.target.value)} />{value && <img src={value} alt="Forhåndsvisning" className="mt-3 max-h-52 w-full rounded-2xl object-cover" />}</div>;
}

function HistoryTab() {
  const [customers, setCustomers] = useState([]); const [query, setQuery] = useState(""); const [detail, setDetail] = useState(null); const [loading, setLoading] = useState(true);
  useEffect(() => { listLoyalty().then((d) => setCustomers(Array.isArray(d) ? d : [])).catch((e) => toast.error(e?.response?.data?.detail || "Kunne ikke laste historikk")).finally(() => setLoading(false)); }, []);
  const filtered = useMemo(() => { const q = query.toLowerCase().trim(); return customers.filter((c) => !q || (c.name || "").toLowerCase().includes(q) || (c.phone || "").toLowerCase().includes(q) || (c.email || "").toLowerCase().includes(q) || (c.device_id || "").toLowerCase().includes(q)); }, [customers, query]);
  const open = async (c) => { try { const data = await getLoyaltyHistory(c.device_id); setDetail(data); } catch (e) { toast.error(e?.response?.data?.detail || "Kunne ikke laste kundehistorikk"); } };
  if (detail) return <div className="space-y-4"><button onClick={() => setDetail(null)} className="flex items-center gap-2 text-sm"><ArrowLeft size={16} />Tilbake</button><div className="rounded-3xl border border-[#EBE5DC] bg-white p-5"><div className="font-serif-display text-2xl">{detail.card.name || "Uregistrert kunde"}</div><div className="text-sm text-[#6B655B]">{[detail.card.phone, detail.card.email].filter(Boolean).join(" · ")}</div><div className="mt-2 text-sm text-[#B89953]">{detail.card.stamps}/10 stempler</div></div><div className="rounded-3xl border border-[#EBE5DC] bg-white p-5"><h3 className="mb-3 font-serif-display text-xl">Aktivitet</h3>{(detail.events || []).length ? detail.events.map((e) => <div key={e.id} className="border-b border-[#EBE5DC] py-3 last:border-0"><div className="text-sm">{e.type === "stamp" ? `Stempel #${e.stamps_after}` : e.type === "unstamp" ? `Stempel fjernet – ${e.stamps_after}/10` : e.type === "reset" ? "Kort tilbakestilt" : "Kort overført"}</div><div className="text-[10px] text-[#9C968C]">{new Date(e.created_at).toLocaleString("no-NO")}</div></div>) : <div className="text-sm text-[#6B655B]">Ingen aktivitet ennå.</div>}</div></div>;
  return <div className="space-y-3"><div className="relative"><Search className="absolute left-4 top-1/2 -translate-y-1/2 text-[#9C968C]" size={16} /><Input className="h-12 rounded-2xl pl-10" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Søk navn, telefon, e-post eller ID" /></div>{loading ? <div className="py-8 text-center">Laster...</div> : filtered.map((c) => <button key={c.device_id} onClick={() => open(c)} className="flex w-full items-center gap-3 rounded-2xl border border-[#EBE5DC] bg-white p-4 text-left"><div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#F4ECD8]"><History size={16} /></div><div className="min-w-0 flex-1"><div className="truncate font-medium">{c.name || "Uregistrert kunde"}</div><div className="truncate text-xs text-[#6B655B]">{[c.phone, c.email].filter(Boolean).join(" · ") || c.device_id}</div></div><span className="rounded-full bg-[#F4ECD8] px-3 py-1 text-xs">{c.stamps || 0}/10</span></button>)}{!loading && !filtered.length && <div className="rounded-3xl bg-white p-8 text-center text-sm text-[#6B655B]">Ingen kunder funnet.</div>}</div>;
}
