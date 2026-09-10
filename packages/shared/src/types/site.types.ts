/**
 * Sites — типи для конструктора сайтів.
 *
 * Цей файл містить ТІЛЬКИ інтерфейси та типи.
 * Дефолтні значення — у site-defaults.ts.
 * Шаблони — у site-templates.ts.
 *
 * @module packages/shared/src/types/site.types
 */

import type { PageConfig } from "./page-config";

// ── Статуси ──────────────────────────────────────────────────

/** Статус сайту в життєвому циклі. */
export type SiteStatus = "draft" | "pending" | "published" | "rejected";

/** Статус сторінки сайту. */
export type PageStatus = "draft" | "published";

/** Тип шаблону. */
export type TemplateType = "site" | "page";

// ── Сайт ─────────────────────────────────────────────────────

/**
 * Сайт — колекція сторінок з навігацією.
 *
 * slug = codeword = домен сайту (напр. t.me/WWWUABot/{slug}).
 */
export interface Site {
  /** Унікальний ідентифікатор (UUID v4). */
  id: string;

  /** Slug сайту — унікальний, використовується як домен. */
  slug: string;

  /** Назва сайту. */
  title: string;

  /** Короткий опис (для каталогу). */
  description?: string;

  /** user_id власника (Telegram). */
  ownerId: number;

  /** Статус публікації. */
  status: SiteStatus;

  /** ID шаблону, з якого створено (null = з нуля). */
  templateId?: string;

  /** Налаштування сайту (навігація, тема, тощо). */
  settings: SiteSettings;

  /** Чи додано в публічний каталог. */
  isPublic: boolean;

  /** URL превʼю для каталогу. */
  thumbnail?: string;

  /** Причина відхилення (якщо status = rejected). */
  rejectReason?: string;

  /** Дата створення (ISO). */
  createdAt: string;

  /** Дата оновлення (ISO). */
  updatedAt: string;

  /** Дата публікації (ISO, якщо status = published). */
  publishedAt?: string;
}

/**
 * Налаштування сайту.
 *
 * Зберігається як JSON в колонці `settings` таблиці `sites`.
 */
export interface SiteSettings {
  /** Пункти навігації. */
  navigation?: NavigationItem[];

  /** Тема сайту. */
  theme?: "light" | "dark" | "auto";

  /** URL логотипу. */
  logo?: string;

  /** Основний колір (hex). */
  primaryColor?: string;

  /** Користувацький CSS. */
  customCss?: string;
}

/**
 * Пункт навігації.
 *
 * Визначає порядок сторінок у меню сайту.
 */
export interface NavigationItem {
  /** Текст пункту меню. */
  label: string;

  /** Slug сторінки, на яку веде. */
  pageSlug: string;

  /** Іконка (назва з реєстру icons.tsx). */
  icon?: string;

  /** Порядок (починається з 0). */
  order: number;
}

// ── Сторінка сайту ───────────────────────────────────────────

/**
 * Сторінка сайту — один екран в межах сайту.
 *
 * Кожна сторінка має власний slug та PageConfig.
 */
export interface SitePage {
  /** Унікальний ідентифікатор (UUID v4). */
  id: string;

  /** ID батьківського сайту. */
  siteId: string;

  /** Slug сторінки в межах сайту ('home' = головна). */
  slug: string;

  /** Назва сторінки. */
  title: string;

  /** Конфігурація Page Builder. */
  pageData: PageConfig;

  /** Порядок в навігації (починається з 0). */
  orderIndex: number;

  /** Статус публікації. */
  status: PageStatus;

  /** Метадані (SEO). */
  meta?: PageMeta;

  /** Дата створення (ISO). */
  createdAt: string;

  /** Дата оновлення (ISO). */
  updatedAt: string;

  /** Дата публікації (ISO). */
  publishedAt?: string;
}

/**
 * Метадані сторінки (SEO, OG tags).
 */
export interface PageMeta {
  /** SEO title (якщо відрізняється від SitePage.title). */
  title?: string;

  /** Meta description. */
  description?: string;

  /** OG image URL. */
  ogImage?: string;
}

// ── Шаблон ───────────────────────────────────────────────────

/**
 * Шаблон — передвизначена структура сайту або сторінки.
 *
 * Може бути system (вбудований) або user (створений користувачем).
 */
export interface Template {
  /** Унікальний ідентифікатор (UUID v4). */
  id: string;

  /** Назва шаблону. */
  name: string;

  /** Опис шаблону. */
  description?: string;

  /** Тип: 'site' (багатосторінковий) або 'page' (одна сторінка). */
  type: TemplateType;

  /** URL превʼю. */
  thumbnail?: string;

  /** Конфігурація шаблону (залежить від типу). */
  config: SiteTemplateConfig | PageTemplateConfig;

  /** Чи є вбудованим (не можна видалити). */
  isSystem: boolean;

  /** ID власника (undefined = system template). */
  ownerId?: number;

  /** Теги для фільтрації. */
  tags: string[];

  /** Дата створення (ISO). */
  createdAt: string;
}

/**
 * Конфігурація site-шаблону.
 *
 * Містить структуру сторінок та налаштування.
 */
export interface SiteTemplateConfig {
  /** Сторінки шаблону. */
  pages: Array<{
    /** Slug сторінки. */
    slug: string;

    /** Назва сторінки. */
    title: string;

    /** Конфігурація Page Builder. */
    pageData: PageConfig;
  }>;

  /** Налаштування сайту. */
  settings: SiteSettings;
}

/**
 * Конфігурація page-шаблону.
 *
 * Містить лише PageConfig для однієї сторінки.
 */
export interface PageTemplateConfig {
  /** Конфігурація Page Builder. */
  pageData: PageConfig;
}

// ── Каталог ──────────────────────────────────────────────────

/**
 * Сайт в публічному каталозі.
 *
 * Скорочена версія для списку.
 */
export interface CatalogSite {
  /** Slug сайту. */
  slug: string;

  /** Назва сайту. */
  title: string;

  /** Опис. */
  description?: string;

  /** URL превʼю. */
  thumbnail?: string;

  /** Іʼм автора (якщо публічний). */
  ownerName?: string;

  /** Теги. */
  tags?: string[];

  /** Дата публікації (ISO). */
  publishedAt: string;
}

// ── D1 rows (для маппінгу) ──────────────────────────────────

/**
 * Рядок таблиці `sites` з D1.
 *
 * JSON-колонки зберігаються як рядки, потребують парсингу.
 */
export interface SiteRow {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  owner_id: number;
  status: string;
  template_id: string | null;
  settings: string;               // JSON
  is_public: number;              // 0 | 1
  thumbnail: string | null;
  reject_reason: string | null;
  created_at: string;
  updated_at: string;
  published_at: string | null;
}

/**
 * Рядок таблиці `site_pages` з D1.
 */
export interface SitePageRow {
  id: string;
  site_id: string;
  slug: string;
  title: string;
  page_data: string;              // JSON
  order_index: number;
  status: string;
  meta: string;                   // JSON
  created_at: string;
  updated_at: string;
  published_at: string | null;
}

/**
 * Рядок таблиці `templates` з D1.
 */
export interface TemplateRow {
  id: string;
  name: string;
  description: string | null;
  type: string;
  thumbnail: string | null;
  config: string;                 // JSON
  is_system: number;              // 0 | 1
  owner_id: number | null;
  tags: string;                   // JSON array
  created_at: string;
}

// ── Маппінг функції ─────────────────────────────────────────

/** Перетворює SiteRow на Site. */
export function toSite(row: SiteRow): Site {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    description: row.description ?? undefined,
    ownerId: row.owner_id,
    status: row.status as SiteStatus,
    templateId: row.template_id ?? undefined,
    settings: safeParseJson<SiteSettings>(row.settings, {}),
    isPublic: row.is_public === 1,
    thumbnail: row.thumbnail ?? undefined,
    rejectReason: row.reject_reason ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    publishedAt: row.published_at ?? undefined,
  };
}

/** Перетворює SitePageRow на SitePage. */
export function toSitePage(row: SitePageRow): SitePage {
  return {
    id: row.id,
    siteId: row.site_id,
    slug: row.slug,
    title: row.title,
    pageData: safeParseJson<PageConfig>(row.page_data, {
      version: 1,
      zones: { sidebar: [], header: [], main: [], footer: [] },
    }),
    orderIndex: row.order_index,
    status: row.status as PageStatus,
    meta: safeParseJson<PageMeta | undefined>(row.meta, undefined),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    publishedAt: row.published_at ?? undefined,
  };
}

/** Перетворює TemplateRow на Template. */
export function toTemplate(row: TemplateRow): Template {
  const config = safeParseJson<SiteTemplateConfig | PageTemplateConfig>(
    row.config,
    { pageData: { version: 1, zones: { sidebar: [], header: [], main: [], footer: [] } } } as unknown as PageTemplateConfig,
  );

  return {
    id: row.id,
    name: row.name,
    description: row.description ?? undefined,
    type: row.type as TemplateType,
    thumbnail: row.thumbnail ?? undefined,
    config,
    isSystem: row.is_system === 1,
    ownerId: row.owner_id ?? undefined,
    tags: safeParseJson<string[]>(row.tags, []),
    createdAt: row.created_at,
  };
}

// ── Helpers ──────────────────────────────────────────────────

/** Безпечний JSON.parse з fallback. */
function safeParseJson<T>(value: string | null, fallback: T): T {
  if (!value) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}
