/**
 * ═══════════════════════════════════════════════════════════════════════════
 * STYLE REGISTRY — All available visual styles for wwwuabot
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Each style maps Open Props color palettes to our design tokens.
 * Styles are applied via <html data-style="...">
 *
 * Palettes from Open Props: gray, stone, red, pink, purple, violet,
 * indigo, blue, cyan, teal, green, lime, yellow, orange, choco, brown, sand
 */

export type StyleId =
  | "basic"
  | "apple"
  | "midnight"
  | "ocean"
  | "forest"
  | "sunset"
  | "lavender"
  | "rose"
  | "sand"
  | "choco"
  | "slate"
  | "emerald"
  | "amber"
  | "coral"
  | "arctic"
  | "violet"
  | "moss"
  | "copper";

export interface StyleDefinition {
  id: StyleId;
  label: string;
  labelUk: string;
  icon: string;
  /** CSS custom property overrides for this style */
  lightVars: Record<string, string>;
  darkVars: Record<string, string>;
}

/**
 * Open Props palette mapping:
 * Each palette has --{palette}-0 through --{palette}-12
 * We map: 0=bg-subtle, 1=bg, 2=bg-elevated, 3=border, 4=border-subtle,
 *         5=muted-text, 6=secondary-text, 7-8=primary-text,
 *         9-10=accent, 11-12=accent-deep
 */
function palette(
  p: string,
  accent: string,
  accentHover: string,
): { light: Record<string, string>; dark: Record<string, string> } {
  return {
    light: {
      "--bg-0": `var(--${p}-1)`,
      "--bg-1": "#ffffff",
      "--bg-2": `var(--${p}-1)`,
      "--bg-3": "#ffffff",
      "--bg-4": `var(--${p}-3)`,
      "--border": `var(--${p}-3)`,
      "--border-subtle": `var(--${p}-2)`,
      "--text-primary": `var(--${p}-9)`,
      "--text-secondary": `var(--${p}-6)`,
      "--text-muted": `var(--${p}-5)`,
      "--text-inverse": "#ffffff",
      "--accent": accent,
      "--accent-dim": `var(--${p}-1)`,
      "--accent-hover": accentHover,
      "--accent-soft": `var(--${p}-0)`,
      "--green": `var(--green-6)`,
      "--green-dim": `var(--green-1)`,
      "--red": `var(--red-6)`,
      "--red-dim": `var(--red-1)`,
      "--yellow": `var(--orange-6)`,
      "--yellow-dim": `var(--orange-1)`,
      "--surface": `var(--${p}-0)`,
      "--surface-hover": `var(--${p}-1)`,
      "--surface-active": `var(--${p}-2)`,
      "--surface-overlay": "rgba(0, 0, 0, 0.45)",
    },
    dark: {
      "--bg-0": "#000000",
      "--bg-1": `var(--${p}-10)`,
      "--bg-2": `var(--${p}-9)`,
      "--bg-3": `var(--${p}-10)`,
      "--bg-4": `var(--${p}-8)`,
      "--border": `var(--${p}-8)`,
      "--border-subtle": `var(--${p}-9)`,
      "--text-primary": `var(--${p}-0)`,
      "--text-secondary": `var(--${p}-4)`,
      "--text-muted": `var(--${p}-6)`,
      "--text-inverse": `var(--${p}-9)`,
      "--accent": accent,
      "--accent-dim": `${accent}26`,
      "--accent-hover": accentHover,
      "--accent-soft": `${accent}14`,
      "--green": `var(--green-5)`,
      "--green-dim": "rgba(81, 207, 102, 0.15)",
      "--red": `var(--red-5)`,
      "--red-dim": "rgba(255, 107, 107, 0.15)",
      "--yellow": `var(--orange-5)`,
      "--yellow-dim": "rgba(255, 146, 43, 0.15)",
      "--surface": `var(--${p}-9)`,
      "--surface-hover": `var(--${p}-8)`,
      "--surface-active": `var(--${p}-7)`,
      "--surface-overlay": "rgba(0, 0, 0, 0.65)",
    },
  };
}

export const STYLES: StyleDefinition[] = [
  // ── Basic (original) ─────────────────────────────────────────────
  {
    id: "basic",
    label: "Basic",
    labelUk: "Базовий",
    icon: "🎨",
    lightVars: {},
    darkVars: {},
  },

  // ── Apple ────────────────────────────────────────────────────────
  {
    id: "apple",
    label: "Apple",
    labelUk: "Apple",
    icon: "",
    lightVars: palette("gray", "#007aff", "#0063d1").light,
    darkVars: palette("gray", "#0a84ff", "#409cff").dark,
  },

  // ── Midnight (deep blue-gray) ────────────────────────────────────
  {
    id: "midnight",
    label: "Midnight",
    labelUk: "Нічний",
    icon: "\uD83C\uDF19",
    lightVars: palette("slate", "#6366f1", "#4f46e5").light,
    darkVars: palette("slate", "#818cf8", "#a5b4fc").dark,
  },

  // ── Ocean (cyan/teal) ────────────────────────────────────────────
  {
    id: "ocean",
    label: "Ocean",
    labelUk: "Океан",
    icon: "\uD83C\uDF0A",
    lightVars: palette("cyan", "#0891b2", "#0e7490").light,
    darkVars: palette("cyan", "#22d3ee", "#67e8f9").dark,
  },

  // ── Forest (green) ──────────────────────────────────────────────
  {
    id: "forest",
    label: "Forest",
    labelUk: "Лісовий",
    icon: "\uD83C\uDF32",
    lightVars: palette("green", "#16a34a", "#15803d").light,
    darkVars: palette("green", "#4ade80", "#86efac").dark,
  },

  // ── Sunset (orange/warm) ────────────────────────────────────────
  {
    id: "sunset",
    label: "Sunset",
    labelUk: "Захід",
    icon: "\uD83C\uDF05",
    lightVars: palette("orange", "#ea580c", "#c2410c").light,
    darkVars: palette("orange", "#fb923c", "#fdba74").dark,
  },

  // ── Lavender (purple) ───────────────────────────────────────────
  {
    id: "lavender",
    label: "Lavender",
    labelUk: "Лаванда",
    icon: "\uD83C\uDF38",
    lightVars: palette("violet", "#7c3aed", "#6d28d9").light,
    darkVars: palette("violet", "#a78bfa", "#c4b5fd").dark,
  },

  // ── Rose (pink) ─────────────────────────────────────────────────
  {
    id: "rose",
    label: "Rose",
    labelUk: "Троянда",
    icon: "\uD83C\uDF39",
    lightVars: palette("pink", "#db2777", "#be185d").light,
    darkVars: palette("pink", "#f472b6", "#f9a8d4").dark,
  },

  // ── Sand (warm neutral) ─────────────────────────────────────────
  {
    id: "sand",
    label: "Sand",
    labelUk: "Пісок",
    icon: "\uD83C\uDFDC\uFE0F",
    lightVars: palette("sand", "#92702a", "#7a5c1e").light,
    darkVars: palette("sand", "#c9a84c", "#dfc06e").dark,
  },

  // ── Choco (brown) ──────────────────────────────────────────────
  {
    id: "choco",
    label: "Choco",
    labelUk: "Шоколад",
    icon: "\uD83C\uDF6B",
    lightVars: palette("choco", "#a87c56", "#956b47").light,
    darkVars: palette("choco", "#d4a574", "#e0bb96").dark,
  },

  // ── Slate (cool gray) ──────────────────────────────────────────
  {
    id: "slate",
    label: "Slate",
    labelUk: "Сланець",
    icon: "\uD83E\uDEA8",
    lightVars: palette("gray", "#475569", "#334155").light,
    darkVars: palette("gray", "#94a3b8", "#cbd5e1").dark,
  },

  // ── Emerald ─────────────────────────────────────────────────────
  {
    id: "emerald",
    label: "Emerald",
    labelUk: "Смарагд",
    icon: "\uD83D\uDD35",
    lightVars: palette("teal", "#0d9488", "#0f766e").light,
    darkVars: palette("teal", "#2dd4bf", "#5eead4").dark,
  },

  // ── Amber ───────────────────────────────────────────────────────
  {
    id: "amber",
    label: "Amber",
    labelUk: "Бурштин",
    icon: "\uD83D\uDD36",
    lightVars: palette("yellow", "#d97706", "#b45309").light,
    darkVars: palette("yellow", "#fbbf24", "#fcd34d").dark,
  },

  // ── Coral (red-warm) ────────────────────────────────────────────
  {
    id: "coral",
    label: "Coral",
    labelUk: "Корал",
    icon: "\uD83E\uDDC1",
    lightVars: palette("red", "#dc2626", "#b91c1c").light,
    darkVars: palette("red", "#f87171", "#fca5a5").dark,
  },

  // ── Arctic (ice blue) ──────────────────────────────────────────
  {
    id: "arctic",
    label: "Arctic",
    labelUk: "Арктика",
    icon: "\u2744\uFE0F",
    lightVars: palette("blue", "#2563eb", "#1d4ed8").light,
    darkVars: palette("blue", "#60a5fa", "#93c5fd").dark,
  },

  // ── Violet ──────────────────────────────────────────────────────
  {
    id: "violet",
    label: "Violet",
    labelUk: "Фіолетовий",
    icon: "\uD83C\uDF33",
    lightVars: palette("purple", "#9333ea", "#7e22ce").light,
    darkVars: palette("purple", "#c084fc", "#d8b4fe").dark,
  },

  // ── Moss (olive-green) ─────────────────────────────────────────
  {
    id: "moss",
    label: "Moss",
    labelUk: "Мох",
    icon: "\uD83C\uDF3F",
    lightVars: palette("lime", "#65a30d", "#4d7c0f").light,
    darkVars: palette("lime", "#a3e635", "#bef264").dark,
  },

  // ── Copper (warm brown) ────────────────────────────────────────
  {
    id: "copper",
    label: "Copper",
    labelUk: "Мідь",
    icon: "\uD83E\uDE99",
    lightVars: palette("brown", "#92400e", "#78350f").light,
    darkVars: palette("brown", "#d97706", "#f59e0b").dark,
  },
];

/** Get style by ID */
export function getStyle(id: StyleId): StyleDefinition {
  return STYLES.find((s) => s.id === id) ?? STYLES[0];
}

/** Get all style IDs */
export function getStyleIds(): StyleId[] {
  return STYLES.map((s) => s.id);
}
