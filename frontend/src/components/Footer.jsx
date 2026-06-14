import { useRef } from "react";
import { Lock } from "lucide-react";

export default function Footer({ onSecretActivate }) {
  const taps = useRef(0);
  const timer = useRef(null);

  const handleTap = (e) => {
    e.stopPropagation();
    taps.current += 1;
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      taps.current = 0;
    }, 1600);
    if (taps.current >= 5) {
      taps.current = 0;
      onSecretActivate?.();
    }
  };

  return (
    <footer
      className="mt-16 mb-6 text-center select-none"
      style={{ userSelect: "none", WebkitUserSelect: "none" }}
      data-testid="footer"
    >
      <div className="text-[#B89953] font-serif-display text-2xl mb-1">Seldaesthetic</div>
      <div className="text-[10px] tracking-[0.3em] uppercase text-[#6B655B]">
        Skjønnhet i hver detalj
      </div>
      <div className="mt-4 flex items-center justify-center gap-1.5 text-[10px] text-[#9C968C]">
        <span>© {new Date().getFullYear()} Seldaesthetic</span>
        <button
          onClick={handleTap}
          aria-label="admin"
          data-testid="admin-secret-trigger"
          className="p-1 rounded-full hover:bg-[#F4F0EA] transition-colors no-tap-highlight"
        >
          <Lock size={10} strokeWidth={1.5} className="text-[#C9C3B8]" />
        </button>
      </div>
    </footer>
  );
}
