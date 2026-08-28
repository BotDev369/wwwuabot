# Аудит проєкту wwwuabot — детальний розбір і план стандартизації

**Дата аудиту:** 25.08.2026
**Останнє оновлення:** 28.08.2026
**Що перевірено:** структура 4 Cloudflare Workers (`bot/`, `api/`, `web/`, `web-admin/`), конфіги (`wrangler.toml`, `package.json`), ключові файли роутингу/логіки, стилі, наскрізні патерни.

**Загальний висновок (оновлено 28.08.2026):** архітектура `bot/` залишається еталонною. `api/` розбитий на router+controllers. `web/` і `web-admin/` тепер мають **100% ідентичний стек** (React 19, Vite 8, Tailwind 4, Zustand, createBrowserRouter, feature-based structure). Основні проблеми, що залишились: MyDatesPage потребує розбиття на features (P2-2), web-admin worker.ts містить API-маршрути (тимчасовий виняток), тестів досі немає.

## Статус задач (оновлено 28.08.2026)

| ID | Статус | Коментар |
|---|---|---|
| P0-1 | ✅ Виконано | `web-admin/wrangler.toml` має `[env.dev]` + `[env.production]` |
| P0-2 | ✅ Виконано | Єдиний ESLint+Prettier на всі 4 сервіси, `.editorconfig` |
| P1-1 | ✅ Виконано | `api/` розбитий на `router.ts` + 4 контролери + `shared/` |
| P1-2 | ✅ Виконано | `withAutoMigrate` скопійовано в `api/src/shared/` |
| P1-3 | ✅ Виконано | `formatSqliteDatetime()` в `packages/shared/` |
| P1-4 | ✅ Виконано | `VALID_TYPES` об'єднано в одну константу |
| P2-1 | ⬜ Заплановано | 101 використання `any` |
| P2-2 | ⬜ Заплановано | `MyDatesPage.tsx` — 1167 рядків, потребує розбиття на `features/my-dates/` |
| P2-3 | ✅ Виконано | npm workspaces + `packages/shared/` існують та використовуються |
| P2-4 | ✅ Виконано | Логер `apiLog` в `api/`, `console.log` прибрано |
| P3-1 | ⬜ Заплановано | Змішані стилі в `web-admin` (CSS + Tailwind) |
| P3-2 | ✅ Виконано | `compatibility_date` вирівняно: всі 4 = 2026-08-21 |
| P3-3 | ✅ Виконано | React/Vite/TS вирівняно: web і web-admin мають однакові версії |
| CI-1 | ✅ Виконано | GitHub Actions з `npx wrangler`, path filtering, npm audit |

### web/web-admin рефакторинг (нові задачі 28.08.2026)

| ID | Статус | Коментар |
|---|---|---|
| WA-REF1 | ✅ Виконано | web/package.json: React 19, Vite 8, Tailwind 4, Zustand, cloudflare plugin |
| WA-REF2 | ✅ Виконано | web/vite.config.ts: cloudflare(), tailwindcss(), @ alias |
| WA-REF3 | ✅ Виконано | web/tsconfig.json: project references, path aliases |
| WA-REF4 | ✅ Виконано | web/src/: app/layout/pages/shared/stores structure |
| WA-REF5 | ✅ Виконано | Zustand store, createBrowserRouter, typed API functions |
| CI-FIX | ✅ Виконано | npx wrangler замість wrangler-action для всіх 4 воркерів |
| CI-FIX2 | ✅ Виконано | api/ додано до npm workspaces |
| CI-FIX3 | ✅ Виконано | Top-level D1/KV bindings для bot/ та api/ |
| CI-FIX4 | ✅ Виконано | Production service binding web → api |
| CI-FIX5 | ✅ Виконано | Production KV namespace для api/ |

---

## Поточна архітектура web/web-admin (оновлено 28.08.2026)

### Єдиний стек

| Компонент | Версія | Примітка |
|---|---|---|
| React | 19.2 | Однакова для обох |
| Vite | 8.1 | Однакова |
| TypeScript | 6.0 | Однакова |
| Tailwind CSS | 4.3 | Однакова |
| Zustand | 5.0 | Однакова |
| React Router | 7.18 | `createBrowserRouter` |
| `@cloudflare/vite-plugin` | 1.45 | Однакова |
| ESLint | flat config | Однакова |

### Структура src/ (однакова для обох)

```
src/
├── App.tsx                    # RouterProvider wrapper
├── main.tsx                   # Entry point (StrictMode + theme init)
├── index.css                  # Tailwind + shared design system + custom CSS
├── worker.ts                  # Cloudflare Worker
├── app/
│   ├── AuthGate.tsx           # Auth check (TWA SDK / cookie)
│   └── router.tsx             # createBrowserRouter routes
├── layout/
│   ├── AppShell.tsx           # Main layout (Outlet + sidebars + header + footer)
│   ├── Sidebar.tsx            # Left sidebar (Zustand)
│   ├── Header.tsx             # Top header bar (Zustand)
│   └── Footer.tsx             # Footer
├── pages/                     # Page components
├── shared/
│   └── api/                   # Typed API functions
├── stores/
│   └── app.store.ts           # Zustand store
└── features/                  # (web-admin) Feature-based modules
```

### Відмінності між web і web-admin (тільки доменні)

| Аспект | web (TWA) | web-admin (Admin) |
|---|---|---|
| Auth | Telegram WebApp SDK | Cookie + HMAC token |
| API proxy | Service binding → api/ worker | Власні ендпоїнти в worker.ts (тимчасово) |
| Entry point | `src/main.tsx` | `src/main.tsx` |
| Структура | app/layout/pages/shared/stores | app/layout/pages/shared/features |

---

## Детальний аудит за задачами

Кожен пункт нижче — готовий блок для ШІ-агента з доступом до репозиторію.

---

### ✅ P3-3. Версії React/Vite/TS вирівняно (виконано 28.08.2026)

**Було:**
- `web/`: React 18.3, Vite 5.4, TypeScript 5.5, wrangler 3.72
- `web-admin/`: React 19.2, Vite 8.1, TypeScript 6.0, wrangler 4.112

**Стало:**
- `web/`: React 19.2, Vite 8.1, TypeScript 6.0, wrangler 4.112 (ідентично admin)

**Зміни:** `web/package.json` оновлено повністю. Додано Tailwind 4, Zustand, `@cloudflare/vite-plugin`. Структура src/ приведена до відповідності з admin.

---

### ✅ P3-2. compatibility_date вирівняно (виконано 28.08.2026)

**Було:** різні дати (2026-06-16, 2026-07-18, 2026-08-21)
**Стало:** всі 4 = 2026-08-21

---

### ⬜ P2-2. MyDatesPage потребує розбиття

**Поточний стан:** `web/src/pages/mydate/MyDatesPage.tsx` — 1167 рядків.
Містить: типи, константи, утиліти, модалку create/edit/view, таблицю з сортуванням/фільтрами, bulk-дії, header menu modal, row action modal — все в одному файлі.

**Що зробити (за прикладом `web-admin/src/features/`):**
```
web/src/features/my-dates/
  types.ts              # MyDate, SortField, SortOrder, ModalMode
  constants.ts          # TYPE_CONFIG, TAG_COLORS
  utils.ts              # getTagColor, getTypeConfig, formatDate
  useMyDates.ts          # хук з fetch/CRUD-логікою
  MyDatesTable.tsx       # таблиця зі сортуванням
  DateModal.tsx          # модалка create/edit/view
  HeaderMenuModal.tsx    # контекстне меню заголовка
  RowActionMenu.tsx      # меню дій для рядка
web/src/pages/mydate/
  MyDatesPage.tsx         # тонка обгортка
```

---

### ⬜ P3-1. Уніфікувати стилі в web-admin

**Проблема:** `web-admin/src/index.css` — 1830+ рядків ручного CSS поряд з Tailwind 4. Компоненти використовують суміш Tailwind-класів і власних CSS-класів.

**Підхід:** не переписувати все одразу. Поступово, при торканні конкретного блоку, приводити стилі до єдиного підходу. Дизайн-токени залишаються CSS-змінними в `:root`, компонентна верстка — через Tailwind-класи.

---

## Підсумкова таблиця пріоритетів

| # | Що | Пріоритет | Статус |
|---|---|---|---|
| P0-1 | `web-admin`: розділити prod/dev бази | 🔴 Критично | ✅ |
| P0-2 | ESLint+Prettier на всі 4 сервіси | 🔴 Критично | ✅ |
| P1-1 | Розбити `api/src/index.ts` | 🟠 Високий | ✅ |
| P1-2 | Прибрати дублікат авто-міграції | 🟠 Високий | ✅ |
| P1-3 | Винести `formatSqliteDatetime()` | 🟠 Високий | ✅ |
| P1-4 | Прибрати дублювання `VALID_TYPES` | 🟠 Високий | ✅ |
| P2-1 | Зменшити `any` | 🟡 Середній | ⬜ |
| P2-2 | Розбити `MyDatesPage.tsx` | 🟡 Середній | ⬜ |
| P2-3 | npm workspaces + `packages/shared/` | 🟡 Середній | ✅ |
| P2-4 | Прибрати `console.log` | 🟡 Середній | ✅ |
| P3-1 | Уніфікувати стилі в `web-admin` | 🟢 Низький | ⬜ |
| P3-2 | Вирівняти `compatibility_date` | 🟢 Низький | ✅ |
| P3-3 | Вирівняти React/Vite/TS | 🟢 Низький | ✅ |
| CI-1 | GitHub Actions з path filtering | 🟠 Високий | ✅ |
| WA-REF1..5 | Рефакторинг web/ до єдиного стандарту | 🟠 Високий | ✅ |
| CI-FIX | npx wrangler замість wrangler-action | 🔴 Критично | ✅ |
