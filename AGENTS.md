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

Зв'язки: `bot` і `web-admin` пишуть у D1 напряму. `web` ходить через `api` (service binding). Деплой — автоматичний при пуші в `main` (GitHub Actions, path filtering).

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
- **CI/CD:** GitHub Actions + path filtering. Lint перед деплоєм. Dependabot увімкнений.

---

## 7. Чого НЕ робити

- Не пиши власну авто-міграцію D1 — використовуй `withAutoMigrate` з shared.
- Не дублюй код між воркерами — клади в `packages/shared/`.
- Не роби `SELECT *` на таблицях з важкими JSON-колонками (users).
- Не забувай `[[d1_databases]]` на top-level `wrangler.toml`.
- Не змішуй prod/dev бази — різні `database_id`.
- Не створюй API-ендпоїнти поза `api-dev/`.
- Не пиши моноліти (>200 рядків) — див. правило кристалевості.
- Не хардкодь стилі/кольори — використовуй CSS-токени та `<Icon />`.

---

## 8. Статус проєкту

- **Типізація:** 0 `any`, `tsc --noEmit` чистий на всіх 6 воркерах.
- **Тести:** Vitest, 44 unit-тести (але не гейтять CI — S-6 відкрита).
- **Моніторинг:** Sentry не підключений.
- **Документація:** CHANGELOG відсутній.

---

## 9. Як оновлювати цей файл

Коли з'являється нова конвенція або закривається задача, що впливає на правила — онови відповідний розділ. Не видаляй попередні правила мовчки — познач зміну явно.
