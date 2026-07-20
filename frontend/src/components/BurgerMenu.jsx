import { useEffect } from "react";
import { NavLink } from "react-router-dom";
import {
  CalendarCheck,
  Gift,
  Heart,
  Home,
  Info,
  MapPin,
  Menu,
  UserRound,
  X,
} from "lucide-react";

const items = [
  { to: "/", label: "Hjem", icon: Home, end: true },
  { to: "/bestill", label: "Bestill time", icon: CalendarCheck },
  { to: "/lojalitet", label: "Lojalitetskort", icon: Heart },
  { to: "/gavekort", label: "Gavekort", icon: Gift },
  { to: "/profil", label: "Logg inn / Opprett konto", icon: UserRound },
  { to: "/kontakt", label: "Kontakt", icon: MapPin },
  { to: "/om", label: "Om Seldaesthetic", icon: Info },
];

export default function BurgerMenu({ open, onOpen, onClose }) {
  useEffect(() => {
    if (!open) return undefined;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleEscape = (event) => {
      if (event.key === "Escape") onClose();
    };

    window.addEventListener("keydown", handleEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleEscape);
    };
  }, [open, onClose]);

  return (
    <>
      <button
        type="button"
        onClick={onOpen}
        aria-label="Åpne meny"
        aria-expanded={open}
        className="fixed top-4 left-4 z-40 h-11 w-11 rounded-full bg-white/95 backdrop-blur-xl border border-[#EBE5DC] shadow-sm flex items-center justify-center text-[#2C2A26] no-tap-highlight"
        data-testid="open-burger-menu"
      >
        <Menu size={22} strokeWidth={1.6} />
      </button>

      {open && (
        <div className="fixed inset-0 z-50" data-testid="burger-menu">
          <button
            type="button"
            className="absolute inset-0 bg-black/30 backdrop-blur-[2px]"
            onClick={onClose}
            aria-label="Lukk meny"
          />

          <aside className="absolute inset-y-0 left-0 w-[86%] max-w-sm bg-[#FBF9F5] shadow-2xl flex flex-col">
            <div className="px-6 pt-[max(env(safe-area-inset-top),1.25rem)] pb-5 border-b border-[#EBE5DC] flex items-center justify-between">
              <div>
                <p className="font-serif text-xl text-[#2C2A26]">Seldaesthetic</p>
                <p className="text-xs text-[#8A8378] mt-1">Din klinikkapp</p>
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label="Lukk meny"
                className="h-10 w-10 rounded-full bg-white border border-[#EBE5DC] flex items-center justify-center text-[#2C2A26]"
              >
                <X size={20} strokeWidth={1.6} />
              </button>
            </div>

            <nav className="flex-1 overflow-y-auto px-4 py-5">
              <div className="space-y-1">
                {items.map(({ to, label, icon: Icon, end }) => (
                  <NavLink
                    key={to}
                    to={to}
                    end={end}
                    onClick={onClose}
                    className={({ isActive }) =>
                      `flex items-center gap-4 rounded-2xl px-4 py-3.5 transition-colors ${
                        isActive
                          ? "bg-[#F0E9DF] text-[#2C2A26]"
                          : "text-[#5F594F] hover:bg-white"
                      }`
                    }
                  >
                    <Icon size={21} strokeWidth={1.5} className="text-[#B89953]" />
                    <span className="text-sm font-medium">{label}</span>
                  </NavLink>
                ))}
              </div>
            </nav>

            <div className="px-6 py-5 border-t border-[#EBE5DC] text-xs text-[#8A8378]">
              Seldaesthetic · Mjøndalen
            </div>
          </aside>
        </div>
      )}
    </>
  );
}
