import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  ArrowLeft,
  ScanLine,
  Pencil,
  Trash2,
  Plus,
  Check,
  RefreshCw,
  X,
  Camera,
  Keyboard,
  Upload,
  History,
  Sparkles,
  Search,
} from "lucide-react";
import { toast } from "sonner";
import { Html5Qrcode } from "html5-qrcode";
import {
  listOffers,
  createOffer,
  updateOffer,
  deleteOffer,
  getLoyalty,
  stampLoyalty,
  resetLoyalty,
  uploadImage,
  listLoyalty,
  getLoyaltyHistory,
  BACKEND_ORIGIN,
} from "@/lib/api";

export default function Admin() {
  const navigate = useNavigate();

  useEffect(() => {
    if (sessionStorage.getItem("seld_admin") !== "1") {
      navigate("/", { replace: true });
    }
  }, [navigate]);

  const logout = () => {
    sessionStorage.removeItem("seld_admin");
    sessionStorage.removeItem("seld_admin_token");
    navigate("/", { replace: true });
  };

  return (
    <div className="min-h-screen bg-paper" data-testid="admin-page">
      {/* Topbar */}
      <div className="bg-white border-b border-[#EBE5DC] sticky top-0 z-30">
        <div className="max-w-screen-md mx-auto flex items-center justify-between px-4 py-3">
          <button
            onClick={() => navigate("/")}
            className="flex items-center gap-2 text-[#2C2A26]"
            data-testid="admin-back"
          >
            <ArrowLeft size={18} strokeWidth={1.5} />
            <span className="text-sm">Tilbake</span>
          </button>
          <div className="font-serif-display text-xl text-[#B89953]">Admin</div>
          <button
            onClick={logout}
            className="text-xs text-[#6B655B] hover:text-[#2C2A26]"
            data-testid="admin-logout"
          >
            Logg ut
          </button>
        </div>
      </div>

      <div className="max-w-screen-md mx-auto px-4 py-6">
        <Tabs defaultValue="scan" className="w-full">
          <TabsList className="grid grid-cols-3 bg-white rounded-full p-1 border border-[#EBE5DC] mb-6 h-auto">
            <TabsTrigger
              value="scan"
              data-testid="admin-tab-scan"
              className="rounded-full py-2.5 text-xs sm:text-sm data-[state=active]:bg-[#C5A059] data-[state=active]:text-white text-[#6B655B]"
            >
              Scan
            </TabsTrigger>
            <TabsTrigger
              value="offers"
              data-testid="admin-tab-offers"
              className="rounded-full py-2.5 text-xs sm:text-sm data-[state=active]:bg-[#C5A059] data-[state=active]:text-white text-[#6B655B]"
            >
              Tilbud
            </TabsTrigger>
            <TabsTrigger
              value="history"
              data-testid="admin-tab-history"
              className="rounded-full py-2.5 text-xs sm:text-sm data-[state=active]:bg-[#C5A059] data-[state=active]:text-white text-[#6B655B]"
            >
              Historikk
            </TabsTrigger>
          </TabsList>

          <TabsContent value="scan" className="mt-0">
            <ScanTab />
          </TabsContent>
          <TabsContent value="offers" className="mt-0">
            <OffersTab />
          </TabsContent>
          <TabsContent value="history" className="mt-0">
            <HistoryTab />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

/* ===== Scan Tab ===== */
function ScanTab() {
  const [mode, setMode] = useState("camera"); // camera | manual
  const [scanning, setScanning] = useState(false);
  const [scanned, setScanned] = useState(null); // { device_id, stamps, total_completed }
  const [manualId, setManualId] = useState("");
  const [success, setSuccess] = useState(false);
  const qrRef = useRef(null);
  const containerId = "qr-reader-container";

  const stopScanner = async () => {
    if (qrRef.current) {
      try {
        await qrRef.current.stop();
        await qrRef.current.clear();
      } catch {}
      qrRef.current = null;
    }
    setScanning(false);
  };

  const startScanner = async () => {
    setSuccess(false);
    setScanned(null);
    try {
      const qr = new Html5Qrcode(containerId);
      qrRef.current = qr;
      await qr.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 240, height: 240 } },
        async (decodedText) => {
          await stopScanner();
          await handleId(decodedText);
        },
        () => {}
      );
      setScanning(true);
    } catch (e) {
      toast.error("Kunne ikke starte kamera. Bytt til manuell modus.");
      setMode("manual");
    }
  };

  useEffect(() => {
    return () => {
      stopScanner();
    };
    // eslint-disable-next-line
  }, []);

  const handleId = async (id) => {
    if (!id) return;
    try {
      const card = await getLoyalty(id);
      setScanned(card);
      if (card.stamps >= 10) {
        toast.info("Kortet er fullt – tilbakestill for å starte nytt kort.");
        return;
      }
      const updated = await stampLoyalty(id);
      setScanned({ ...updated });
      setSuccess(true);
      if (updated.milestone) {
        toast.success(`🎉 Milepæl nådd: ${updated.milestone}! (${updated.stamps}/10)`, {
          duration: 5000,
        });
      } else {
        toast.success(`+1 stempel! (${updated.stamps}/10)`);
      }
      setTimeout(() => setSuccess(false), 2200);
    } catch (e) {
      toast.error("Ugyldig QR-kode eller serverfeil");
    }
  };

  const handleReset = async () => {
    if (!scanned) return;
    try {
      const updated = await resetLoyalty(scanned.device_id);
      setScanned(updated);
      toast.success("Kort tilbakestilt");
    } catch {
      toast.error("Kunne ikke tilbakestille");
    }
  };

  return (
    <div className="space-y-4">
      {/* Mode toggle */}
      <div className="grid grid-cols-2 gap-2">
        <button
          onClick={() => {
            stopScanner();
            setMode("camera");
          }}
          data-testid="scan-mode-camera"
          className={`flex items-center justify-center gap-2 py-3 rounded-full border ${
            mode === "camera"
              ? "bg-[#C5A059] text-white border-[#C5A059]"
              : "bg-white text-[#2C2A26] border-[#EBE5DC]"
          }`}
        >
          <Camera size={16} strokeWidth={1.5} /> Kamera
        </button>
        <button
          onClick={() => {
            stopScanner();
            setMode("manual");
          }}
          data-testid="scan-mode-manual"
          className={`flex items-center justify-center gap-2 py-3 rounded-full border ${
            mode === "manual"
              ? "bg-[#C5A059] text-white border-[#C5A059]"
              : "bg-white text-[#2C2A26] border-[#EBE5DC]"
          }`}
        >
          <Keyboard size={16} strokeWidth={1.5} /> Manuell
        </button>
      </div>

      {/* Camera */}
      {mode === "camera" && (
        <div className="bg-white rounded-3xl p-5 border border-[#EBE5DC]/60 shadow-[0_4px_24px_rgba(44,42,38,0.05)]">
          <div className="relative rounded-2xl overflow-hidden bg-[#2C2A26] aspect-square">
            <div id={containerId} className="w-full h-full" />
            {!scanning && (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-white/80 gap-3">
                <ScanLine size={36} strokeWidth={1.25} />
                <p className="text-sm">Trykk «Start kamera» for å skanne</p>
              </div>
            )}
            {success && (
              <div className="absolute inset-0 bg-[#C5A059]/95 flex items-center justify-center success-pop">
                <div className="w-24 h-24 rounded-full bg-white flex items-center justify-center">
                  <Check size={48} strokeWidth={2.5} className="text-[#C5A059]" />
                </div>
              </div>
            )}
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2">
            {!scanning ? (
              <button
                onClick={startScanner}
                data-testid="scan-start"
                className="col-span-2 h-12 rounded-full bg-[#C5A059] hover:bg-[#B89953] text-white font-medium active:scale-95 transition-transform"
              >
                Start kamera
              </button>
            ) : (
              <button
                onClick={stopScanner}
                data-testid="scan-stop"
                className="col-span-2 h-12 rounded-full bg-[#F4F0EA] text-[#2C2A26] font-medium active:scale-95 transition-transform"
              >
                Stopp kamera
              </button>
            )}
          </div>
        </div>
      )}

      {/* Manual */}
      {mode === "manual" && (
        <div className="bg-white rounded-3xl p-5 border border-[#EBE5DC]/60">
          <label className="text-xs uppercase tracking-[0.2em] text-[#6B655B]">
            Kunde-ID
          </label>
          <Input
            value={manualId}
            onChange={(e) => setManualId(e.target.value)}
            placeholder="Lim inn kundens ID..."
            className="mt-2 rounded-2xl h-12 border-[#EBE5DC]"
            data-testid="scan-manual-input"
          />
          <button
            onClick={() => handleId(manualId.trim())}
            disabled={!manualId.trim()}
            data-testid="scan-manual-submit"
            className="mt-3 w-full h-12 rounded-full bg-[#C5A059] hover:bg-[#B89953] text-white font-medium disabled:opacity-50 active:scale-95 transition-transform"
          >
            Gi stempel
          </button>
        </div>
      )}

      {/* Result */}
      {scanned && (
        <div className="bg-white rounded-3xl p-5 border border-[#EBE5DC]/60 shadow-[0_4px_24px_rgba(44,42,38,0.05)] fade-up" data-testid="scan-result">
          <div className="flex items-center justify-between mb-3">
            <div className="font-serif-display text-xl text-[#2C2A26]">Kundekort</div>
            <span className="text-xs bg-[#F4ECD8] text-[#8C6B2F] px-3 py-1 rounded-full">
              {scanned.stamps}/10 stempler
            </span>
          </div>
          <p className="text-[10px] uppercase tracking-[0.2em] text-[#9C968C]">ID</p>
          <p className="text-xs font-mono text-[#6B655B] break-all mt-1">{scanned.device_id}</p>

          <div className="mt-4 grid grid-cols-10 gap-1.5">
            {Array.from({ length: 10 }).map((_, i) => (
              <div
                key={i}
                className={`aspect-square rounded-full ${
                  i < scanned.stamps
                    ? "bg-gradient-to-br from-[#D4B36A] to-[#B89953]"
                    : "bg-[#F4F0EA] border border-[#EBE5DC]"
                }`}
              />
            ))}
          </div>

          {scanned.stamps >= 10 && (
            <button
              onClick={handleReset}
              data-testid="scan-reset"
              className="mt-5 w-full h-12 rounded-full bg-[#2C2A26] hover:bg-black text-white font-medium flex items-center justify-center gap-2 active:scale-95 transition-transform"
            >
              <RefreshCw size={16} strokeWidth={1.5} />
              Tilbakestill kort (10/10)
            </button>
          )}
        </div>
      )}
    </div>
  );
}

/* ===== Offers Tab ===== */
const EMPTY_FORM = {
  title: "",
  description: "",
  price: "",
  before_price: "",
  image_url: "",
  badge: "TILBUD",
};

function OffersTab() {
  const [offers, setOffers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null); // id or "new"
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const refresh = async () => {
    setLoading(true);
    try {
      const data = await listOffers();
      setOffers(data);
    } catch {
      toast.error("Kunne ikke laste tilbud");
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    refresh();
  }, []);

  const startNew = () => {
    setForm(EMPTY_FORM);
    setEditing("new");
  };

  const startEdit = (o) => {
    setForm({
      title: o.title || "",
      description: o.description || "",
      price: o.price || "",
      before_price: o.before_price || "",
      image_url: o.image_url || "",
      badge: o.badge || "TILBUD",
    });
    setEditing(o.id);
  };

  const cancel = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
  };

  const save = async () => {
    if (!form.title.trim() || !form.price.trim() || !form.image_url.trim()) {
      toast.error("Tittel, pris og bilde-URL er påkrevd");
      return;
    }
    setSaving(true);
    try {
      if (editing === "new") {
        await createOffer(form);
        toast.success("Tilbud opprettet");
      } else {
        await updateOffer(editing, form);
        toast.success("Tilbud oppdatert");
      }
      await refresh();
      cancel();
    } catch {
      toast.error("Kunne ikke lagre");
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id) => {
    if (!confirm("Slett dette tilbudet?")) return;
    try {
      await deleteOffer(id);
      toast.success("Slettet");
      refresh();
    } catch {
      toast.error("Kunne ikke slette");
    }
  };

  return (
    <div className="space-y-4">
      {!editing && (
        <button
          onClick={startNew}
          data-testid="offer-new-button"
          className="w-full h-12 rounded-full bg-[#C5A059] hover:bg-[#B89953] text-white font-medium flex items-center justify-center gap-2 active:scale-95 transition-transform"
        >
          <Plus size={18} strokeWidth={2} />
          Legg til nytt tilbud
        </button>
      )}

      {editing && (
        <div className="bg-white rounded-3xl p-5 border border-[#EBE5DC]/60 shadow-[0_4px_24px_rgba(44,42,38,0.05)] fade-up" data-testid="offer-form">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-serif-display text-2xl text-[#2C2A26]">
              {editing === "new" ? "Nytt tilbud" : "Rediger tilbud"}
            </h3>
            <button onClick={cancel} className="p-2 rounded-full hover:bg-[#F4F0EA]" data-testid="offer-form-close">
              <X size={18} className="text-[#6B655B]" strokeWidth={1.5} />
            </button>
          </div>

          <FormField label="Tittel">
            <Input
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="f.eks. Hydra Skin Deluxe Behandling"
              className="rounded-2xl h-11 border-[#EBE5DC]"
              data-testid="offer-input-title"
            />
          </FormField>

          <FormField label="Beskrivelse">
            <Textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Beskrivelse av behandlingen..."
              rows={3}
              className="rounded-2xl border-[#EBE5DC]"
              data-testid="offer-input-description"
            />
          </FormField>

          <div className="grid grid-cols-2 gap-3">
            <FormField label="Pris">
              <Input
                value={form.price}
                onChange={(e) => setForm({ ...form, price: e.target.value })}
                placeholder="kr 1 290"
                className="rounded-2xl h-11 border-[#EBE5DC]"
                data-testid="offer-input-price"
              />
            </FormField>
            <FormField label="Førpris">
              <Input
                value={form.before_price}
                onChange={(e) => setForm({ ...form, before_price: e.target.value })}
                placeholder="kr 1 990"
                className="rounded-2xl h-11 border-[#EBE5DC]"
                data-testid="offer-input-before"
              />
            </FormField>
          </div>

          <FormField label="Badge (etikett)">
            <Input
              value={form.badge}
              onChange={(e) => setForm({ ...form, badge: e.target.value })}
              placeholder="SOMMER KAMPANJE"
              className="rounded-2xl h-11 border-[#EBE5DC]"
              data-testid="offer-input-badge"
            />
          </FormField>

          <FormField label="Bilde">
            <ImageUploader
              value={form.image_url}
              onChange={(url) => setForm({ ...form, image_url: url })}
            />
          </FormField>

          <button
            onClick={save}
            disabled={saving}
            data-testid="offer-form-save"
            className="mt-2 w-full h-12 rounded-full bg-[#C5A059] hover:bg-[#B89953] text-white font-medium disabled:opacity-50 active:scale-95 transition-transform"
          >
            {saving ? "Lagrer..." : "Lagre"}
          </button>
        </div>
      )}

      {loading ? (
        <div className="text-center text-[#6B655B] py-8 text-sm">Laster...</div>
      ) : (
        <div className="space-y-3" data-testid="admin-offers-list">
          {offers.map((o) => (
            <div
              key={o.id}
              className="bg-white rounded-3xl p-4 border border-[#EBE5DC]/60 flex gap-3"
              data-testid={`admin-offer-${o.id}`}
            >
              <img
                src={o.image_url}
                alt=""
                className="w-20 h-20 rounded-2xl object-cover bg-[#F4F0EA] shrink-0"
              />
              <div className="flex-1 min-w-0">
                <div className="font-serif-display text-lg text-[#2C2A26] truncate">
                  {o.title}
                </div>
                <div className="text-xs text-[#6B655B] truncate">{o.description}</div>
                <div className="text-sm text-[#B89953] mt-1">{o.price}</div>
              </div>
              <div className="flex flex-col gap-2">
                <button
                  onClick={() => startEdit(o)}
                  data-testid={`offer-edit-${o.id}`}
                  className="p-2 rounded-full bg-[#F4ECD8] text-[#B89953] active:scale-95"
                >
                  <Pencil size={14} strokeWidth={1.75} />
                </button>
                <button
                  onClick={() => remove(o.id)}
                  data-testid={`offer-delete-${o.id}`}
                  className="p-2 rounded-full bg-[#FCE8E8] text-[#9E4747] active:scale-95"
                >
                  <Trash2 size={14} strokeWidth={1.75} />
                </button>
              </div>
            </div>
          ))}
          {offers.length === 0 && (
            <div className="text-center text-[#6B655B] py-8 text-sm">
              Ingen tilbud ennå. Trykk «Legg til nytt tilbud».
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function FormField({ label, children }) {
  return (
    <div className="mb-4">
      <label className="text-[10px] tracking-[0.2em] uppercase text-[#6B655B] block mb-2">
        {label}
      </label>
      {children}
    </div>
  );
}

/* ===== Image Uploader ===== */
function ImageUploader({ value, onChange }) {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [mode, setMode] = useState(value ? "preview" : "upload");
  const inputRef = useRef(null);

  const handleFile = async (file) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Vennligst velg en bildefil");
      return;
    }
    setUploading(true);
    setProgress(0);
    try {
      const res = await uploadImage(file, (e) => {
        if (e.total) setProgress(Math.round((e.loaded * 100) / e.total));
      });
      onChange(res.full_url);
      setMode("preview");
      toast.success("Bilde lastet opp");
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Opplasting feilet");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div data-testid="offer-image-uploader">
      <div className="flex items-center gap-2 mb-2">
        <button
          type="button"
          onClick={() => setMode("upload")}
          className={`text-xs px-3 py-1.5 rounded-full ${mode === "upload" ? "bg-[#C5A059] text-white" : "bg-[#F4F0EA] text-[#6B655B]"}`}
        >
          Last opp
        </button>
        <button
          type="button"
          onClick={() => setMode("url")}
          className={`text-xs px-3 py-1.5 rounded-full ${mode === "url" ? "bg-[#C5A059] text-white" : "bg-[#F4F0EA] text-[#6B655B]"}`}
        >
          Bruk URL
        </button>
      </div>

      {mode === "upload" && (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          data-testid="offer-image-upload-button"
          className="w-full border-2 border-dashed border-[#C5A059]/40 bg-[#FDFBF7] rounded-2xl p-6 flex flex-col items-center gap-2 hover:border-[#C5A059] transition-colors disabled:opacity-60"
        >
          <Upload size={22} strokeWidth={1.5} className="text-[#B89953]" />
          <span className="text-sm text-[#6B655B]">
            {uploading ? `Laster opp... ${progress}%` : "Trykk for å velge bilde"}
          </span>
          <span className="text-[10px] text-[#9C968C]">JPG/PNG/WEBP, maks 8MB</span>
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            capture="environment"
            data-testid="offer-image-file-input"
            className="hidden"
            onChange={(e) => handleFile(e.target.files?.[0])}
          />
        </button>
      )}

      {mode === "url" && (
        <Input
          value={value || ""}
          onChange={(e) => onChange(e.target.value)}
          placeholder="https://..."
          className="rounded-2xl h-11 border-[#EBE5DC]"
          data-testid="offer-input-image"
        />
      )}

      {value && (
        <div className="mt-3 rounded-2xl overflow-hidden border border-[#EBE5DC]">
          <img src={value} alt="preview" className="promo-img" />
        </div>
      )}
    </div>
  );
}

/* ===== History Tab ===== */
function HistoryTab() {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState(null);
  const [history, setHistory] = useState(null);
  const [histLoading, setHistLoading] = useState(false);

  useEffect(() => {
    listLoyalty()
      .then(setList)
      .catch(() => toast.error("Kunne ikke laste kunder"))
      .finally(() => setLoading(false));
  }, []);

  const open = async (deviceId) => {
    setSelected(deviceId);
    setHistory(null);
    setHistLoading(true);
    try {
      const data = await getLoyaltyHistory(deviceId);
      setHistory(data);
    } catch {
      toast.error("Kunne ikke laste historikk");
    } finally {
      setHistLoading(false);
    }
  };

  const filtered = list.filter((c) =>
    c.device_id.toLowerCase().includes(query.toLowerCase())
  );

  if (selected) {
    return (
      <div className="space-y-4" data-testid="history-detail">
        <button
          onClick={() => {
            setSelected(null);
            setHistory(null);
          }}
          className="flex items-center gap-2 text-sm text-[#6B655B] hover:text-[#2C2A26]"
          data-testid="history-back"
        >
          <ArrowLeft size={16} strokeWidth={1.5} /> Tilbake til kundeliste
        </button>

        {histLoading ? (
          <div className="text-center py-8 text-[#6B655B] text-sm">Laster historikk...</div>
        ) : history ? (
          <>
            <div className="bg-white rounded-3xl p-5 border border-[#EBE5DC]/60">
              <div className="flex items-center justify-between mb-2">
                <div className="font-serif-display text-2xl text-[#2C2A26]">Kunde</div>
                <span className="text-xs bg-[#F4ECD8] text-[#8C6B2F] px-3 py-1 rounded-full">
                  {history.card.stamps}/10 • {history.card.total_completed} fullført
                </span>
              </div>
              <p className="text-[10px] uppercase tracking-[0.2em] text-[#9C968C]">ID</p>
              <p className="text-xs font-mono text-[#6B655B] break-all mt-1">
                {history.card.device_id}
              </p>
            </div>

            <div className="bg-white rounded-3xl p-5 border border-[#EBE5DC]/60">
              <h3 className="font-serif-display text-xl text-[#2C2A26] mb-4">Aktivitet</h3>
              {history.events.length === 0 ? (
                <p className="text-sm text-[#6B655B]">Ingen hendelser ennå.</p>
              ) : (
                <ul className="space-y-3" data-testid="history-events">
                  {history.events.map((ev) => (
                    <li key={ev.id} className="flex items-start gap-3 pb-3 border-b border-[#EBE5DC] last:border-0">
                      <div
                        className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${
                          ev.type === "reset"
                            ? "bg-[#FCE8E8] text-[#9E4747]"
                            : ev.milestone
                            ? "bg-[#C5A059] text-white"
                            : "bg-[#F4ECD8] text-[#B89953]"
                        }`}
                      >
                        {ev.type === "reset" ? (
                          <RefreshCw size={14} strokeWidth={1.75} />
                        ) : ev.milestone ? (
                          <Sparkles size={14} strokeWidth={1.75} />
                        ) : (
                          <Check size={14} strokeWidth={2} />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm text-[#2C2A26]">
                          {ev.type === "reset"
                            ? "Kort tilbakestilt"
                            : ev.milestone
                            ? `Stempel #${ev.stamps_after} — milepæl: ${ev.milestone}`
                            : `Stempel #${ev.stamps_after}`}
                        </div>
                        <div className="text-[10px] text-[#9C968C] mt-0.5">
                          {new Date(ev.created_at).toLocaleString("no-NO")}
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </>
        ) : null}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#9C968C]" strokeWidth={1.5} />
        <Input
          placeholder="Søk etter kunde-ID..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          data-testid="history-search"
          className="pl-10 rounded-2xl h-12 border-[#EBE5DC] bg-white"
        />
      </div>

      {loading ? (
        <div className="text-center py-8 text-[#6B655B] text-sm">Laster...</div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-3xl p-8 text-center border border-[#EBE5DC]/60 text-[#6B655B] text-sm">
          Ingen kunder ennå. Skann et lojalitetskort for å starte.
        </div>
      ) : (
        <div className="space-y-2" data-testid="history-list">
          {filtered.map((c) => (
            <button
              key={c.device_id}
              onClick={() => open(c.device_id)}
              data-testid={`history-row-${c.device_id}`}
              className="w-full bg-white rounded-2xl p-4 border border-[#EBE5DC]/60 flex items-center gap-3 hover:bg-[#FDFBF7] active:scale-[0.99] transition-all text-left"
            >
              <div className="w-10 h-10 rounded-full bg-[#F4ECD8] flex items-center justify-center shrink-0">
                <History size={16} strokeWidth={1.5} className="text-[#B89953]" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-xs font-mono text-[#6B655B] truncate">{c.device_id}</div>
                <div className="text-[10px] text-[#9C968C] mt-0.5">
                  {c.last_stamped_at
                    ? `Sist: ${new Date(c.last_stamped_at).toLocaleDateString("no-NO")}`
                    : "Ingen stempler ennå"}
                </div>
              </div>
              <span className="text-xs bg-[#F4ECD8] text-[#8C6B2F] px-3 py-1 rounded-full shrink-0">
                {c.stamps}/10
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
