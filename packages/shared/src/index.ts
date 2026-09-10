// ── Theme / Brand System ─────────────────────────────────────────────
export { ThemeButton, useStyleTheme } from "./components/StyleToggle";
// Legacy — deprecated
export { StylePicker, ThemeToggle } from "./components/StyleToggle";

// ── Icons ─────────────────────────────────────────────────────────────
export { icons } from "./components/icons";
export type { IconName } from "./components/icons";
export { Icon } from "./components/Icon";
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
// ── Save Actions Module ──────────────────────────────────────────────
export { SaveActionButtons } from "./components/SaveActionButtons";
export type { SaveActionButtonsProps, SavingActionType } from "./components/SaveActionButtons";

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

// ── Site Types ─────────────────────────────────────────────────────
export type {
  Site,
  SiteStatus,
  SiteSettings,
  NavigationItem,
  SitePage,
  PageStatus,
  PageMeta,
  Template,
  TemplateType,
  SiteTemplateConfig,
  PageTemplateConfig,
  CatalogSite,
  SiteRow,
  SitePageRow,
  TemplateRow,
} from "./types/site.types";
export { toSite, toSitePage, toTemplate } from "./types/site.types";

// ── Site Defaults & Templates ──────────────────────────────────────
export {
  DEFAULT_SITE_SETTINGS,
  DEFAULT_HOMENavItem,
  EMPTY_PAGE_META,
  HOME_SLUG,
  isValidSlug,
  generateSlug,
  SITE_STATUS_LABELS,
  PAGE_STATUS_LABELS,
  SITE_STATUS_BADGE_CLASS,
  createNavItem,
} from "./constants/site-defaults";
export {
  ALL_SYSTEM_TEMPLATES,
  SYSTEM_PAGE_TEMPLATES,
  SYSTEM_SITE_TEMPLATES,
  getSystemTemplate,
  getSystemTemplatesByType,
} from "./constants/site-templates";

// ── Domain & API Types ───────────────────────────────────────────────
export type { MyDate, MyDateSystem, SystemAnalysisResult } from "./types/mydate";
export type { TelegramApiResponse, TelegramUser, TelegramWebhookInfo, TelegramInlineKeyboardButton } from "./types/telegram";
export type { BotUser } from "./types/user";
