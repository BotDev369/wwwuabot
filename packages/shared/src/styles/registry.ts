/**
 * ═══════════════════════════════════════════════════════════════════════════
 * STYLE REGISTRY — Two brands × two schemes = 4 theme combinations
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Applied via pure CSS attribute selectors — no runtime JS style injection:
 *   <html data-brand="apple|android" data-theme="light|dark">
 *
 * Each brand defines its own typography, radii, elevation, and motion.
 * Both brands are monochrome (black/white accent, no colored highlights).
 */

export type Brand = "apple" | "android";
export type Scheme = "light" | "dark";
export type Theme = Scheme;

export interface BrandDefinition {
  id: Brand;
  label: string;
  labelUk: string;
  icon: string;
  /** Font stack for this brand */
  fontUi: string;
  fontDisplay: string;
  fontMono: string;
}

export const BRANDS: BrandDefinition[] = [
  {
    id: "apple",
    label: "Apple",
    labelUk: "Apple",
    icon: "",
    fontUi:
      '-apple-system, BlinkMacSystemFont, "SF Pro Text", "SF Pro Display", "Helvetica Neue", system-ui, sans-serif',
    fontDisplay:
      '-apple-system, BlinkMacSystemFont, "SF Pro Display", "Helvetica Neue", system-ui, sans-serif',
    fontMono: '"SF Mono", "Menlo", "Monaco", ui-monospace, monospace',
  },
  {
    id: "android",
    label: "Material",
    labelUk: "Material",
    icon: "",
    fontUi: '"Roboto", "Google Sans", system-ui, -apple-system, sans-serif',
    fontDisplay:
      '"Roboto", "Google Sans", system-ui, -apple-system, sans-serif',
    fontMono:
      '"Roboto Mono", "Google Sans Mono", "Courier New", ui-monospace, monospace',
  },
];

/**
 * Legacy aliases — kept for backward compatibility.
 * New code should use `Brand` type directly.
 */
export type StyleId = Brand;

/** Get brand by ID */
export function getBrand(id: Brand): BrandDefinition {
  return BRANDS.find((b) => b.id === id) ?? BRANDS[0];
}

/** Get all brand IDs */
export function getBrandIds(): Brand[] {
  return BRANDS.map((b) => b.id);
}

/**
 * Legacy aliases — map old 18-style IDs to the 2-brand system.
 * Used by StyleToggle to gracefully migrate stored preferences.
 */
export const LEGACY_STYLE_MAP: Record<string, Brand> = {
  basic: "apple",
  apple: "apple",
  midnight: "apple",
  ocean: "apple",
  forest: "apple",
  sunset: "android",
  lavender: "android",
  rose: "android",
  sand: "android",
  choco: "android",
  slate: "apple",
  emerald: "android",
  amber: "android",
  coral: "android",
  arctic: "apple",
  violet: "android",
  moss: "android",
  copper: "android",
};

/** Resolve a legacy style ID to a brand */
export function resolveLegacyStyle(legacy: string): Brand {
  return LEGACY_STYLE_MAP[legacy] ?? "apple";
}

// ── Backward-compatible re-exports for code that imports old names ──────
/** @deprecated Use BRANDS instead */
export const STYLES = BRANDS.map((b) => ({
  id: b.id,
  label: b.label,
  labelUk: b.labelUk,
  icon: b.icon,
  lightVars: {} as Record<string, string>,
  darkVars: {} as Record<string, string>,
}));

/** @deprecated Use getBrand() instead */
export const getStyle = getBrand;

/** @deprecated Use getBrandIds() instead */
export const getStyleIds = getBrandIds;
