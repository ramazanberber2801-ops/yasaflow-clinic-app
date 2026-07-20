import "@/App.css";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "sonner";
import Layout from "@/components/Layout";
import Hjem from "@/pages/Hjem";
import Bestill from "@/pages/Bestill";
import Lojalitet from "@/pages/Lojalitet";
import Kontakt from "@/pages/Kontakt";
import Gavekort from "@/pages/Gavekort";
import Profil from "@/pages/Profil";
import Login from "@/pages/Login";
import Om from "@/pages/Om";
import Admin from "@/pages/Admin";
import InstallPrompt from "@/components/InstallPrompt";
import { registerSW } from "@/registerSW";

registerSW();

function App() {
  return (
    <div className="App">
      <BrowserRouter>
        <Routes>
          <Route element={<Layout />}>
            <Route path="/" element={<Hjem />} />
            <Route path="/bestill" element={<Bestill />} />
            <Route path="/lojalitet" element={<Lojalitet />} />
            <Route path="/gavekort" element={<Gavekort />} />
            <Route path="/profil" element={<Profil />} />
            <Route path="/kontakt" element={<Kontakt />} />
            <Route path="/om" element={<Om />} />
          </Route>
          <Route path="/login" element={<Login />} />
          <Route path="/admin" element={<Admin />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
      <Toaster
        position="top-center"
        toastOptions={{
          style: {
            background: "#FFFFFF",
            border: "1px solid #EBE5DC",
            color: "#2C2A26",
            fontFamily: "Manrope, sans-serif",
          },
        }}
      />
      <InstallPrompt />
    </div>
  );
}

export default App;
