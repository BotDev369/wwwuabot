// ── Theme / Brand System ─────────────────────────────────────────────
export { ThemeButton, useStyleTheme } from "./components/StyleToggle";
// Legacy — deprecated
export { StylePicker, ThemeToggle } from "./components/StyleToggle";
export { BRANDS, getBrand, getBrandIds, resolveLegacyStyle, LEGACY_STYLE_MAP } from "./styles/registry";
export type { Brand, Scheme, Theme, BrandDefinition, StyleId } from "./styles/registry";
// Legacy re-exports (deprecated — use BRANDS/getBrand instead)
export { STYLES, getStyle, getStyleIds } from "./styles/registry";

// ── App ──────────────────────────────────────────────────────────────
export { initTheme } from "./app/initTheme";

// ── API ──────────────────────────────────────────────────────────────
export { apiFetch } from "./api/client";
export type { ApiClientOptions } from "./api/client";

// ── Layout ───────────────────────────────────────────────────────────
export { Footer } from "./layout/Footer";

// ── Stores ───────────────────────────────────────────────────────────
export { useAppStore } from "./stores/app.store";
export type { AppState } from "./stores/app.store";

// ── Utils ────────────────────────────────────────────────────────────
export { formatSqliteDatetime } from "./utils/datetime";
