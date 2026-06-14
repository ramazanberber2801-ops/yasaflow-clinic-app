import { NavLink } from "react-router-dom";
import { Home, CalendarCheck, Gift, MessageCircle } from "lucide-react";

const items = [
  { to: "/", label: "Hjem", icon: Home, testId: "nav-hjem" },
  { to: "/bestill", label: "Bestill", icon: CalendarCheck, testId: "nav-bestill" },
  { to: "/lojalitet", label: "Lojalitet", icon: Gift, testId: "nav-lojalitet" },
  { to: "/kontakt", label: "Kontakt", icon: MessageCircle, testId: "nav-kontakt" },
];

export default function BottomNav() {
  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 bg-white/90 backdrop-blur-xl border-t border-[#EBE5DC]"
      style={{ paddingBottom: "max(env(safe-area-inset-bottom), 0.5rem)" }}
      data-testid="bottom-nav"
    >
      <div className="max-w-screen-md mx-auto flex items-center justify-around px-2 pt-2 pb-2">
        {items.map(({ to, label, icon: Icon, testId }) => (
          <NavLink
            key={to}
            to={to}
            end={to === "/"}
            data-testid={testId}
            className={({ isActive }) =>
              `no-tap-highlight flex flex-col items-center gap-1 px-4 py-2 rounded-2xl transition-all ${
                isActive ? "bg-[#F0E9DF]" : "bg-transparent"
              }`
            }
          >
            {({ isActive }) => (
              <>
                <Icon
                  size={22}
                  strokeWidth={1.5}
                  className={isActive ? "text-[#B89953]" : "text-[#6B655B]"}
                />
                <span
                  className={`text-[11px] tracking-wide ${
                    isActive ? "text-[#2C2A26] font-medium" : "text-[#6B655B]"
                  }`}
                >
                  {label}
                </span>
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
