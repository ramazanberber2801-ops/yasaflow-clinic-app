import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { CalendarCheck, Gift, Sparkles, ArrowRight, Stamp } from "lucide-react";
import { listOffers } from "@/lib/api";
import OfferCard from "@/components/OfferCard";
import { useClinicSettings } from "@/contexts/ClinicSettingsContext";

export default function Hjem() {
  const { settings } = useClinicSettings();
  const [offers, setOffers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!settings.campaigns_enabled) {
      setOffers([]);
      setLoading(false);
      return undefined;
    }

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
  }, [settings.campaigns_enabled]);

  const safeOffers = Array.isArray(offers) ? offers : [];
  const quickActions = [
    settings.loyalty_enabled && {
      to: "/lojalitet",
      testId: "quick-lojalitet",
      icon: Stamp,
      title: "Mitt lojalitetskort",
      description: "Se stempler og belønninger",
      featured: true,
    },
    settings.booking_enabled && {
      to: "/bestill",
      testId: "quick-bestill",
      icon: CalendarCheck,
      title: "Bestill time",
      description: "Bestill hos klinikken",
    },
    settings.gift_card_enabled && {
      to: "/gavekort",
      testId: "quick-gavekort",
      icon: Gift,
      title: "Kjøp gavekort",
      description: "Gi bort velvære",
    },
  ].filter(Boolean);

  return (
    <div data-testid="page-hjem">
      <section className="px-6 pb-8 pt-12 text-center fade-up">
        <h1 className="font-serif-display text-5xl leading-none text-[#2C2A26]">
          {settings.clinic_name || "Klinikk"}
        </h1>
        {settings.subtitle && (
          <div className="mt-3 flex items-center justify-center gap-3">
            <span className="h-px w-6 bg-[#C5A059]/60" />
            <span className="text-[10px] uppercase tracking-[0.35em] text-[#6B655B]">
              {settings.subtitle}
            </span>
            <span className="h-px w-6 bg-[#C5A059]/60" />
          </div>
        )}
      </section>

      {quickActions.length > 0 && (
        <section className="mb-10 grid grid-cols-2 gap-4 px-5">
          {quickActions.map(({ to, testId, icon: Icon, title, description, featured }) => (
            <Link
              key={to}
              to={to}
              data-testid={testId}
              className={`rounded-3xl border p-5 shadow-[0_4px_24px_rgba(44,42,38,0.05)] transition-transform active:scale-95 no-tap-highlight ${
                featured
                  ? "col-span-2 border-[#DCCB9B] bg-[#F4ECD8]"
                  : "border-[#EBE5DC]/60 bg-white"
              }`}
            >
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-white">
                <Icon size={20} strokeWidth={1.5} className="text-[#B89953]" />
              </div>
              <h3 className="font-serif-display text-xl leading-tight text-[#2C2A26]">{title}</h3>
              <p className="mt-1 text-xs text-[#6B655B]">{description}</p>
              <ArrowRight size={16} strokeWidth={1.5} className="mt-3 text-[#C5A059]" />
            </Link>
          ))}
        </section>
      )}

      {settings.campaigns_enabled && (
        <section className="mb-12 px-5">
          <div className="mb-5 flex items-center gap-2 px-1">
            <Sparkles size={20} strokeWidth={1.5} className="text-[#C5A059]" />
            <div>
              <h2 className="font-serif-display text-3xl text-[#2C2A26]">Kampanjer og tilbud</h2>
              <p className="mt-1 text-xs text-[#6B655B]">Eksklusive fordeler fra klinikken</p>
            </div>
          </div>

          {loading ? (
            <div className="space-y-4">
              {[0, 1].map((i) => (
                <div key={i} className="overflow-hidden rounded-3xl border border-[#EBE5DC]/60 bg-white animate-pulse">
                  <div className="aspect-[16/9] bg-[#F4F0EA]" />
                  <div className="space-y-3 p-5">
                    <div className="h-5 w-2/3 rounded bg-[#F4F0EA]" />
                    <div className="h-3 w-full rounded bg-[#F4F0EA]" />
                    <div className="h-3 w-1/2 rounded bg-[#F4F0EA]" />
                  </div>
                </div>
              ))}
            </div>
          ) : safeOffers.length === 0 ? (
            <div className="rounded-3xl border border-[#EBE5DC]/60 bg-white p-8 text-center">
              <p className="text-sm text-[#6B655B]">Ingen aktive kampanjer akkurat nå.</p>
            </div>
          ) : (
            <div className="space-y-4" data-testid="offers-list">
              {safeOffers.map((offer, index) => (
                <OfferCard key={offer.id ?? index} offer={offer} index={index} />
              ))}
            </div>
          )}
        </section>
      )}
    </div>
  );
}
