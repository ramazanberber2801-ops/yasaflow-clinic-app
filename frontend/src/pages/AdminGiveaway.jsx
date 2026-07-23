import { useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowLeft,
  Download,
  Film,
  Gift,
  Instagram,
  Loader2,
  RefreshCw,
  Sparkles,
  Trash2,
  Upload,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import {
  createGiveawaySession,
  deleteGiveawaySession,
  fetchPublicInstagramComments,
  updateGiveawaySession,
} from "@/lib/giveaways";

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const validInstagramUrl = (value) => /^https?:\/\/(www\.)?instagram\.com\/(p|reel|reels|tv)\/[A-Za-z0-9_-]+/i.test(value.trim());

function parseEntries(raw) {
  return raw
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [usernamePart, ...commentParts] = line.split("|");
      return {
        username: usernamePart.trim().replace(/^@/, ""),
        comment: commentParts.join("|").trim(),
      };
    })
    .filter((entry) => entry.username);
}

function filterEntries(entries, { uniqueUsers, requiredWord, excludedUsers }) {
  const blocked = new Set(
    excludedUsers
      .split(/[\s,]+/)
      .map((value) => value.trim().replace(/^@/, "").toLowerCase())
      .filter(Boolean)
  );
  const required = requiredWord.trim().toLowerCase();
  const filtered = entries.filter((entry) => {
    if (blocked.has(entry.username.toLowerCase())) return false;
    return !required || entry.comment.toLowerCase().includes(required);
  });
  if (!uniqueUsers) return filtered;
  const seen = new Set();
  return filtered.filter((entry) => {
    const key = entry.username.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function securePick(items, count) {
  const pool = [...items];
  const selected = [];
  while (pool.length && selected.length < count) {
    const value = new Uint32Array(1);
    crypto.getRandomValues(value);
    selected.push(pool.splice(value[0] % pool.length, 1)[0]);
  }
  return selected;
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function drawVideoFrame(ctx, canvas, { title, names, footer, progress }) {
  const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
  gradient.addColorStop(0, "#2C2A26");
  gradient.addColorStop(1, "#8D7139");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "rgba(255,255,255,0.08)";
  for (let index = 0; index < 20; index += 1) {
    ctx.beginPath();
    ctx.arc((index * 173) % canvas.width, ((index * 251) % canvas.height) + Math.sin(progress * 8 + index) * 30, 10 + index % 4 * 4, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.textAlign = "center";
  ctx.fillStyle = "#D4B36A";
  ctx.font = "600 38px sans-serif";
  ctx.fillText("YASAFLOW", canvas.width / 2, 150);
  ctx.fillStyle = "#FFFFFF";
  ctx.font = "700 64px serif";
  ctx.fillText(title, canvas.width / 2, 320);
  const startY = canvas.height / 2 - ((names.length - 1) * 82) / 2;
  names.forEach((name, index) => {
    ctx.font = "700 54px serif";
    ctx.fillText(name.startsWith("@") ? name : `@${name}`, canvas.width / 2, startY + index * 82);
  });
  ctx.fillStyle = "rgba(255,255,255,0.7)";
  ctx.font = "26px sans-serif";
  ctx.fillText(footer, canvas.width / 2, canvas.height - 130);
}

export default function AdminGiveaway() {
  const fileInputRef = useRef(null);
  const [instagramUrl, setInstagramUrl] = useState("");
  const [participantsText, setParticipantsText] = useState("");
  const [uniqueUsers, setUniqueUsers] = useState(true);
  const [requiredWord, setRequiredWord] = useState("");
  const [excludedUsers, setExcludedUsers] = useState("");
  const [winnerCount, setWinnerCount] = useState(1);
  const [reserveCount, setReserveCount] = useState(1);
  const [session, setSession] = useState(null);
  const [winners, setWinners] = useState([]);
  const [reserves, setReserves] = useState([]);
  const [rollingName, setRollingName] = useState("");
  const [countdown, setCountdown] = useState(null);
  const [drawing, setDrawing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [fetchLoading, setFetchLoading] = useState(false);
  const [videoLoading, setVideoLoading] = useState(false);
  const [fetchInfo, setFetchInfo] = useState(null);

  const parsedEntries = useMemo(() => parseEntries(participantsText), [participantsText]);
  const qualifiedEntries = useMemo(
    () => filterEntries(parsedEntries, { uniqueUsers, requiredWord, excludedUsers }),
    [parsedEntries, uniqueUsers, requiredWord, excludedUsers]
  );
  const participants = qualifiedEntries.map((entry) => entry.username);

  const fetchComments = async () => {
    if (!validInstagramUrl(instagramUrl)) return toast.error("Lim inn en gyldig offentlig Instagram-lenke");
    setFetchLoading(true);
    setFetchInfo(null);
    try {
      const result = await fetchPublicInstagramComments(instagramUrl);
      if (!result.comments.length) throw new Error("Fant ingen offentlige kommentarer");
      const lines = result.comments.map(({ username, comment }) => {
        const cleanComment = String(comment || "").replace(/\s+/g, " ").replace(/\|/g, "/").trim();
        return `${String(username).replace(/^@/, "")} | ${cleanComment}`;
      });
      setParticipantsText(lines.join("\n"));
      setFetchInfo({ count: result.count, truncated: result.truncated });
      toast.success(`${result.count} kommentarer hentet`);
    } catch (error) {
      toast.error(error.message || "Kunne ikke hente kommentarer. Bruk manuell import.");
    } finally {
      setFetchLoading(false);
    }
  };

  const startSession = async () => {
    if (!validInstagramUrl(instagramUrl)) return toast.error("Lim inn en gyldig offentlig Instagram-lenke");
    if (!participants.length) return toast.error("Legg inn minst én kvalifisert deltaker");
    if (winnerCount + reserveCount > participants.length) return toast.error("Det er færre deltakere enn vinnere og reserver");
    setLoading(true);
    try {
      const created = await createGiveawaySession({
        instagramUrl,
        rules: {
          unique_users: uniqueUsers,
          winner_count: winnerCount,
          reserve_count: reserveCount,
          required_word: requiredWord.trim(),
          excluded_users: excludedUsers,
          source: fetchInfo ? "public_url_experimental" : "manual_import",
        },
        participants,
      });
      setSession(created);
      setWinners([]);
      setReserves([]);
      toast.success("Giveaway klar. Data slettes automatisk etter 12 timer.");
    } catch (error) {
      toast.error(error.message || "Kunne ikke opprette giveaway");
    } finally {
      setLoading(false);
    }
  };

  const runDraw = async () => {
    if (!session || drawing) return;
    setDrawing(true);
    setWinners([]);
    setReserves([]);
    for (let value = 3; value >= 1; value -= 1) {
      setCountdown(value);
      await sleep(700);
    }
    setCountdown(null);
    for (let index = 0; index < 28; index += 1) {
      const value = new Uint32Array(1);
      crypto.getRandomValues(value);
      setRollingName(participants[value[0] % participants.length]);
      await sleep(45 + index * 4);
    }
    const selected = securePick(participants, winnerCount + reserveCount);
    const nextWinners = selected.slice(0, winnerCount);
    const nextReserves = selected.slice(winnerCount);
    setRollingName("");
    setWinners(nextWinners);
    setReserves(nextReserves);
    try {
      const updated = await updateGiveawaySession(session.id, {
        winner_data: { winners: nextWinners, reserves: nextReserves, drawn_at: new Date().toISOString() },
      });
      setSession(updated);
    } catch (error) {
      toast.error(error.message || "Resultatet kunne ikke lagres midlertidig");
    } finally {
      setDrawing(false);
    }
  };

  const downloadResult = () => {
    if (!winners.length) return toast.error("Trekk en vinner først");
    const content = [
      "Yasaflow Giveaway",
      `Instagram: ${instagramUrl}`,
      `Kvalifiserte: ${participants.length}`,
      `Vinnere: ${winners.map((winner) => `@${winner}`).join(", ")}`,
      reserves.length ? `Reserver: ${reserves.map((reserve) => `@${reserve}`).join(", ")}` : "",
      `Dato: ${new Date().toLocaleString("no-NO")}`,
      "Filen er lagret lokalt. Yasaflow beholder ingen filkopi.",
    ].filter(Boolean).join("\n");
    downloadBlob(new Blob([content], { type: "text/plain;charset=utf-8" }), `yasaflow-giveaway-${Date.now()}.txt`);
  };

  const createLocalVideo = async () => {
    if (!winners.length) return toast.error("Trekk en vinner først");
    if (!window.MediaRecorder || !HTMLCanvasElement.prototype.captureStream) return toast.error("Bruk Chrome eller Edge for lokal video");
    setVideoLoading(true);
    try {
      const canvas = document.createElement("canvas");
      canvas.width = 720;
      canvas.height = 1280;
      const ctx = canvas.getContext("2d");
      const stream = canvas.captureStream(30);
      const mimeType = MediaRecorder.isTypeSupported("video/webm;codecs=vp9") ? "video/webm;codecs=vp9" : "video/webm";
      const recorder = new MediaRecorder(stream, { mimeType, videoBitsPerSecond: 5_000_000 });
      const chunks = [];
      recorder.ondataavailable = (event) => event.data.size && chunks.push(event.data);
      const finished = new Promise((resolve) => { recorder.onstop = resolve; });
      recorder.start();
      const duration = 4200;
      const startedAt = performance.now();
      await new Promise((resolve) => {
        const render = (now) => {
          const elapsed = now - startedAt;
          const progress = Math.min(1, elapsed / duration);
          drawVideoFrame(ctx, canvas, {
            title: elapsed < 1300 ? "Trekningen starter" : "Gratulerer!",
            names: elapsed < 1300 ? [String(Math.max(1, 3 - Math.floor(elapsed / 430)))] : winners,
            footer: "Privacy First Giveaway • ingen video lagres hos Yasaflow",
            progress,
          });
          if (progress < 1) requestAnimationFrame(render); else resolve();
        };
        requestAnimationFrame(render);
      });
      recorder.stop();
      await finished;
      downloadBlob(new Blob(chunks, { type: mimeType }), `yasaflow-giveaway-${Date.now()}.webm`);
      toast.success("Videoen er laget og lagret lokalt");
    } catch (error) {
      toast.error(error.message || "Kunne ikke lage lokal video");
    } finally {
      setVideoLoading(false);
    }
  };

  const importFile = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) return toast.error("Filen kan ikke være større enn 2 MB");
    setParticipantsText(await file.text());
    setFetchInfo(null);
    event.target.value = "";
  };

  const removeSession = async () => {
    if (!session) return;
    try {
      await deleteGiveawaySession(session.id);
      setSession(null);
      setWinners([]);
      setReserves([]);
      toast.success("Giveaway-data er slettet nå");
    } catch (error) {
      toast.error(error.message || "Kunne ikke slette giveaway-data");
    }
  };

  return (
    <main className="min-h-screen bg-[#F7F3EC] px-5 py-6 text-[#2C2A26]">
      <div className="mx-auto max-w-3xl">
        <Link to="/admin" className="inline-flex items-center gap-2 text-sm text-[#6B655B]"><ArrowLeft size={17} /> Tilbake</Link>

        <section className="mt-5 rounded-[32px] bg-[#2C2A26] p-7 text-white shadow-xl">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10"><Instagram size={24} className="text-[#D4B36A]" /></div>
            <div><p className="text-xs uppercase tracking-[0.25em] text-white/55">Privacy First</p><h1 className="font-serif-display text-3xl">Instagram Giveaway</h1></div>
          </div>
          <p className="mt-4 max-w-2xl text-sm leading-6 text-white/65">Lim inn en offentlig post-URL og prøv automatisk kommentarhenting uten Instagram-innlogging. Data slettes etter 12 timer.</p>
        </section>

        <section className="mt-6 rounded-3xl border border-[#EBE5DC] bg-white p-5 shadow-sm">
          <label className="text-sm font-medium">Offentlig Instagram-innlegg</label>
          <input value={instagramUrl} onChange={(event) => { setInstagramUrl(event.target.value); setFetchInfo(null); }} placeholder="https://www.instagram.com/p/..." className="mt-2 w-full rounded-2xl border border-[#DED6CA] px-4 py-3 outline-none focus:border-[#C5A059]" />
          <button onClick={fetchComments} disabled={fetchLoading} className="mt-3 flex w-full items-center justify-center gap-2 rounded-full bg-[#C5A059] px-5 py-3 text-sm font-medium text-white disabled:opacity-50">
            {fetchLoading ? <Loader2 size={17} className="animate-spin" /> : <Instagram size={17} />}
            {fetchLoading ? "Henter offentlige kommentarer..." : "Hent kommentarer fra URL"}
          </button>
          <p className="mt-2 text-xs text-[#6B655B]">Eksperimentell funksjon. Hvis Instagram ikke viser kommentarene offentlig, kan du fortsatt bruke fil eller manuell innliming.</p>
          {fetchInfo && <div className="mt-3 rounded-2xl bg-green-50 px-4 py-3 text-sm text-green-800">{fetchInfo.count} kommentarer hentet{fetchInfo.truncated ? " (maksgrense nådd)" : ""}.</div>}

          <div className="mt-5 flex items-center justify-between gap-3">
            <div><label className="block text-sm font-medium">Deltakere eller kommentarer</label><p className="mt-1 text-xs text-[#6B655B]">Format: <strong>brukernavn | kommentar</strong></p></div>
            <button onClick={() => fileInputRef.current?.click()} className="inline-flex shrink-0 items-center gap-2 rounded-full border border-[#DED6CA] px-3 py-2 text-xs"><Upload size={15} /> Importer fil</button>
            <input ref={fileInputRef} type="file" accept=".txt,.csv,text/plain,text/csv" onChange={importFile} className="hidden" />
          </div>
          <textarea value={participantsText} onChange={(event) => { setParticipantsText(event.target.value); setFetchInfo(null); }} rows={10} placeholder={"seldaesthetic | jeg deltar\nmedina | med min venn"} className="mt-2 w-full rounded-2xl border border-[#DED6CA] px-4 py-3 outline-none focus:border-[#C5A059]" />

          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <label className="flex items-center justify-between rounded-2xl bg-[#F7F3EC] p-4 text-sm">Én bruker = én sjanse<input type="checkbox" checked={uniqueUsers} onChange={(event) => setUniqueUsers(event.target.checked)} /></label>
            <label className="rounded-2xl bg-[#F7F3EC] p-4 text-sm">Kommentar må inneholde<input value={requiredWord} onChange={(event) => setRequiredWord(event.target.value)} placeholder="Valgfritt ord" className="mt-2 w-full rounded-xl border border-[#DED6CA] bg-white px-3 py-2" /></label>
            <label className="rounded-2xl bg-[#F7F3EC] p-4 text-sm">Antall vinnere<input type="number" min="1" max="10" value={winnerCount} onChange={(event) => setWinnerCount(Math.max(1, Math.min(10, Number(event.target.value) || 1)))} className="mt-2 w-full rounded-xl border border-[#DED6CA] bg-white px-3 py-2" /></label>
            <label className="rounded-2xl bg-[#F7F3EC] p-4 text-sm">Antall reserver<input type="number" min="0" max="10" value={reserveCount} onChange={(event) => setReserveCount(Math.max(0, Math.min(10, Number(event.target.value) || 0)))} className="mt-2 w-full rounded-xl border border-[#DED6CA] bg-white px-3 py-2" /></label>
          </div>
          <label className="mt-4 block text-sm font-medium">Ekskluder brukere</label>
          <input value={excludedUsers} onChange={(event) => setExcludedUsers(event.target.value)} placeholder="egenkonto, ansatt1, @ansatt2" className="mt-2 w-full rounded-2xl border border-[#DED6CA] px-4 py-3 outline-none focus:border-[#C5A059]" />
          <div className="mt-5 flex flex-wrap items-center gap-4 text-sm text-[#6B655B]"><span className="inline-flex items-center gap-2"><Users size={17} /> {qualifiedEntries.length} kvalifiserte</span><span>{parsedEntries.length - qualifiedEntries.length} filtrert bort</span></div>
          <button onClick={startSession} disabled={loading || drawing} className="mt-5 flex w-full items-center justify-center gap-2 rounded-full bg-[#2C2A26] px-5 py-3.5 text-sm text-white disabled:opacity-50"><Gift size={18} /> {loading ? "Oppretter..." : "Opprett giveaway"}</button>
        </section>

        {session && (
          <section className="mt-6 overflow-hidden rounded-3xl border border-[#EBE5DC] bg-white p-5 text-center shadow-sm">
            <Sparkles size={28} className="mx-auto text-[#C5A059]" /><h2 className="mt-3 font-serif-display text-2xl">Klar for trekning</h2><p className="mt-2 text-sm text-[#6B655B]">Data utløper {new Date(session.expires_at).toLocaleString("no-NO")}.</p>
            <AnimatePresence mode="wait">
              {countdown !== null && <motion.div key={countdown} initial={{ scale: 0.35, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 1.6, opacity: 0 }} className="my-8 font-serif-display text-8xl text-[#C5A059]">{countdown}</motion.div>}
              {rollingName && countdown === null && <motion.div key={rollingName} initial={{ y: 24, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -24, opacity: 0 }} className="my-8 rounded-3xl bg-[#F7F3EC] p-7 font-serif-display text-4xl">@{rollingName}</motion.div>}
            </AnimatePresence>
            {!drawing && <button onClick={runDraw} className="mt-5 flex w-full items-center justify-center gap-2 rounded-full bg-[#C5A059] px-5 py-4 text-base font-medium text-white">{winners.length ? <RefreshCw size={18} /> : <Sparkles size={18} />}{winners.length ? "Trekk på nytt" : `Trekk vinner${winnerCount > 1 ? "e" : ""}`}</button>}
            {winners.length > 0 && !drawing && (
              <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="mt-5 rounded-3xl bg-[#F7F3EC] p-6">
                <p className="text-xs uppercase tracking-[0.2em] text-[#8D7139]">Vinner{winners.length > 1 ? "e" : ""}</p><div className="mt-3 space-y-2 font-serif-display text-3xl">{winners.map((winner) => <div key={winner}>@{winner}</div>)}</div>
                {reserves.length > 0 && <div className="mt-5 border-t border-[#DED6CA] pt-4"><p className="text-xs uppercase tracking-[0.18em] text-[#6B655B]">Reserver</p><div className="mt-2 space-y-1 text-lg">{reserves.map((reserve) => <div key={reserve}>@{reserve}</div>)}</div></div>}
                <div className="mt-5 flex flex-wrap justify-center gap-3"><button onClick={downloadResult} className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-3 text-sm shadow-sm"><Download size={17} /> Lagre resultat</button><button onClick={createLocalVideo} disabled={videoLoading} className="inline-flex items-center gap-2 rounded-full bg-[#2C2A26] px-4 py-3 text-sm text-white disabled:opacity-50"><Film size={17} /> {videoLoading ? "Lager video..." : "Lag 9:16-video"}</button></div>
              </motion.div>
            )}
            <button onClick={removeSession} className="mt-5 inline-flex items-center gap-2 text-sm text-red-600"><Trash2 size={17} /> Slett giveaway-data nå</button>
          </section>
        )}
      </div>
    </main>
  );
}
