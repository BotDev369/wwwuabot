/**
 * Applies saved brand & scheme before the first render to prevent flash.
 *
 * Called in main.tsx of each worker BEFORE createRoot().render().
 * Uses localStorage + CSS attributes only — works without React.
 *
 * Attribute format:
 *   <html data-brand="apple|android" data-theme="light|dark">
 *
 * No "system" mode — defaults to "dark" if nothing stored.
 */
import { resolveLegacyStyle, type Brand } from "../styles/registry";

const BRAND_KEY = "wwwuabot-brand";
const LEGACY_STYLE_KEY = "wwwuabot-style";
const THEME_KEY = "wwwuabot-theme";

export function initTheme(): void {
  try {
    // ── Resolve brand ────────────────────────────────────────────────
    let brand: Brand = "apple";
    const storedBrand = localStorage.getItem(BRAND_KEY) as Brand | null;
    if (storedBrand && (storedBrand === "apple" || storedBrand === "android")) {
      brand = storedBrand;
    } else {
      const legacyStyle = localStorage.getItem(LEGACY_STYLE_KEY);
      if (legacyStyle) {
        brand = resolveLegacyStyle(legacyStyle);
        localStorage.setItem(BRAND_KEY, brand);
        localStorage.removeItem(LEGACY_STYLE_KEY);
      }
    }
    document.documentElement.setAttribute("data-brand", brand);

    // ── Resolve scheme (light/dark only, no system) ──────────────────
    const raw = localStorage.getItem(THEME_KEY);
    const scheme: "light" | "dark" =
      raw === "light" || raw === "dark" ? raw : "dark";
    document.documentElement.setAttribute("data-theme", scheme);
  } catch {
    /* ignore — localStorage may be unavailable */
  }
}
