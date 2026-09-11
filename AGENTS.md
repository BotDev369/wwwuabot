# AGENTS.md

> **Версія:** 2.0 | **Останнє оновлення:** 09.09.2026

Інструкція для AI-агентів (Claude, GPT, Buffy тощо). Перед початком роботи прочитай цей файл повністю.

---

## 1. Монорепозиторій

4 незалежні Cloudflare Workers + 2 спільні пакети:

```
bot-dev/          Telegram-бот: grammY + D1 + Queues + Cloudinary
api-dev/          REST API: калькулятори, CRUD, аналітика (D1 + KV)
web-platform-dev/ Telegram Mini App: React 19, Vite 8, Tailwind 4, Zustand
web-admin-dev/    Адмін-панель: React 19, Vite 8, Tailwind 4, Page Builder
packages/shared/  Типи, утиліти, дизайн-токени, іконки (@wwwuabot/shared)
packages/ui/      Спільні React-компоненти Page Builder (@wwwuabot/ui)
```

Зв'язки: `bot` пише в D1 напряму (власний біндинг `DB`). `web` і `web-admin` — тонкі оболонки: усі дані йдуть через `api-dev` (service binding), жоден із них не має прямого доступу до D1. Деплой — автоматичний при пуші в `main` (GitHub Actions, path filtering).

**Ліцензія:** AGPL-3.0 — похідні проекти зобов'язані залишатись open source.

---

## 2. Доменні терміни

- **Scenario** — контентна одиниця: екран бота з кнопками, підписом, фото. Типи: `bot-dev/src/shared/types/scenario.ts`. Поля: `codeword`, `photo_url`, `caption_top/mid/bot`, `keyboard_type`, `buttons`, `rich_message`/`rich_data`, `page_data`.
- **Family Box** — JSON-стан користувача в D1 (кошик, дати, стан гри). Утиліти: `packages/shared/src/utils/family-box.ts`. Безпечний парсинг (`{}` при битих даних). Не викликає запис у БД сам — прапор `userDirty` в `bot-router.ts`.
- **Page Builder** — блочна система сторінок. Сторінка = scenarios з `page_data`. 4 зони: sidebar, header, main, footer. Блоки рекурсивні, автономні. Типи: `packages/shared/src/types/page-config.ts`. Реєстр: `packages/shared/src/constants/block-definitions/`. React-компоненти: `packages/ui/src/blocks/`.
- **Conditional Rendering** — умовний показ блоків за role/tariff/status/permissions користувача. `packages/shared/src/utils/condition-evaluator.ts`.
- **Design System** — подвійна тема Apple/Material через `data-brand` на `<html>`. CSS-токени: `packages/shared/src/styles/`. Темна/світла: `data-theme`.

---

## 3. Архітектурні правила

### Спільний код (правило «двічі — в спільне»)
> Код, що повторюється 2+ рази, йде в `packages/shared/` або `packages/ui/`.

- Створюй у shared, якщо логіка потрібна в 2+ воркерах.
- Не внось серверну логіку воркера (роутинг, мідлвари).
- Не внось конфігурацію `wrangler.toml`.

### Єдиний API-шлюз
> Всі зовнішні REST-ендпоїнти — в `api-dev/`. Не створюй нові API в `bot/`, `web/`, `web-admin/`.

Винятки: webhook'и в `bot/`, тимчасові admin-ендпоїнти в `web-admin/`.

### Межа між `web` і `web-admin` (тонкі оболонки)
> Обидва — оболонки навколо спільного ядра. Ділити можна *логіку*, не *рішення*.

| Шар | Спільний? | Куди |
|---|---|---|
| Типи, утиліти, токени, CSS | ✅ | `packages/shared` |
| Рендеринг блоків і сторінок (`PageRenderer`) | ✅ | `packages/ui` |
| Транспорт API (`apiFetch`) | ✅ | `packages/shared` |
| Перевірка сесії (HMAC, cookie, `initData`) — **чиста функція** | ✅ | `packages/shared/src/security/` |
| `AuthGate` (що робити при провалі) | ❌ | окремо в кожному застосунку |
| Роутер, `worker.ts`, `wrangler.toml` | ❌ | окремо |

**Ключове:** перевірка — спільна; реакція на провал — своя (TWA показує «відкрийте
в Telegram», адмінка — `LoginScreen`). Повний план і журнал — `docs/CONSOLIDATION_PLAN.md`.

### Кристалева ясність (Crystal Clarity Rule)
> **АБСОЛЮТНЕ ПРАВИЛО: ніколи не пиши «простині» (моноліти).**

| Рівень | Дія |
|---|---|
| Файл > 200 рядків | Червоний прапець. Розбивай на хуки, підкомпоненти, хелпери. |
| Файл > 400 рядків | Критично. Зупинись і рефактори НЕГАЙНО. |

- **Компонент** = тільки рендеринг. Логіка = в хуках (`use*.ts`).
- **Хук** = тільки стан та бізнес-логіка. Жодного JSX.
- **Хелпери/константи** = тільки чисті функції та дані. Жодного стану.

Приклад:
```
MyFeaturePage.tsx      (80)  — рендеринг
useMyFeature.ts        (120) — хук
MyFeatureTable.tsx     (80)  — підкомпонент
helpers.ts             (40)  — чисті функції
types.ts               (20)  — типи
```

### Блок-дефінції: компактний запис
> Не пиши JSON-схеми. Використовуй хелпери з `packages/shared/src/constants/block-definitions/helpers.ts`:

```typescript
// БУЛО (30+ рядків):
{ type: "text", label: "Текст", schema: { type: "object", properties: {
  title: { type: "string", title: "Заголовок" },
  content: { type: "string", title: "Текст" },
  level: { type: "string", title: "Рівень", enum: ["h1","h2","body"], default: "body" },
}}}

// СТАЛО (7 рядків):
block({ type: "text", label: "Текст", icon: "text", category: "content",
  props: { title: s("Заголовок"), content: s("Текст"),
    level: e("Рівень", ["h1","h2","body"], { default: "body" }) },
  required: ["content"], defaultProps: { title: "", content: "", level: "body" } })
```

---

## 4. Іконки та дизайн

> **Емоджі в UI ЗАБОРОНЕНІ. Використовувати `<Icon />` з shared.**
> **Дропдауни ЗАБОРОНЕНІ. Використовувати модалки на все вікно.**

```tsx
import { Icon } from "@wwwuabot/shared";
<Icon name="home" size={16} />
```

Повний перелік іконок та токенів — див. `docs/DESIGN_SYSTEM.md`.

---

## 5. Де що шукати

### bot-dev (еталонна структура)

| Що | Де |
|---|---|
| HTTP-роутинг | `src/api/router.ts` + `src/api/controllers/` |
| Telegram-команди | `src/core/router/` |
| Middleware | `src/core/middleware/{pre,post,intercept}/` |
| Доступ до БД | `src/repositories/` або `src/modules/<domain>/*.repository.ts` |
| Доменна логіка | `src/modules/<domain>/` |
| Логування | `src/modules/logging/` |
| Конфіг / тексти | `src/shared/config/texts.ts` |

### Ідентичність і безпека

| Що | Де |
|---|---|
| Перевірка підпису Telegram `initData` | `packages/shared/src/security/telegram.ts` |
| Адмінська cookie-сесія (`signSessionToken`, `hasValidSession`) | `packages/shared/src/security/session.ts` |
| `user_id` для хендлера API | `api-dev/src/shared/identity.ts` — `resolveUserId()` (обов'язково) або `tryResolveUserId()` (для публічних) |
| Адмін-гейт (єдина точка входу) | `api-dev/src/router.ts` — блок `pathname.startsWith("/api/admin/")` |

Обидва модулі в `security/` — **чисті функції**: секрет передається аргументом, рішення
«що робити при провалі» приймає виклик. Не дублюй HMAC-логіку в воркерах.

**Три групи доступу — третя не має винятків:**

| Група | Префікс | Авторизація |
|---|---|---|
| Публічне | `/api/catalog*`, `/api/scenario/`, `/api/mydate/`, `/health` | немає |
| Користувач | `/api/sites`, `/api/my-dates`, `/api/user/profile` | підписаний `initData` + перевірка власника |
| Адмін | `/api/admin/`, `/api/portal/`, `/api/bot/` | cookie `admin_session` |

Адмін-авторизація існує в **двох місцях навмисно**: `web-admin/worker.ts` (до проксі)
і адмін-гейт в `api-dev/router.ts` (після). У `api-dev` є власний публічний URL, тому він
не має покладатися на те, що перед ним стояв проксі. Два рівні однієї перевірки — це не
дублювання, а недовіра до периметра.

### web / web-admin (однакова архітектура)

```
src/
├── App.tsx, main.tsx, index.css, worker.ts
├── app/          AuthGate.tsx, router.tsx
├── layout/       AppShell.tsx, Sidebar.tsx, Header.tsx, Footer.tsx
├── pages/        Сторінки
├── shared/api/   Typed API-функції
├── stores/       Zustand stores
└── features/     (web-admin) Доменні модулі: editor, scenarios, users
```

Відмінності: `web` — auth через TWA SDK, API через service binding. `web-admin` — auth через cookie + HMAC.

---

## 6. Конвенції коду

- **TypeScript strict**, 0 `any` (ESLint: `no-explicit-any` = `warn` → план `error`).
- **ESLint + Prettier** у всіх 4 сервісах. Команди: `npm run lint`, `npm run typecheck`.
- **Логування:** `bot/` — модуль `modules/logging/` (Queue). `api/` — `apiLog` з префіксом `[api]`. Не використовувати `console.log` у продакшн-коді.
- **Дата/час у D1:** `formatSqliteDatetime()` з `packages/shared/src/utils/datetime.ts`.
- **CI/CD:** GitHub Actions + path filtering. Перед деплоєм в одній джобі `checks` виконуються `npm ci`, `npm audit --audit-level=critical`, `npm run lint`, `npm run typecheck`, `npm test` — будь-який збій блокує деплой усіх воркерів. Деплої воркерів стоять у черзі (`concurrency`), щоб старіший коміт не ліг поверх новішого. `pull_request` запускає лише гейти — деплой з PR неможливий. `GITHUB_TOKEN` має `contents: read`. Dependabot увімкнений.

---

## 7. Чого НЕ робити

- Не пиши власну авто-міграцію D1 — використовуй `withAutoMigrate` з shared.
- Не дублюй код між воркерами — клади в `packages/shared/`.
- Не роби `SELECT *` на таблицях з важкими JSON-колонками (users).
- Не забувай `[[d1_databases]]` на top-level `wrangler.toml`.
- Не змішуй prod/dev бази — різні `database_id`.
- Не створюй API-ендпоїнти поза `api-dev/`.
- Не довіряй `X-Telegram-User-Id`, cookie `user_id` чи `?user_id=` — ідентичність береться ТІЛЬКИ з підписаного `initData` (`api-dev/src/shared/identity.ts`).
- Не авторизуй адмін-дію секретом у заголовку (`X-Admin-Secret`, `X-Bot-Token`, `?secret=`) — тільки cookie `admin_session`. Секрет у заголовку = секрет, який тече через логи, ретраї та проксі, і який неможливо відкликати окремо від пароля.
- Не виноси адмін-ендпоїнт за префікс `/api/admin/`, `/api/portal/` чи `/api/bot/` — інакше він пройде **повз** адмін-гейт.
- Не пиши моноліти (>200 рядків) — див. правило кристалевості.
- Не хардкодь стилі/кольори — використовуй CSS-токени та `<Icon />`.

---

## 8. Статус проєкту

- **Типізація:** 0 `any`, `tsc --noEmit` чистий на всіх 6 воркерах.
- **Тести:** Vitest, 111 unit-тестів. **Гейтять CI** (S-6 закрито 11.09.2026) — червоний тест блокує деплой.
- **Ідентичність користувача:** єдине джерело — підписаний Telegram `initData` (`api-dev/src/shared/identity.ts`). Заборонено приймати `X-Telegram-User-Id` або `user_id` з cookie/query.
- **Адмін-авторизація:** єдина — cookie `admin_session` (HMAC-SHA256, `packages/shared/src/security/session.ts`). Секретів у заголовках немає: `X-Admin-Secret`, `X-Bot-Token`, `/db-proxy` і легасі `/setup-webhook` видалено 11.09.2026 (`docs/CONSOLIDATION_PLAN.md` §5.4).
- **Моніторинг:** Sentry не підключений.
- **Документація:** CHANGELOG відсутній.

---

## 9. Як оновлювати цей файл

Коли з'являється нова конвенція або закривається задача, що впливає на правила — онови відповідний розділ. Не видаляй попередні правила мовчки — познач зміну явно.
