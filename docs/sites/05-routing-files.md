<!-- §7–§8: маршрути, структура файлів -->
> **Частина специфікації `SITES_SPEC`.** Покажчик розділів — [`docs/SITES_SPEC.md`](../SITES_SPEC.md).

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

