// ── Theme / Brand System ─────────────────────────────────────────────
export { ThemeButton, useStyleTheme } from "./components/StyleToggle";
// Legacy — deprecated
export { StylePicker, ThemeToggle } from "./components/StyleToggle";

// ── Три кольори користувача (фон / основний / акцент) ────────────────
export { ThemeColorPanel, ThemeSheet, useUserColors } from "./components/theme";
export type { ThemeColorPanelProps, UseUserColorsResult } from "./components/theme";
export { COLOR_PRESETS, isPresetActive } from "./styles/color-presets";
export type { ColorPreset } from "./styles/color-presets";
export {
  COLOR_SLOTS,
  COLORS_ATTR,
  COLORS_MODE_ATTR,
  USER_COLORS_KEY,
  applyColors,
  clearStoredColors,
  colorsMode,
  contrastWarning,
  displayColor,
  isCompleteColors,
  isSameColors,
  missingLabels,
  missingSlots,
  onAccentColor,
  parseStoredColors,
  readStoredColors,
  saveStoredColors,
  seedVariable,
} from "./styles/user-colors";
export type {
  ColorDraft,
  ColorSlot,
  ColorSlotDefinition,
  ColorsMode,
  UserColors,
} from "./styles/user-colors";
export { contrastRatio, hexToHsl, hexToRgb, hslToHex, rgbToHex } from "./styles/color";
export type { Hsl, Rgb } from "./styles/color";

// ── Icons ─────────────────────────────────────────────────────────────
export { icons } from "./components/icons";
export type { IconName } from "./components/icons";
export { Icon } from "./components/Icon";
export {
  BRANDS,
  getBrand,
  getBrandIds,
  resolveLegacyStyle,
  LEGACY_STYLE_MAP,
} from "./styles/registry";
export type { Brand, Scheme, Theme, BrandDefinition, StyleId } from "./styles/registry";
// Legacy re-exports (deprecated — use BRANDS/getBrand instead)
export { STYLES, getStyle, getStyleIds } from "./styles/registry";

// ── App ──────────────────────────────────────────────────────────────
export { initTheme } from "./app/initTheme";
export {
  applyChromeColors,
  initTelegramChrome,
  isTelegramWebApp,
  normalizeChromeColor,
  readChromeColor,
  readChromeColors,
} from "./app/telegram-chrome";

// ── API ──────────────────────────────────────────────────────────────
export { apiFetch } from "./api/client";
export type { ApiClientOptions } from "./api/client";

// ── Layout ───────────────────────────────────────────────────────────
export { Footer } from "./layout/Footer";

// ── Components ─────────────────────────────────────────────────────
export { UserProfileCard } from "./components/UserProfileCard";
export type { UserProfileData, UserProfileCardProps } from "./components/UserProfileCard";
/** Рядок «підпис → значення» картки профілю — щоб оболонки не малювали свій. */
export { FieldRow as UserProfileField } from "./components/user-profile/FieldRow";
/** Блок «ім'я на платформі» окремо від картки — сторінка акаунта складається з нього. */
export { PlatformHandle } from "./components/user-profile/PlatformHandle";
/** Обліковий рядок: два фото й два імені (`#` — платформа, `@` — Telegram). */
export { UserAccountRow } from "./components/user-profile/AccountRow";
export type { UserAccountRowProps } from "./components/user-profile/AccountRow";
/**
 * Два підсписки акаунта — по одному на розділ (`/profile/account`):
 * `UserProfileDataSection` — роль, тариф, статус, права (наше),
 * `UserTelegramDataSection` — усе, що віддав Telegram, як є.
 */
export { DatabaseSection as UserProfileDataSection } from "./components/user-profile/DatabaseSection";
export { TelegramSection as UserTelegramDataSection } from "./components/user-profile/TelegramSection";
/** Картка розділу профілю (заголовок + рамка) — її складає той, хто рендерить розділ. */
export { ProfileCard as UserProfileSection } from "./components/user-profile/ProfileCard";
/** «Про себе» — блок із правкою на місці (платформа) або без неї (чужий профіль). */
export { AboutField } from "./components/user-profile/AboutField";
/** Публічність профілю: головний перемикач і поля під ним. */
export { PublicProfileControls } from "./components/user-profile/PublicProfileControls";
export type { PublicProfileChange } from "./components/user-profile/PublicProfileControls";
/** Перемикач «увімкнено / вимкнено» — спільний кирпичик (не галочка). */
export { SwitchRow } from "./components/Switch";
/** Картка людини в Просторі: лише відкриті поля, жодних даних Telegram. */
export { PublicUserCard } from "./components/space/PublicUserCard";
/** Круг акаунта в розділі: фото, а як його немає — літера. */
export { AccountAvatar } from "./components/user-profile/AccountAvatar";
/** Два акаунти однієї людини — чисті функції (див. `user-profile/account.ts`). */
export {
  accountInitial,
  platformLabel,
  platformPhoto,
  telegramHandle,
  telegramIsPremium,
  telegramLanguage,
  telegramName,
  telegramPhoto,
} from "./components/user-profile/account";
// ── Save Actions Module ──────────────────────────────────────────────
export { SaveActionButtons } from "./components/SaveActionButtons";
export type { SaveActionButtonsProps, SavingActionType } from "./components/SaveActionButtons";

// ── Stores ───────────────────────────────────────────────────────────
export { useAppStore } from "./stores/app.store";
export type { AppState } from "./stores/app.store";

// ── Ім'я на платформі (wwwuabot) — не Telegram username ──────────────
export {
  PLATFORM_USERNAME_MAX,
  PLATFORM_USERNAME_MIN,
  PLATFORM_USERNAME_MESSAGES,
  PLATFORM_USERNAME_RULES,
  RESERVED_PLATFORM_USERNAMES,
  formatPlatformUsername,
  normalizePlatformUsername,
  validatePlatformUsername,
} from "./user/platform-username";
export type {
  PlatformUsernameError,
  PlatformUsernameResult,
  PlatformUsernameRules,
} from "./user/platform-username";

// ── Публічний профіль: що про людину бачать інші ─────────────────────
export {
  ABOUT_MAX_LENGTH,
  DEFAULT_OPEN_FIELDS,
  PUBLIC_FIELD_LABELS,
  PUBLIC_PROFILE_FIELDS,
  isEmptyPublicProfile,
  isProfilePublic,
  isPublicProfileField,
  parsePublicFields,
  publicProfileLabel,
  publicProfileView,
  serializePublicFields,
  validateAbout,
} from "./user/public-profile";
export type {
  AboutResult,
  PublicProfile,
  PublicProfileField,
  PublicProfileSource,
} from "./user/public-profile";

// ── Utils ────────────────────────────────────────────────────────────
export { formatSqliteDatetime } from "./utils/datetime";
export {
  evaluateConditions,
  resolveBlock,
  getAvailableConditionFields,
} from "./utils/condition-evaluator";

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
export type {
  TelegramApiResponse,
  TelegramUser,
  TelegramWebhookInfo,
  TelegramInlineKeyboardButton,
} from "./types/telegram";
export type { BotUser } from "./types/user";
