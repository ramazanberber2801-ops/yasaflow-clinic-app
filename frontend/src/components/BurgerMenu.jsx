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

  const handleToggle = (event) => {
    event.preventDefault();
    event.stopPropagation();

    if (open) {
      onClose();
    } else {
      onOpen();
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={handleToggle}
        aria-label={open ? "Lukk meny" : "Åpne meny"}
        aria-expanded={open}
        aria-controls="burger-menu-panel"
        className="fixed top-4 right-4 z-[60] h-11 w-11 rounded-full bg-white/95 backdrop-blur-xl border border-[#EBE5DC] shadow-sm flex items-center justify-center text-[#2C2A26] no-tap-highlight touch-manipulation"
        data-testid="open-burger-menu"
      >
        {open ? <X size={21} strokeWidth={1.6} /> : <Menu size={22} strokeWidth={1.6} />}
      </button>

      <div
        className={`fixed inset-0 z-50 transition-opacity duration-200 ${
          open ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
        data-testid="burger-menu"
        aria-hidden={!open}
      >
        <button
          type="button"
          tabIndex={open ? 0 : -1}
          className="absolute inset-0 bg-black/30 backdrop-blur-[2px]"
          onClick={onClose}
          aria-label="Lukk meny"
        />

        <aside
          id="burger-menu-panel"
          className={`absolute inset-y-0 right-0 w-[86%] max-w-sm bg-[#FBF9F5] shadow-2xl flex flex-col transition-transform duration-200 ease-out ${
            open ? "translate-x-0" : "translate-x-full"
          }`}
          onClick={(event) => event.stopPropagation()}
        >
          <div className="px-6 pt-[max(env(safe-area-inset-top),1.25rem)] pb-5 pr-20 border-b border-[#EBE5DC]">
            <p className="font-serif text-xl text-[#2C2A26]">Seldaesthetic</p>
            <p className="text-xs text-[#8A8378] mt-1">Din klinikkapp</p>
          </div>

          <nav className="flex-1 overflow-y-auto px-4 py-5">
            <div className="space-y-1">
              {items.map(({ to, label, icon: Icon, end }) => (
                <NavLink
                  key={to}
                  to={to}
                  end={end}
                  tabIndex={open ? 0 : -1}
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
    </>
  );
}
