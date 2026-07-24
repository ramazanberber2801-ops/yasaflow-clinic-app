import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { DEFAULT_CLINIC_SETTINGS, getClinicSettings } from "@/lib/clinicSettings";
import { applyThemeToDocument, resolveTheme } from "@/lib/themeEngine";

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

  const resolvedTheme = useMemo(
    () => resolveTheme(settings.theme_id, settings.theme_overrides),
    [settings.theme_id, settings.theme_overrides],
  );

  useEffect(() => {
    applyThemeToDocument(resolvedTheme);
  }, [resolvedTheme]);

  useEffect(() => {
    const clinicName = settings.clinic_name?.trim() || "Klinikk";
    const subtitle = settings.subtitle?.trim();
    const title = subtitle ? `${clinicName} – ${subtitle}` : clinicName;
    const description = subtitle ? `${clinicName} – ${subtitle}` : `${clinicName} sin klinikkapp`;
    const logoUrl = settings.logo_url?.trim();

    document.title = title;

    const descriptionMeta = document.querySelector('meta[name="description"]');
    if (descriptionMeta) descriptionMeta.setAttribute("content", description);

    const appleTitle = document.querySelector('meta[name="apple-mobile-web-app-title"]');
    if (appleTitle) appleTitle.setAttribute("content", clinicName);

    const themeMeta = document.querySelector('meta[name="theme-color"]');
    if (themeMeta) themeMeta.setAttribute("content", resolvedTheme.tokens.primary);

    const manifest = {
      name: clinicName,
      short_name: clinicName.slice(0, 30),
      description,
      start_url: window.location.pathname || "/",
      scope: "/",
      display: "standalone",
      orientation: "portrait",
      background_color: resolvedTheme.tokens.background,
      theme_color: resolvedTheme.tokens.primary,
      lang: "nb",
      categories: ["lifestyle", "health", "beauty"],
      icons: logoUrl
        ? [
            { src: logoUrl, sizes: "192x192", purpose: "any maskable" },
            { src: logoUrl, sizes: "512x512", purpose: "any maskable" },
          ]
        : [
            { src: "/icons/icon-192.svg", sizes: "192x192", type: "image/svg+xml", purpose: "any maskable" },
            { src: "/icons/icon-512.svg", sizes: "512x512", type: "image/svg+xml", purpose: "any maskable" },
          ],
    };

    const blobUrl = URL.createObjectURL(new Blob([JSON.stringify(manifest)], { type: "application/manifest+json" }));
    let manifestLink = document.querySelector('link[rel="manifest"]');
    if (!manifestLink) {
      manifestLink = document.createElement("link");
      manifestLink.rel = "manifest";
      document.head.appendChild(manifestLink);
    }
    const previousUrl = manifestLink.dataset.dynamicManifestUrl;
    manifestLink.href = blobUrl;
    manifestLink.dataset.dynamicManifestUrl = blobUrl;

    let appleIcon = document.querySelector('link[rel="apple-touch-icon"]');
    if (logoUrl) {
      if (!appleIcon) {
        appleIcon = document.createElement("link");
        appleIcon.rel = "apple-touch-icon";
        document.head.appendChild(appleIcon);
      }
      appleIcon.href = logoUrl;
    }

    if (previousUrl?.startsWith("blob:")) URL.revokeObjectURL(previousUrl);
    return () => URL.revokeObjectURL(blobUrl);
  }, [settings.clinic_name, settings.subtitle, settings.logo_url, resolvedTheme]);

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
