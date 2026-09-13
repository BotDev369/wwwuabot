<!-- §13–§14: тести, чек-ліст фаз -->
> **Частина специфікації `SITES_SPEC`.** Покажчик розділів — [`docs/SITES_SPEC.md`](../SITES_SPEC.md).

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
