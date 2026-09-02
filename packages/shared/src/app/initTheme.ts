/**
 * Applies saved brand & scheme before the first render to prevent flash.
 *
 * Called in main.tsx of each worker BEFORE createRoot().render().
 * Uses localStorage + CSS attributes only — works without React.
 *
 * Attribute format:
 *   <html data-brand="apple|android" data-theme="light|dark">
 *
 * Legacy migration:
 *   Old format was data-style="basic|apple|..." — we map those to
 *   the new 2-brand system on first read.
 */
import { resolveLegacyStyle, type Brand, type Theme } from "./registry";

const BRAND_KEY = "wwwuabot-brand";
const LEGACY_STYLE_KEY = "wwwuabot-style";
const THEME_KEY = "wwwuabot-theme";

function resolveSystemTheme(): "light" | "dark" {
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

export function initTheme(): void {
  try {
    // ── Resolve brand ────────────────────────────────────────────────
    let brand: Brand = "apple";
    const storedBrand = localStorage.getItem(BRAND_KEY) as Brand | null;
    if (storedBrand && (storedBrand === "apple" || storedBrand === "android")) {
      brand = storedBrand;
    } else {
      // Migrate from legacy data-style format
      const legacyStyle = localStorage.getItem(LEGACY_STYLE_KEY);
      if (legacyStyle) {
        brand = resolveLegacyStyle(legacyStyle);
        localStorage.setItem(BRAND_KEY, brand);
        localStorage.removeItem(LEGACY_STYLE_KEY);
      }
    }
    document.documentElement.setAttribute("data-brand", brand);

    // ── Resolve theme (light/dark/system) ────────────────────────────
    const rawTheme = localStorage.getItem(THEME_KEY) || "system";
    const resolved: "light" | "dark" =
      rawTheme === "system" ? resolveSystemTheme() : (rawTheme as "light" | "dark");
    document.documentElement.setAttribute("data-theme", resolved);
  } catch {
    /* ignore — localStorage may be unavailable */
  }
}
