import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { DEFAULT_CLINIC_SETTINGS, getClinicSettings } from "@/lib/clinicSettings";

const ClinicSettingsContext = createContext({
  settings: DEFAULT_CLINIC_SETTINGS,
  loading: true,
  refresh: async () => {},
});

export function ClinicSettingsProvider({ children }) {
  const [settings, setSettings] = useState(DEFAULT_CLINIC_SETTINGS);
  const [loading, setLoading] = useState(true);

  const refresh = async () => {
    try {
      const data = await getClinicSettings();
      setSettings({ ...DEFAULT_CLINIC_SETTINGS, ...(data || {}) });
    } catch (error) {
      console.error("Could not load clinic settings:", error);
      setSettings(DEFAULT_CLINIC_SETTINGS);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
  }, []);

  const value = useMemo(() => ({ settings, loading, refresh }), [settings, loading]);

  return (
    <ClinicSettingsContext.Provider value={value}>
      {children}
    </ClinicSettingsContext.Provider>
  );
}

export function useClinicSettings() {
  return useContext(ClinicSettingsContext);
}
