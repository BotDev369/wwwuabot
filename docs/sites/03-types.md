<!-- §4: типи в packages/shared -->
> **Частина специфікації `SITES_SPEC`.** Покажчик розділів — [`docs/SITES_SPEC.md`](../SITES_SPEC.md).

## 4. Типи (packages/shared)

### 4.1. `packages/shared/src/types/site.types.ts`

```typescript
// ── Статуси ──────────────────────────────────────────────────

export type SiteStatus = 'draft' | 'pending' | 'published' | 'rejected';
export type PageStatus = 'draft' | 'published';
export type TemplateType = 'site' | 'page';

// ── Сайт ─────────────────────────────────────────────────────

export interface Site {
  id: string;
  slug: string;                    // codeword = домен
  title: string;
  description?: string;
  ownerId: number;                 // Telegram user_id
  status: SiteStatus;
  templateId?: string;
  settings: SiteSettings;
  isPublic: boolean;               // додано в каталог?
  thumbnail?: string;
  rejectReason?: string;
  createdAt: string;
  updatedAt: string;
  publishedAt?: string;
}

export interface SiteSettings {
  navigation?: NavigationItem[];   // пункт меню
  theme?: 'light' | 'dark' | 'auto';
  logo?: string;
  primaryColor?: string;
  customCss?: string;
}

export interface NavigationItem {
  label: string;
  pageSlug: string;
  icon?: string;
  order: number;
}

// ── Сторінка сайту ───────────────────────────────────────────

export interface SitePage {
  id: string;
  siteId: string;
  slug: string;                    // slug в межах сайту
  title: string;
  pageData: PageConfig;            // вже існуючий тип
  orderIndex: number;
  status: PageStatus;
  meta?: PageMeta;
  createdAt: string;
  updatedAt: string;
  publishedAt?: string;
}

export interface PageMeta {
  title?: string;                  // SEO title
  description?: string;            // SEO description
  ogImage?: string;                // OG image URL
}

// ── Шаблон ───────────────────────────────────────────────────

export interface Template {
  id: string;
  name: string;
  description?: string;
  type: TemplateType;
  thumbnail?: string;
  config: SiteTemplateConfig | PageTemplateConfig;
  isSystem: boolean;
  ownerId?: number;                // undefined = system
  tags: string[];
  createdAt: string;
}

export interface SiteTemplateConfig {
  pages: Array<{
    slug: string;
    title: string;
    pageData: PageConfig;
  }>;
  settings: SiteSettings;
}

export interface PageTemplateConfig {
  pageData: PageConfig;
}

// ── Каталог ──────────────────────────────────────────────────

export interface CatalogSite {
  slug: string;
  title: string;
  description?: string;
  thumbnail?: string;
  ownerName?: string;
  tags?: string[];
  publishedAt: string;
}

// ── D1 rows (для маппінгу) ──────────────────────────────────

export interface SiteRow {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  owner_id: number;
  status: string;
  template_id: string | null;
  settings: string;                // JSON
  is_public: number;               // 0 | 1
  thumbnail: string | null;
  reject_reason: string | null;
  created_at: string;
  updated_at: string;
  published_at: string | null;
}

export interface SitePageRow {
  id: string;
  site_id: string;
  slug: string;
  title: string;
  page_data: string;               // JSON
  order_index: number;
  status: string;
  meta: string;                    // JSON
  created_at: string;
  updated_at: string;
  published_at: string | null;
}

export interface TemplateRow {
  id: string;
  name: string;
  description: string | null;
  type: string;
  thumbnail: string | null;
  config: string;                  // JSON
  is_system: number;               // 0 | 1
  owner_id: number | null;
  tags: string;                    // JSON array
  created_at: string;
}
```

### 4.2. Експорт в `packages/shared/src/types/index.ts`

Додати:
```typescript
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
} from './site.types';
```

---

