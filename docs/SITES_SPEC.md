# SPEC: Sites — Конструктор сайтів

> **Версія:** 1.2 | **Дата:** 10.09.2026 · **звірено з кодом:** 12.09.2026 | **Статус:** MVP в деві

## 0. Стан на 12.09.2026 (звірено з кодом)

Документ описував майбутнє — тепер це переважно зроблене. Що перевірено пошуком по
коду й запуском гейтів:

| Твердження спеки | Факт |
|---|---|
| Таблиці `sites`, `site_pages`, `templates` | ✅ є, створюються `ensureSitesTables()` |
| Таблиця `scenarios-portal` | ❌ **не існує** — портал працює з `scenarios`, адмінка з `scenarios-admin` |
| 7 ендпоїнтів `/api/sites*` | ✅ **25** маршрутів у `api-dev/src/router.ts` — 12 сайтів, 5 шаблонів, 2 каталог, 6 адмін-модерація (переміряно 12.09.2026) |
| Роути `/sites`, `/sites/new`, `/sites/:slug`, `/catalog`, `/view/:slug` | ✅ усі в `web-platform-dev/src/app/router.tsx` |
| Роути адмінки | ⚠️ `/sites/pending` **немає** — черга на `/sites/moderation`; `/sites/:slug` (перегляд) не реалізовано |
| Редагування сторінки через PageBuilder у TWA | ❌ **заглушка** (`PageBuilderPlaceholder`); повний редактор — в адмінці (`/page-builder/:codeword`) |
| Вбудовані шаблони (4 site + 4 page) | ✅ site: `blank-site`, `portfolio`, `blog`, `business`; page: `blank-page`, `landing-page`, `business-card`, `event-page` (`packages/shared/src/constants/site-templates.ts`) |
| Unit-тести сервісів і UI `sites` | ❌ немає: жоден файл не покриває `sites.service.ts` (777 рядків), `SiteRenderer` чи сторінки-оболонки |
| Typecheck / Lint / Prettier / 182 тести | ✅ гейти CI зелені |

Куди дивитись по деталі: `docs/CONSOLIDATION_PLAN.md` §3 (актуальний план робіт) і
`docs/CONSOLIDATION_LOG.md` §4 (як робився крок 1–2 «одного дизайну»).

---

## 1. Мета

Розширити платформу WWWUABot можливістю створення **багатосторінкових сайтів** з шаблонами, навігацією та модерацією публікації.

### Необхідні можливості

| Можливість | Опис |
|---|---|
| **Сайти** | Колекція сторінок з навігацією (як звичайний конструктор сайтів) |
| **Сторінки** | Окремі сторінки з Page Builder |
| **Шаблони** | Вбудовані + користувацькі шаблони |
| **Модерація** | Адмін схвалює публікацію |
| **Каталог** | Публічний каталог опублікованих сайтів |
| **Slug** | Домен сайту = codeword = slug |

---

## 2. Архітектура

### 2.1. Розділення зон відповідальності

```
┌─────────────────────────────────────────────────────────────┐
│                    Scenarios (BOT)                          │
│  ТІЛЬКИ бот-поля: buttons, keyboard_type, caption         │
│  page_data: null (або мінімальний для rich message)       │
└─────────────────────────────────────────────────────────────┘
                          ▲
                          │ НЕ змішуємо!
                          ▼
┌─────────────────────────────────────────────────────────────┐
│                     Sites (WEB)                             │
│  slug, title, settings, navigation                         │
│  SitePages: slug, page_data, meta                          │
└─────────────────────────────────────────────────────────────┘

Спільне: packages/ui (PageRenderer, блоки, PageBuilder)
```

### 2.2. Збереження даних

| Таблиця | Воркер | Призначення |
|---|---|---|
| `scenarios` | bot-dev + api-dev | Бот-сценарії; з цієї ж таблиці читає портал (`/api/portal/scenarios/*`) |
| `scenarios-admin` | api-dev | Адмінські сторінки тих самих сценаріїв (`/api/admin/scenarios/*`) |
| `sites` | api-dev | **НОВЕ** — сайти |
| `site_pages` | api-dev | **НОВЕ** — сторінки сайтів |
| `templates` | api-dev | **НОВЕ** — шаблони |

---

## 3. Схема D1

### 3.1. Таблиця `sites`

```sql
CREATE TABLE IF NOT EXISTS sites (
  id            TEXT PRIMARY KEY,           -- UUID v4
  slug          TEXT UNIQUE NOT NULL,       -- codeword = домен сайту
  title         TEXT NOT NULL,
  description   TEXT,                       -- короткий опис для каталогу
  owner_id      INTEGER NOT NULL,           -- user_id з Telegram
  status        TEXT DEFAULT 'draft',       -- draft | pending | published | rejected
  template_id   TEXT,                       -- з якого шаблону створено (null = з нуля)
  settings      TEXT DEFAULT '{}',          -- JSON: навігація, тема, logo...
  is_public     INTEGER DEFAULT 0,          -- 1 = додано в публічний каталог
  thumbnail     TEXT,                       -- URL превʼю для каталогу
  reject_reason TEXT,                       -- причина відхилення
  created_at    TEXT,
  updated_at    TEXT,
  published_at  TEXT
);

-- Індекси
CREATE INDEX IF NOT EXISTS idx_sites_owner ON sites(owner_id);
CREATE INDEX IF NOT EXISTS idx_sites_status ON sites(status);
CREATE INDEX IF NOT EXISTS idx_sites_public ON sites(is_public, status);
CREATE UNIQUE INDEX IF NOT EXISTS idx_sites_slug ON sites(slug);
```

### 3.2. Таблиця `site_pages`

```sql
CREATE TABLE IF NOT EXISTS site_pages (
  id            TEXT PRIMARY KEY,           -- UUID v4
  site_id       TEXT NOT NULL,              -- FK → sites.id
  slug          TEXT NOT NULL,              -- slug сторінки ('home' = head)
  title         TEXT NOT NULL,
  page_data     TEXT DEFAULT '{}',          -- JSON PageConfig
  order_index   INTEGER DEFAULT 0,          -- порядок в навігації
  status        TEXT DEFAULT 'draft',       -- draft | published
  meta          TEXT DEFAULT '{}',          -- JSON: SEO, og:image...
  created_at    TEXT,
  updated_at    TEXT,
  published_at  TEXT,
  FOREIGN KEY (site_id) REFERENCES sites(id) ON DELETE CASCADE
);

-- Унікальний slug в межах сайту
CREATE UNIQUE INDEX IF NOT EXISTS idx_pages_slug ON site_pages(site_id, slug);
CREATE INDEX IF NOT EXISTS idx_pages_site ON site_pages(site_id);
```

### 3.3. Таблиця `templates`

```sql
CREATE TABLE IF NOT EXISTS templates (
  id            TEXT PRIMARY KEY,           -- UUID v4
  name          TEXT NOT NULL,
  description   TEXT,
  type          TEXT NOT NULL,              -- 'site' | 'page'
  thumbnail     TEXT,                       -- URL превʼю
  config        TEXT NOT NULL,              -- JSON: структура шаблону
  is_system     INTEGER DEFAULT 0,          -- 1 = вбудований (не видалити)
  owner_id      INTEGER,                   -- null = system, user_id = user-created
  tags          TEXT DEFAULT '[]',          -- JSON array тегів для фільтрації
  created_at    TEXT
);

CREATE INDEX IF NOT EXISTS idx_templates_type ON templates(type, is_system);
CREATE INDEX IF NOT EXISTS idx_templates_owner ON templates(owner_id);
```

---

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

## 5. API ендпоїнти (api-dev)

### 5.1. Sites (користувач)

| Метод | Маршрут | Опис |
|---|---|---|
| `POST` | `/api/sites` | Створити сайт (повертає id) |
| `GET` | `/api/sites` | Мої сайти (owner_id з auth) |
| `GET` | `/api/sites/:slug` | Отримати сайт |
| `PUT` | `/api/sites/:slug` | Оновити (title, settings, is_public) |
| `DELETE` | `/api/sites/:slug` | Видалити сайт |
| `POST` | `/api/sites/:slug/publish` | Подати на модерацію (status → pending) |
| `POST` | `/api/sites/:slug/unpublish` | Зняти з публікації (→ draft) |

### 5.2. Site Pages

| Метод | Маршрут | Опис |
|---|---|---|
| `POST` | `/api/sites/:slug/pages` | Створити сторінку |
| `GET` | `/api/sites/:slug/pages` | Всі сторінки сайту |
| `PUT` | `/api/sites/:slug/pages/:pid` | Оновити сторінку |
| `DELETE` | `/api/sites/:slug/pages/:pid` | Видалити сторінку |
| `POST` | `/api/sites/:slug/pages/:pid/publish` | Опублікувати сторінку |

### 5.3. Templates

| Метод | Маршрут | Опис |
|---|---|---|
| `GET` | `/api/templates` | Список (system + мої) |
| `GET` | `/api/templates/:id` | Отримати шаблон |
| `POST` | `/api/templates` | Створити шаблон (user) |
| `PUT` | `/api/templates/:id` | Оновити (тільки свої) |
| `DELETE` | `/api/templates/:id` | Видалити (тільки свої, не system) |

### 5.4. Catalog (публічний)

| Метод | Маршрут | Опис |
|---|---|---|
| `GET` | `/api/catalog` | Опубліковані сайти (pagination) |
| `GET` | `/api/catalog/:slug` | Сайт з каталогу |

### 5.5. Admin Moderation

| Метод | Маршрут | Опис |
|---|---|---|
| `GET` | `/api/admin/sites/pending` | Черга модерації |
| `GET` | `/api/admin/sites` | Всі сайти (з фільтрами) |
| `POST` | `/api/admin/sites/:slug/approve` | Схвалити публікацію |
| `POST` | `/api/admin/sites/:slug/reject` | Відхилити (з причиною) |
| `POST` | `/api/admin/templates` | Створити system шаблон |
| `DELETE` | `/api/admin/templates/:id` | Видалити шаблон |

---

## 6. Статуси публікації

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   DRAFT     │────►│   PENDING   │────►│  PUBLISHED  │
│  (created)  │     │  (submit)   │     │  (approved) │
└─────────────┘     └─────────────┘     └─────────────┘
                           │
                           ▼
                    ┌─────────────┐
                    │  REJECTED   │────► (back to DRAFT)
                    │  (denied)   │
                    └─────────────┘
```

| Статус | Хто бачить | Що можна |
|---|---|---|
| `draft` | Owner + Admin | Редагувати, видаляти, подавати на модерацію |
| `pending` | Owner + Admin | Чекати, зняти з модерації |
| `published` | Всі | Переглядати (public access) |
| `rejected` | Owner + Admin | Редагувати, подавати знову |

---

## 7. Маршрутизація

### 7.1. web-platform-dev (користувач)

```
/                           — головна (сценарій __base__)
/sites                      — мої сайти (авторизовані)
/sites/new                  — створити сайт (вибір шаблону)
/sites/:slug                — редактор сайту (тільки owner)
/catalog                    — публічний каталог
/view/:slug                 — публічний перегляд (published only)
*                           — catch-all: сценарії за slug
```

### 7.2. web-admin-dev (адмін)

```
/                  — головна
/scenarios         — сценарії (portal + admin в одній сторінці з табами)
/page-builder/:codeword — конструктор сторінок
/users             — користувачі
/bot-settings      — налаштування бота
/sites             — всі сайти
/sites/moderation  — черга модерації
/templates         — управління шаблонами
```

Спец у версії 1.1 писала `/sites/pending` і `/sites/:slug` — таких роутів немає
(`web-admin-dev/src/app/router.tsx`).

---

## 8. Структура файлів

### 8.1. packages/shared

```
src/types/
  ├── page-config.ts            # PageConfig (ВЖЕ Є)
  ├── site.types.ts             # Site, SitePage, Template (НОВЕ)
  └── index.ts                  # Re-exports (ОНОВИТИ)

src/constants/
  ├── site-defaults.ts          # Дефолтні налаштування (НОВЕ)
  └── site-templates.ts         # Вбудовані шаблони (НОВЕ)
```

### 8.2. packages/ui

```
src/
  ├── PageRenderer.tsx          # Рендер сторінки (ВЖЕ Є)
  ├── SiteRenderer.tsx          # Рендер сайту з навігацією (НОВЕ)
  └── blocks/                   # Блоки (ВЖЕ Є)
```

### 8.3. api-dev

```
src/controllers/
  ├── sites.controller.ts           # CRUD сайтів (НОВЕ)
  ├── site-pages.controller.ts      # CRUD сторінок сайтів (НОВЕ)
  ├── templates.controller.ts       # CRUD шаблонів (НОВЕ)
  ├── catalog.controller.ts         # Публічний каталог (НОВЕ)
  └── sites-admin.controller.ts     # Адмін модерація (НОВЕ)

src/services/
  └── sites.service.ts              # Бізнес-логіка (НОВЕ)

src/router.ts                       # Додати маршрути (ОНОВИТИ)
```

### 8.4. web-platform-dev

```
src/pages/
  ├── MySitesPage.tsx               # Мої сайти (НОВЕ)
  ├── SiteEditorPage.tsx            # Редактор сайту (НОВЕ)
  ├── SitePreviewPage.tsx           # Попередній перегляд (НОВЕ)
  ├── PublicCatalogPage.tsx         # Публічний каталог (НОВЕ)
  └── SiteViewPage.tsx              # Публічний перегляд (НОВЕ)

src/features/site-builder/
  ├── SiteBuilder.tsx               # Головний компонент (НОВЕ)
  ├── PageList.tsx                  # Список сторінок (НОВЕ)
  ├── NavigationEditor.tsx          # Редактор навігації (НОВЕ)
  ├── TemplatePicker.tsx            # Вибір шаблону (НОВЕ)
  └── types.ts                     # Локальні типи (НОВЕ)

# ⚠️ 12.09.2026: `SiteBuilder.tsx`, `PageList.tsx`, `NavigationEditor.tsx`,
# `SiteSettingsPanel.tsx`, `useSiteBuilder.ts` і `useSiteApi.ts` тут не з'явились —
# їх замінив `pages/site-editor/*` (11 файлів). `useSiteApi.ts` був недосяжним і його
# видалено разом із 74 мертвими файлами (`docs/CODE_QUALITY_AUDIT.md` §4.1).

src/app/router.tsx                  # Додати маршрути (ОНОВИТИ)
```

### 8.5. web-admin-dev

```
src/pages/
  ├── SitesPage.tsx                 # Список сайтів (НОВЕ)
  ├── SitesModerationPage.tsx       # Модерація (НОВЕ)
  └── TemplatesPage.tsx             # Шаблони (НОВЕ)

src/features/moderation/            # ⚠️ не існує: легасі-хук видалено 12.09.2026
                                    # (модерація живе в `pages/sites/SitesModerationPage.tsx`)

src/features/template-manager/
  ├── TemplateManager.tsx           # Менеджер шаблонів (НОВЕ)
  ├── useTemplates.ts              # Хук (НОВЕ)
  └── types.ts                      # Локальні типи (НОВЕ)

src/app/router.tsx                  # Додати маршрути (ОНОВИТИ)
```

---

## 9. Вбудовані шаблони

### 9.1. Site Templates

| ID | Назва | Опис | Сторінки |
|---|---|---|---|
| `blank-site` | Порожній сайт | Мінімальний сайт | home |
| `portfolio` | Портфоліо | Сайт-портфоліо | home, projects, contacts |
| `blog` | Блог | Простий блог | home, posts, about |
| `business` | Бізнес-сайт | Корпоративний сайт | home, services, about, contacts |

### 9.2. Page Templates

| ID | Назва | Опис |
|---|---|---|
| `landing-page` | Лендінг | Hero + features + CTA |
| `business-card` | Візитка | Контакти + посилання |
| `event-page` | Сторінка події | Дата + опис + реєстрація |
| `blank-page` | Порожня сторінка | Чистий аркуш |

---

## 10. UI компоненти

### 10.1. SiteRenderer (packages/ui)

Рендерить багатосторінковий сайт з навігацією:

```tsx
<SiteRenderer
  site={site}              // Site конфігурація
  pages={pages}            // SitePage[]
  currentSlug="home"       // поточна сторінка
  context={context}        // BlockContext
  mode="preview"           // preview | public
/>
```

### 10.2. SiteBuilder (web-platform)

Інтерфейс створення/редагування сайту:

```
┌─────────────────────────────────────────────────────────────┐
│  SiteBuilder                                                │
├─────────────────────────────────────────────────────────────┤
│  ┌──────────┐  ┌────────────────────────────────────────┐  │
│  │ PageList │  │  PageEditor (PageBuilder)              │  │
│  │          │  │                                        │  │
│  │ • home   │  │  [Zone: main]                         │  │
│  │ • about  │  │  ┌────────────────────────────────┐   │  │
│  │ • contacts│ │  │ HeroBlock                      │   │  │
│  │          │  │  │ Title: "Welcome"               │   │  │
│  │ [+ Add]  │  │  └────────────────────────────────┘   │  │
│  └──────────┘  │  ┌────────────────────────────────┐   │  │
│                │  │ TextBlock                      │   │  │
│                │  │ Content: "About us..."         │   │  │
│                │  └────────────────────────────────┘   │  │
│                │  [+ Add Block]                        │  │
│                └────────────────────────────────────────┘  │
│  [Settings] [Preview] [Publish]                           │
└─────────────────────────────────────────────────────────────┘
```

---

## 11. Workflow

### 11.1. Створення сайту

1. Користувач натискає "Створити сайт"
2. Обирає шаблон (або blank)
3. Вводить slug (= домен сайту)
4. Створюється Site + перша SitePage (home)
5. Відкривається SiteBuilder

### 11.2. Редагування

1. Додає/видаляє сторінки
2. Редагує контент через PageBuilder
3. Налаштовує навігацію
4. Зберігає (status = draft)

### 11.3. Публікація

1. Натискає "Опублікувати"
2. Status → pending
3. Адмін бачить в модерації
4. Схвалює → status → published
5. Сайт з'являється в каталозі (якщо is_public = 1)

### 11.4. Відхилення

1. Адмін відхиляє з причиною
2. Status → rejected
3. Користувач бачить причину
4. Виправляє і подає знову

---

## 12. Правила

### 12.1. Crystal Clarity Rule

- Файли < 200 рядків
- Компонент = рендеринг
- Хук = логіка
- Хелпер = чисті функції

### 12.2. Дизайн-система

- CSS-токени (не хардкодити кольори)
- `<Icon />` (не емоджі)
- Модалки (не дропдауни)
- `.wb-*` класи

### 12.3. API

- Всі ендпоїнти в api-dev
- Cookie-based auth
- JSON відповіді

---

## 13. Тести

### 13.1. Що покрито зараз (виміряно 12.09.2026)

Усього **182 тести в 22 файлах**, і жоден із них не про sites. Покриті сусідні шари:

| Файл | Що перевіряє |
|---|---|
| `api-dev/src/router.test.ts`, `router-input.test.ts` | маршрутизація, валідація входу, 404/500 без деталей назовні |
| `api-dev/src/controllers/templates.controller.test.ts` | шаблони (5 тестів) |
| `api-dev/src/controllers/health.controller.test.ts` | `/health`, `/health/deep` |
| `api-dev/src/services/users.service.test.ts` | користувачі |
| `packages/ui/src/PageRenderer.test.tsx`, `PermissionGate.test.tsx` | рендер сторінки й доступ — те, чим рендеряться сайти |
| `packages/shared/src/constants/block-definitions.test.ts` | цілісність реєстру блоків |

### 13.2. Чого немає (і це найбільша діра)

- `api-dev/src/services/sites.service.ts` (777 рядків) — нуль тестів: публікація, модерація,
  права власника й каталог перевіряються тільки вручну.
- `packages/ui/src/SiteRenderer.tsx` — рендер сайту з `page_data`.
- Сторінки-оболонки (`MySitesPage`, `SiteEditorPage`, `SitesPage`, `SitesModerationPage`).
- Workflow публікації як послідовність (draft → pending → published → rejected).

Це пункт 1 у плані робіт: `docs/CONSOLIDATION_PLAN.md` §3.

---

## 14. Чек-ліст реалізації

### Фаза 1: Типи ✅
- [x] `packages/shared/src/types/site.types.ts`
- [x] `packages/shared/src/constants/site-defaults.ts`
- [x] `packages/shared/src/constants/site-templates.ts`
- [x] Оновити `packages/shared/src/index.ts` (exports)
- [x] Оновити `packages/shared/package.json` (exports)

### Фаза 2: API ✅
- [x] `api-dev/src/services/sites.service.ts`
- [x] `api-dev/src/controllers/sites.controller.ts`
- [x] `api-dev/src/controllers/site-pages.controller.ts`
- [x] `api-dev/src/controllers/templates.controller.ts`
- [x] `api-dev/src/controllers/catalog.controller.ts`
- [x] `api-dev/src/controllers/sites-admin.controller.ts`
- [x] Оновити `api-dev/src/router.ts`

### Фаза 3: D1 міграція ✅
- [x] `ensureSitesTables()` в `sites.service.ts` (CREATE TABLE IF NOT EXISTS)

### Фаза 4: UI — packages/ui ✅
- [x] `packages/ui/src/SiteRenderer.tsx`
- [x] Оновити `packages/ui/package.json` (exports)

### Фаза 5: UI — web-platform ✅
- [x] `src/pages/MySitesPage.tsx`
- [x] `src/pages/SiteEditorPage.tsx` (з навігацією, налаштуваннями, превʼю)
- [x] `src/pages/SiteNewPage.tsx` (вибір шаблону + створення)
- [x] `src/pages/PublicCatalogPage.tsx`
- [x] `src/pages/SiteViewPage.tsx`
- [x] `src/features/site-builder/TemplatePicker.tsx` (візуальний вибір)
- [x] Оновити `src/app/router.tsx`

> **Звірено 12.09.2026:** `useSiteApi.ts` тут був позначений як ✅, але жоден живий файл
> його не імпортував — його видалено. Редактор сайту — `src/pages/site-editor/` (11 файлів).

### Фаза 6: UI — web-admin ✅
- [x] `src/pages/sites/SitesPage.tsx`
- [x] `src/pages/sites/SitesModerationPage.tsx`
- [x] `src/pages/sites/TemplatesPage.tsx`
- ~~`src/features/moderation/useModeration.ts`~~ — легасі, видалено 12.09.2026 (не імпортувався)
- [x] Оновити `adminNav.store.ts` (секція Сайти)
- [x] Оновити `src/app/router.tsx`

### Фаза 7: Шаблони ✅
- [x] Вбудовані site-шаблони (blank, portfolio, blog, business)
- [x] Вбудовані page-шаблони (landing, business-card, event, blank)
- [x] Застосування шаблону при створенні (SiteNewPage → applyTemplate)

### Фаза 8: Тести ❌ (наступна)
- [ ] Unit тести сервісів (`sites.service.ts` — 777 рядків без покриття)
- [ ] Unit тести UI компонентів (`SiteRenderer`, сторінки-оболонки)
- [x] Typecheck: `npm run typecheck` — чисто на 6 воркспейсах
- [x] Lint: `npm run lint` — 0 errors, 0 warnings
- [x] Prettier: `npx prettier --check .` — гейт CI
- [ ] Повний PageBuilder у TWA (зараз `PageBuilderPlaceholder`)

---

## 15. Ризики

| Ризик | Вплив | Мітігатор |
|---|---|---|
| Конфлікт slug з існуючими scenarios | Середній | Унікальний індекс + валідація |
| Складність SiteRenderer | Середній | MVP: проста навігація, потім розширюємо |
| Шаблони можуть застаріти | Низький | System templates + user templates |
| Модерація уповільнить публікацію | Низький | Адмін схвалює в один клік у черзі `/sites/moderation` |

---

## 16. Success Criteria (звірено 12.09.2026)

- [x] Користувач може створити сайт з шаблону (`/sites/new` → `TemplatePicker`)
- [x] Користувач може додавати/видаляти сторінки (вкладка «Сторінки», спільний діалог замість `prompt`)
- [ ] Кожна сторінка редагується через PageBuilder — **лише в адмінці**; у TWA заглушка
- [x] Навігація працює між сторінками (`SiteRenderer` + вкладка «Меню»)
- [x] Публікація потребує модерації (status → `pending`)
- [x] Адмін може схвалити/відхилити (`/sites/moderation`, причина відхилення)
- [x] Публічний каталог показує опубліковані сайти (`/catalog`)
- [x] Slug = домен сайту (`sites.slug`, унікальний індекс)
- [x] Typecheck проходить без помилок
- [x] Lint проходить без помилок
- [ ] Типи `Site`, `SitePage`, `Template` покриті тестами — див. §13

---

*Документ створено для відстеження прогресу та відновлення контексту при перервах.*
