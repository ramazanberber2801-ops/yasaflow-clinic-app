import React from "react";
import ReactDOM from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import "@/index.css";
import App from "@/App";
import { AuthProvider } from "@/contexts/AuthContext";
import { ClinicSettingsProvider } from "@/contexts/ClinicSettingsContext";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,
      refetchOnWindowFocus: false,
    },
  },
});

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <ClinicSettingsProvider>
          <App />
        </ClinicSettingsProvider>
      </AuthProvider>
    </QueryClientProvider>
  </React.StrictMode>,
);

if ("serviceWorker" in navigator) {
  window.addEventListener("load", async () => {
    try {
      const registration = await navigator.serviceWorker.register(
        "/firebase-messaging-sw.js",
        { updateViaCache: "none" },
      );
      await registration.update();
    } catch (error) {
      console.error("Push service worker registration failed:", error);
    }
  });
}
