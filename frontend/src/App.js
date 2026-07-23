import "@/App.css";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "sonner";
import Layout from "@/components/Layout";
import ProtectedAdminRoute from "@/components/ProtectedAdminRoute";
import ProtectedPlatformRoute from "@/components/ProtectedPlatformRoute";
import Hjem from "@/pages/Hjem";
import Bestill from "@/pages/Bestill";
import Lojalitet from "@/pages/Lojalitet";
import Kontakt from "@/pages/Kontakt";
import Gavekort from "@/pages/Gavekort";
import Profil from "@/pages/Profil";
import Login from "@/pages/Login";
import Om from "@/pages/Om";
import Varsler from "@/pages/Varsler";
import Admin from "@/pages/AdminHub";
import AdminOverview from "@/pages/AdminOverview";
import AdminSubscription from "@/pages/AdminSubscription";
import AdminBirthdayAutomation from "@/pages/AdminBirthdayAutomation";
import AdminCustomers from "@/pages/AdminCustomers";
import AdminSettings from "@/pages/AdminSettings";
import AdminNotifications from "@/pages/AdminNotifications";
import AdminLoyaltyCampaigns from "@/pages/AdminLoyaltyCampaigns";
import AdminAppInstall from "@/pages/AdminAppInstall";
import PlatformAdmin from "@/pages/PlatformAdmin";
import InstallPrompt from "@/components/InstallPrompt";
import PushPermissionPrompt from "@/components/PushPermissionPrompt";
import { useClinicSettings } from "@/contexts/ClinicSettingsContext";

function FeatureRoute({ enabled, children }) {
  const { loading } = useClinicSettings();
  if (loading) return null;
  return enabled ? children : <Navigate to="/" replace />;
}

function App() {
  const { settings } = useClinicSettings();
  const notificationsEnabled = settings.push_enabled || settings.campaigns_enabled;

  return (
    <div className="App">
      <BrowserRouter>
        <Routes>
          <Route element={<Layout />}>
            <Route path="/" element={<Hjem />} />
            <Route path="/bestill" element={<FeatureRoute enabled={settings.booking_enabled}><Bestill /></FeatureRoute>} />
            <Route path="/lojalitet" element={<FeatureRoute enabled={settings.loyalty_enabled}><Lojalitet /></FeatureRoute>} />
            <Route path="/gavekort" element={<FeatureRoute enabled={settings.gift_card_enabled}><Gavekort /></FeatureRoute>} />
            <Route path="/profil" element={<Profil />} />
            <Route path="/varsler" element={<FeatureRoute enabled={notificationsEnabled}><Varsler /></FeatureRoute>} />
            <Route path="/kontakt" element={<Kontakt />} />
            <Route path="/om" element={<Om />} />
          </Route>
          <Route path="/login" element={<Login />} />
          <Route path="/admin" element={<ProtectedAdminRoute><Admin /></ProtectedAdminRoute>} />
          <Route path="/admin/overview" element={<ProtectedAdminRoute><AdminOverview /></ProtectedAdminRoute>} />
          <Route path="/admin/subscription" element={<ProtectedAdminRoute><AdminSubscription /></ProtectedAdminRoute>} />
          <Route path="/admin/birthdays" element={<ProtectedAdminRoute><AdminBirthdayAutomation /></ProtectedAdminRoute>} />
          <Route path="/admin/customers" element={<ProtectedAdminRoute><AdminCustomers /></ProtectedAdminRoute>} />
          <Route path="/admin/settings" element={<ProtectedAdminRoute><AdminSettings /></ProtectedAdminRoute>} />
          <Route path="/admin/notifications" element={<ProtectedAdminRoute><AdminNotifications /></ProtectedAdminRoute>} />
          <Route path="/admin/loyalty-campaigns" element={<ProtectedAdminRoute><AdminLoyaltyCampaigns /></ProtectedAdminRoute>} />
          <Route path="/admin/app-install" element={<ProtectedAdminRoute><AdminAppInstall /></ProtectedAdminRoute>} />
          <Route path="/clinic-platform-admin" element={<ProtectedPlatformRoute><PlatformAdmin /></ProtectedPlatformRoute>} />
          <Route path="/yasaflow-admin" element={<Navigate to="/clinic-platform-admin" replace />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
      <Toaster position="top-center" toastOptions={{ style: { background: "#FFFFFF", border: "1px solid #EBE5DC", color: "#2C2A26", fontFamily: "Manrope, sans-serif" } }} />
      <InstallPrompt />
      {settings.push_enabled && <PushPermissionPrompt />}
    </div>
  );
}

export default App;
