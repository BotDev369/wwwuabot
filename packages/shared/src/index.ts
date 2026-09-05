// ── Theme / Brand System ─────────────────────────────────────────────
export { ThemeButton, useStyleTheme } from "./components/StyleToggle";
// Legacy — deprecated
export { StylePicker, ThemeToggle } from "./components/StyleToggle";

// ── Icons ─────────────────────────────────────────────────────────────
export { icons } from "./components/icons";
export type { IconName } from "./components/icons";
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

// ── Components ─────────────────────────────────────────────────────
export { UserProfileCard } from "./components/UserProfileCard";
export type { UserProfileData, UserProfileCardProps } from "./components/UserProfileCard";

// ── Stores ───────────────────────────────────────────────────────────
export { useAppStore } from "./stores/app.store";
export type { AppState } from "./stores/app.store";

// ── Utils ────────────────────────────────────────────────────────────
export { formatSqliteDatetime } from "./utils/datetime";
export { evaluateConditions, resolveBlock, getAvailableConditionFields } from "./utils/condition-evaluator";

// ── Page Config Types ────────────────────────────────────────────────
export type {
  BlockConditions,
  UserProfile,
  PageBlock,
  PageConfig,
  BlockContext,
  BlockZone,
} from "./types/page-config";

// ── Domain & API Types ───────────────────────────────────────────────
export type { MyDate, MyDateSystem, SystemAnalysisResult } from "./types/mydate";
export type { TelegramApiResponse, TelegramUser, TelegramWebhookInfo, TelegramInlineKeyboardButton } from "./types/telegram";
export type { BotUser } from "./types/user";
