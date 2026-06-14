import { Sparkles } from "lucide-react";

export default function OfferCard({ offer, index = 0 }) {
  return (
    <article
      className="bg-white rounded-3xl overflow-hidden shadow-[0_4px_24px_rgba(44,42,38,0.05)] border border-[#EBE5DC]/60 fade-up"
      style={{ animationDelay: `${index * 80}ms` }}
      data-testid={`offer-card-${offer.id}`}
    >
      <div className="relative">
        <img
          src={offer.image_url}
          alt={offer.title}
          className="promo-img"
          onError={(e) => {
            e.currentTarget.src =
              "https://images.unsplash.com/photo-1616394584738-fc6e612e71b9?w=1200&q=80";
          }}
        />
        {offer.badge && (
          <span className="absolute top-3 right-3 bg-[#C5A059] text-white text-[10px] font-semibold tracking-[0.2em] uppercase px-3 py-1.5 rounded-full shadow">
            {offer.badge}
          </span>
        )}
      </div>
      <div className="p-5">
        <div className="flex items-start gap-2 mb-2">
          <Sparkles size={18} strokeWidth={1.5} className="text-[#C5A059] mt-1 shrink-0" />
          <h3 className="font-serif-display text-2xl text-[#2C2A26] leading-tight">
            {offer.title}
          </h3>
        </div>
        <p className="text-[#6B655B] text-sm leading-relaxed font-light mb-4">
          {offer.description}
        </p>
        <div className="flex items-baseline gap-3">
          <span className="font-serif-display text-2xl text-[#B89953]">{offer.price}</span>
          {offer.before_price ? (
            <span className="text-sm text-[#9C968C] line-through">{offer.before_price}</span>
          ) : null}
        </div>
      </div>
    </article>
  );
}
