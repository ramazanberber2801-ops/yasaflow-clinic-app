const clean = (value) => (value || "").trim();

export const APP_CONFIG = Object.freeze({
  defaultClinicId: clean(process.env.REACT_APP_DEFAULT_CLINIC_ID),
  defaultClinicSlug: clean(process.env.REACT_APP_DEFAULT_CLINIC_SLUG),
  clinicQueryParameter: clean(process.env.REACT_APP_CLINIC_QUERY_PARAMETER) || "clinic",
  settingsRecordKey: clean(process.env.REACT_APP_CLINIC_SETTINGS_KEY) || "settings",
  localHosts: new Set(["localhost", "127.0.0.1", "0.0.0.0"]),
});

export function getConfiguredClinicSelector() {
  if (APP_CONFIG.defaultClinicId) return { field: "id", value: APP_CONFIG.defaultClinicId };
  if (APP_CONFIG.defaultClinicSlug) return { field: "slug", value: APP_CONFIG.defaultClinicSlug };
  return null;
}
