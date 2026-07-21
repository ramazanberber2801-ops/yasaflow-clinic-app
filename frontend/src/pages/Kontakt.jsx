import { useEffect, useState } from "react";
import { MessageCircle, MapPin, Phone, Clock, Navigation, Instagram } from "lucide-react";
import Header from "@/components/Header";
import { DEFAULT_CLINIC_SETTINGS, getClinicSettings } from "@/lib/clinicSettings";

export default function Kontakt() {
  const [settings, setSettings] = useState(DEFAULT_CLINIC_SETTINGS);

  useEffect(() => {
    getClinicSettings().then(setSettings).catch(() => {});
  }, []);

  const mapsQuery = encodeURIComponent(settings.address);
  const phoneHref = settings.phone.replace(/\s/g, "");
  const hours = settings.opening_hours.split("\n").filter(Boolean);

  return (
    <div data-testid="page-kontakt">
      <Header title="Kontakt Oss" subtitle="Vi er her for å hjelpe deg" icon={MessageCircle} />

      <div className="px-5 mt-6 space-y-4">
        <div className="bg-white rounded-3xl p-6 border border-[#EBE5DC]/60 shadow-[0_4px_24px_rgba(44,42,38,0.05)]">
          <div className="flex flex-col items-center text-center pb-5 border-b border-[#EBE5DC]">
            <div className="w-16 h-16 rounded-full bg-[#F4ECD8] flex items-center justify-center mb-3">
              <span className="font-serif-display text-3xl text-[#B89953] -mt-0.5">{settings.clinic_name.charAt(0) || "S"}</span>
            </div>
            <h2 className="font-serif-display text-3xl text-[#2C2A26]">{settings.clinic_name}</h2>
            <div className="flex items-center gap-3 mt-2">
              <span className="h-px w-5 bg-[#C5A059]/60" />
              <span className="text-[10px] tracking-[0.3em] uppercase text-[#6B655B]">{settings.subtitle}</span>
              <span className="h-px w-5 bg-[#C5A059]/60" />
            </div>
          </div>

          <InfoRow icon={MapPin} label="Adresse" value={settings.address} />
          <InfoRow icon={Phone} label="Telefon" value={settings.phone} />
          <InfoRow icon={Clock} label="Åpningstider" value={<>{hours.map((line) => <div key={line}>{line}</div>)}</>} />
        </div>

        <a href={`tel:${phoneHref}`} data-testid="contact-call-button" className="block bg-[#C5A059] hover:bg-[#B89953] text-white rounded-3xl p-5 shadow-[0_8px_24px_rgba(197,160,89,0.25)] active:scale-[0.98] transition-transform">
          <div className="flex items-center gap-4"><div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center shrink-0"><Phone size={20} strokeWidth={1.75} /></div><div><div className="font-serif-display text-xl leading-none">Ring oss</div><div className="text-xs opacity-90 mt-1">Kontakt oss direkte</div></div></div>
        </a>

        <a href={`https://www.google.com/maps/search/?api=1&query=${mapsQuery}`} target="_blank" rel="noreferrer" data-testid="contact-maps-button" className="block bg-white rounded-3xl p-5 border border-[#EBE5DC]/60 shadow-[0_4px_24px_rgba(44,42,38,0.05)] active:scale-[0.98] transition-transform">
          <div className="flex items-center gap-4"><div className="w-12 h-12 rounded-full bg-[#F4ECD8] flex items-center justify-center shrink-0"><Navigation size={20} strokeWidth={1.5} className="text-[#B89953]" /></div><div><div className="font-medium text-[#2C2A26]">Finn frem</div><div className="text-xs text-[#6B655B] mt-0.5">Åpne i kart</div></div></div>
        </a>

        <a href={settings.instagram_url} target="_blank" rel="noreferrer" data-testid="contact-instagram-button" className="block bg-white rounded-3xl p-5 border border-[#EBE5DC]/60 shadow-[0_4px_24px_rgba(44,42,38,0.05)] active:scale-[0.98] transition-transform">
          <div className="flex items-center gap-4"><div className="w-12 h-12 rounded-full bg-[#F4ECD8] flex items-center justify-center shrink-0"><Instagram size={20} strokeWidth={1.5} className="text-[#B89953]" /></div><div><div className="font-medium text-[#2C2A26]">Følg oss på Instagram</div><div className="text-xs text-[#6B655B] mt-0.5">{settings.instagram_handle}</div></div></div>
        </a>

        <div className="rounded-3xl overflow-hidden border border-[#EBE5DC]/60 shadow-[0_4px_24px_rgba(44,42,38,0.05)]">
          <iframe title={`${settings.clinic_name} kart`} src={`https://www.google.com/maps?q=${mapsQuery}&output=embed`} style={{ width: "100%", height: "240px", border: "none" }} loading="lazy" data-testid="contact-map-iframe" />
        </div>
      </div>
    </div>
  );
}

function InfoRow({ icon: Icon, label, value }) {
  return <div className="flex items-start gap-4 pt-5"><div className="w-10 h-10 rounded-full bg-[#F4ECD8] flex items-center justify-center shrink-0"><Icon size={16} strokeWidth={1.5} className="text-[#B89953]" /></div><div className="flex-1"><div className="text-[10px] tracking-[0.25em] uppercase text-[#9C968C]">{label}</div><div className="text-[#2C2A26] mt-1 leading-relaxed">{value}</div></div></div>;
}
