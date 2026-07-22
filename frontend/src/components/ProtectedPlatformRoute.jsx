import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

export default function ProtectedPlatformRoute({ children }) {
  const { user, isPlatformAdmin, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F8F5F0] px-5 py-10">
        <div className="mx-auto max-w-md rounded-3xl border border-[#EBE5DC] bg-white p-6 text-sm text-[#6B655B]">
          Kontrollerer Yasaflow-tilgang …
        </div>
      </div>
    );
  }

  if (!user) return <Navigate to="/login?mode=login" replace state={{ from: location.pathname }} />;
  if (!isPlatformAdmin) return <Navigate to="/admin" replace />;
  return children;
}
