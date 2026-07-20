import { Outlet, useNavigate } from "react-router-dom";
import BottomNav from "./BottomNav";
import Footer from "./Footer";
import { useCallback, useState } from "react";
import AdminLoginModal from "./AdminLoginModal";
import BurgerMenu from "./BurgerMenu";

export default function Layout() {
  const [adminOpen, setAdminOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const navigate = useNavigate();

  const onAdminUnlock = () => {
    setAdminOpen(false);
    navigate("/admin");
  };

  const closeMenu = useCallback(() => setMenuOpen(false), []);

  return (
    <div className="min-h-screen bg-paper flex flex-col" data-testid="app-shell">
      <BurgerMenu
        open={menuOpen}
        onOpen={() => setMenuOpen(true)}
        onClose={closeMenu}
      />
      <main className="flex-1 pb-28 max-w-screen-md mx-auto w-full">
        <Outlet />
        <Footer onSecretActivate={() => setAdminOpen(true)} />
      </main>
      <BottomNav />
      <AdminLoginModal
        open={adminOpen}
        onClose={() => setAdminOpen(false)}
        onSuccess={onAdminUnlock}
      />
    </div>
  );
}
