import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { CalendarCheck, Gift, Sparkles, ArrowRight } from "lucide-react";
import { listOffers } from "@/lib/api";
import OfferCard from "@/components/OfferCard";

export default function Hjem() {
  const [offers, setOffers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    listOffers()
      .then((data) => {
        if (!mounted) return;

        const normalizedOffers = Array.isArray(data)
          ? data
          : Array.isArray(data?.offers)
            ? data.offers
            : [];

        setOffers(normalizedOffers);
      })
      .catch(() => mounted && setOffers([]))
      .finally(() => mounted && setLoading(false));

    return () => {
      mounted = false;
    };
  }, []);

  const safeOffers = Array.isArray(offers) ? offers : [];

  return (
    <div data-testid="page-hjem">
      {/* Hero */}
      <section className="pt-12 pb-8 px-6 text-center fade-up">
        <h1 className="font-serif-display text-5xl text-[#2C2A26] leading-none">
          Seldaesthetic
        </h1>
        <div className="flex items-center justify-center gap-3 mt-3">
          <span className="h-px w-6 bg-[#C5A059]/60" />
          <span className="text-[10px] tracking-[0.35em] uppercase text-[#6B655B]">
            Skjønnhetsklinikk
          </span>
          <span className="h-px w-6 bg-[#C5A059]/60" />
        </div>
      </section>

      {/* Quick actions */}
      <section className="px-5 grid grid-cols-2 gap-4 mb-10">
        <Link
          to="/bestill"
          data-testid="quick-bestill"
          className="bg-white rounded-3xl p-5 border border-[#EBE5DC]/60 shadow-[0_4px_24px_rgba(44,42,38,0.05)] active:scale-95 transition-transform no-tap-highlight"
        >
          <div className="w-12 h-12 rounded-full bg-[#F4ECD8] flex items-center justify-center mb-4">
            <CalendarCheck size={20} strokeWidth={1.5} className="text-[#B89953]" />
          </div>
          <h3 className="font-serif-display text-xl text-[#2C2A26] leading-tight">
            Bestill Time
          </h3>
          <p className="text-xs text-[#6B655B] mt-1">Book din behandling</p>
          <ArrowRight size={16} strokeWidth={1.5} className="text-[#C5A059] mt-3" />
        </Link>

        <Link
          to="/gavekort"
          data-testid="quick-gavekort"
          className="bg-white rounded-3xl p-5 border border-[#EBE5DC]/60 shadow-[0_4px_24px_rgba(44,42,38,0.05)] active:scale-95 transition-transform no-tap-highlight"
        >
          <div className="w-12 h-12 rounded-full bg-[#F4ECD8] flex items-center justify-center mb-4">
            <Gift size={20} strokeWidth={1.5} className="text-[#B89953]" />
          </div>
          <h3 className="font-serif-display text-xl text-[#2C2A26] leading-tight">
            Kjøp Gavekort
          </h3>
          <p className="text-xs text-[#6B655B] mt-1">Gi bort velvære</p>
          <ArrowRight size={16} strokeWidth={1.5} className="text-[#C5A059] mt-3" />
        </Link>
      </section>

      {/* Offers */}
      <section className="px-5 mb-12">
        <div className="flex items-center gap-2 mb-5 px-1">
          <Sparkles size={20} strokeWidth={1.5} className="text-[#C5A059]" />
          <h2 className="font-serif-display text-3xl text-[#2C2A26]">Aktuelle Tilbud</h2>
        </div>

        {loading ? (
          <div className="space-y-4">
            {[0, 1].map((i) => (
              <div
                key={i}
                className="bg-white rounded-3xl overflow-hidden border border-[#EBE5DC]/60 animate-pulse"
              >
                <div className="aspect-[16/9] bg-[#F4F0EA]" />
                <div className="p-5 space-y-3">
                  <div className="h-5 bg-[#F4F0EA] rounded w-2/3" />
                  <div className="h-3 bg-[#F4F0EA] rounded w-full" />
                  <div className="h-3 bg-[#F4F0EA] rounded w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : safeOffers.length === 0 ? (
          <div className="bg-white rounded-3xl p-8 text-center border border-[#EBE5DC]/60">
            <p className="text-[#6B655B] text-sm">Ingen aktuelle tilbud akkurat nå.</p>
          </div>
        ) : (
          <div className="space-y-4" data-testid="offers-list">
            {safeOffers.map((o, i) => (
              <OfferCard key={o.id ?? i} offer={o} index={i} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
