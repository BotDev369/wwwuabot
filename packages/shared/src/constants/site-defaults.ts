/**
 * Sites — дефолтні значення.
 *
 * @module packages/shared/src/constants/site-defaults
 */

import type { SiteSettings, NavigationItem, PageMeta } from "../types/site.types";

// ── Site Settings ────────────────────────────────────────────

/** Дефолтні налаштування сайту. */
export const DEFAULT_SITE_SETTINGS: SiteSettings = {
  navigation: [],
  theme: "auto",
  logo: "",
  primaryColor: "",
  customCss: "",
};

// ── Navigation ───────────────────────────────────────────────

/** Створює пункт навігації. */
export function createNavItem(
  label: string,
  pageSlug: string,
  order: number,
  icon?: string,
): NavigationItem {
  return { label, pageSlug, order, icon };
}

/** Дефолтний перший пункт навігації (home). */
export const DEFAULT_HOMENavItem: NavigationItem = {
  label: "Головна",
  pageSlug: "home",
  order: 0,
  icon: "home",
};

// ── Page Meta ────────────────────────────────────────────────

/** Порожні метадані сторінки. */
export const EMPTY_PAGE_META: PageMeta = {
  title: "",
  description: "",
  ogImage: "",
};

// ── Slugs ────────────────────────────────────────────────────

/** Slug для головної сторінки. */
export const HOME_SLUG = "home";

/** Допустимі символи в slug. */
const SLUG_SAFE_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/** Максимальна довжина slug. */
export const MAX_SLUG_LENGTH = 64;

/**
 * Валідує slug.
 *
 * @returns `true` якщо slug допустимий.
 */
export function isValidSlug(slug: string): boolean {
  if (!slug || slug.length > MAX_SLUG_LENGTH) return false;
  return SLUG_SAFE_RE.test(slug);
}

/**
 * Генерує slug з назви.
 *
 * @example
 * generateSlug("Мій Сайт!") // → "мій-сайт"
 */
export function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^\p{L}\p{N}\s-]/gu, "") // видаляємо все окрім літер, цифр, пробілів, дефісів
    .replace(/[\s_]+/gu, "-")           // пробіли/підкреслення → дефіс
    .replace(/-+/gu, "-")              // кілька дефісів → один
    .replace(/^-|-$/gu, "")            // прибираємо дефіси на початку/кінці)
    .slice(0, MAX_SLUG_LENGTH);
}

// ── Status labels ────────────────────────────────────────────

/** Мітки статусів для UI. */
export const SITE_STATUS_LABELS: Record<string, string> = {
  draft: "Чернетка",
  pending: "На модерації",
  published: "Опубліковано",
  rejected: "Відхилено",
};

/** Мітки статусів сторінок для UI. */
export const PAGE_STATUS_LABELS: Record<string, string> = {
  draft: "Чернетка",
  published: "Опубліковано",
};

/** CSS-класи для бейджів статусів. */
export const SITE_STATUS_BADGE_CLASS: Record<string, string> = {
  draft: "wb-badge wb-badge-neutral",
  pending: "wb-badge wb-badge-yellow",
  published: "wb-badge wb-badge-green",
  rejected: "wb-badge wb-badge-red",
};
