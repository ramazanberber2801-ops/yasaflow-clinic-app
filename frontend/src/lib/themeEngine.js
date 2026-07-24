export const DEFAULT_THEME_ID = "clinic-luxury";

export const CLINIC_THEMES = [
  {
    id: "clinic-luxury",
    name: "Clinic Luxury",
    description: "Varmt og eksklusivt uttrykk med gulltoner og myke flater.",
    tokens: { primary: "#C5A059", secondary: "#2C2A26", background: "#F7F3EC", text: "#2C2A26", card: "#FFFFFF" },
  },
  {
    id: "nordic-clinic",
    name: "Nordic Clinic",
    description: "Lyst, rolig og skandinavisk med mye luft.",
    tokens: { primary: "#64748B", secondary: "#1E293B", background: "#F8FAFC", text: "#0F172A", card: "#FFFFFF" },
  },
  {
    id: "medical-clean",
    name: "Medical Clean",
    description: "Rent og profesjonelt uttrykk for medisinske klinikker.",
    tokens: { primary: "#1677A6", secondary: "#123247", background: "#F3F9FC", text: "#163241", card: "#FFFFFF" },
  },
  {
    id: "beauty-rose",
    name: "Beauty Rose",
    description: "Mykt og moderne skjønnhetsuttrykk i dempede rosatoner.",
    tokens: { primary: "#B76E79", secondary: "#4A3035", background: "#FFF7F8", text: "#3F292E", card: "#FFFFFF" },
  },
  {
    id: "dark-premium",
    name: "Dark Premium",
    description: "Mørkt premiumtema med tydelig kontrast.",
    tokens: { primary: "#D2B36C", secondary: "#111111", background: "#191919", text: "#F7F3EA", card: "#262626" },
  },
  {
    id: "yasaflow-standard",
    name: "Yasaflow Standard",
    description: "Yasaflows rene standarduttrykk i blå og turkise toner.",
    tokens: { primary: "#0A8DFF", secondary: "#071B53", background: "#F4FAFF", text: "#071B53", card: "#FFFFFF" },
  },
];

const HEX_COLOR = /^#[0-9a-f]{6}$/i;
const TOKEN_KEYS = ["primary", "secondary", "background", "text", "card"];

export function getTheme(themeId = DEFAULT_THEME_ID) {
  return CLINIC_THEMES.find((theme) => theme.id === themeId) || CLINIC_THEMES[0];
}

export function sanitizeThemeOverrides(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return TOKEN_KEYS.reduce((result, key) => {
    const color = String(value[key] || "").trim();
    if (HEX_COLOR.test(color)) result[key] = color.toUpperCase();
    return result;
  }, {});
}

export function resolveTheme(themeId, overrides) {
  const preset = getTheme(themeId);
  return { ...preset, tokens: { ...preset.tokens, ...sanitizeThemeOverrides(overrides) } };
}

export function contrastText(hex) {
  const clean = String(hex || "").replace("#", "");
  if (clean.length !== 6) return "#FFFFFF";
  const r = parseInt(clean.slice(0, 2), 16);
  const g = parseInt(clean.slice(2, 4), 16);
  const b = parseInt(clean.slice(4, 6), 16);
  return (r * 299 + g * 587 + b * 114) / 1000 > 145 ? "#1F2937" : "#FFFFFF";
}

export function themeToCssVars(theme) {
  const { primary, secondary, background, text, card } = theme.tokens;
  return {
    "--brand-primary": primary,
    "--brand-secondary": secondary,
    "--brand-background": background,
    "--brand-text": text,
    "--brand-card": card,
    "--brand-primary-text": contrastText(primary),
    "--brand-secondary-text": contrastText(secondary),
    "--brand-card-text": text,
    "--brand-border": `color-mix(in srgb, ${primary} 20%, transparent)`,
    "--brand-muted-text": `color-mix(in srgb, ${text} 58%, transparent)`,
    "--brand-subtle": `color-mix(in srgb, ${primary} 10%, ${card})`,
    "--brand-surface": `color-mix(in srgb, ${background} 92%, #FFFFFF 8%)`,
  };
}

export function applyThemeToDocument(theme) {
  if (typeof document === "undefined") return;
  const variables = themeToCssVars(theme);
  Object.entries(variables).forEach(([key, value]) => document.documentElement.style.setProperty(key, value));
  document.documentElement.style.backgroundColor = theme.tokens.background;
  document.body.style.backgroundColor = theme.tokens.background;
  document.body.style.color = theme.tokens.text;
}
