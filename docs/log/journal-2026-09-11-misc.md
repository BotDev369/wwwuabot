<!-- журнал 11.09: useMyDates, Sentry, поганий ввід -->
> **Частина архіву консолідації.** Покажчик розділів — [`docs/CONSOLIDATION_LOG.md`](../CONSOLIDATION_LOG.md).
> Числа тут — на дату свого запису, не «останні».

### 11.09.2026 — один `useMyDates` для сторінки і блока (§3.3)

| Що | Файли |
|---|---|
| Канонічний хук | `packages/ui/src/blocks/my-dates-table/useMyDates.ts` + `useDateFilters.ts`, `useDateSelection.ts`, `useDateModal.ts`, `useMyDates.types.ts` |
| Чисті функції | `filter-sort.ts` — `collectTags`, `filterDates`, `sortDates` |
| Видалено дубль | `web-platform-dev/src/pages/mydate/useMyDates.ts` (253 рядки); `MyDatesPage` імпортує хук із `@wwwuabot/ui/blocks/my-dates-table` |
| Експорт пакета | `packages/ui/package.json` → `"./blocks/my-dates-table"` |
| Тести | `filter-sort.test.ts` (8): фільтри, теги, сортування, незмінність вхідного масиву |
| Виправлено | сортування рядків — `localeCompare("uk")`: «і» більше не після «я» |
| Прибрано | 4 невикористані опції хука (`showSearch`, `showTypeFilter`, `showBulkActions`, `showCreateButton`) і власний `useEffect` сторінки з `eslint-disable` |

**Перевірка:** `npm test` — 141/141 ✅ · `npm run typecheck` — чисто на всіх 6
воркспейсах ✅ · `npm run lint` — 0 errors (6 warnings у `web-admin`) ✅
**Візуально не перевірено:** сторінка «Мої дати» живе в TWA і вимагає Telegram
`initData` — перевірити в мініапці після деплою.
**Далі:** §3.5 (дрібне + розбити `MyDatesPage.tsx`, 381 рядок).

**Додано 11.09.2026:** обробник 500 у `api-dev` і Sentry (§5.8, дія 3), тестів — 149.

### 11.09.2026 — Sentry: стек-трейси помилок (§5.8, дія 3)

| Що | Файли |
|---|---|
| Спільні опції + політика даних | `packages/shared/src/observability/sentry.ts`, `sentry.test.ts` (6) |
| Обгортка воркерів | `api-dev/src/index.ts`, `bot-dev/src/index.ts` — `Sentry.withSentry` (у бота — і `fetch`, і споживач черги) |
| Явний 500-обробник | `api-dev/src/index.ts` — `apiLog.error` + `Sentry.captureException` + JSON без деталей |
| Помилки grammY | `bot-dev/src/core/bot.ts` — `Sentry.captureException` у `bot.catch` |
| Конфіг Cloudflare | `api-dev/wrangler.toml`, `bot-dev/wrangler.toml` — `compatibility_flags = ["nodejs_compat"]` + `[version_metadata]` |
| Типи оточення | `SENTRY_DSN` у `api-dev/src/shared/types.ts` і `bot-dev/src/shared/types/env.ts` |
| Тести обробника 500 | `api-dev/src/index.test.ts` (2): JSON без деталей; звичайний маршрут не зачеплений |

**Перевірка:** `npm test` — 149/149 ✅ · `npm run typecheck` — чисто на всіх 6 воркспейсах ✅ ·
`npm run lint` — 0 errors ✅ · `npx wrangler deploy --dry-run` для обох воркерів ✅
(`api-dev` 586 KiB / 122 KiB gzip, `bot-dev` 678 / 145).

**Поза кодом:** власник акаунта додає секрет `SENTRY_DSN` у Cloudflare — `docs/MONITORING.md`.

**Знайдено дорогою — обидва закрито наступним кроком (див. нижче):**

1. `bot-dev/wrangler.toml` мав `ENVIRONMENT = "dev"`, і саме з ним бот ішов на прод. Впливає
   на текст помилки для користувача і на `environment` у Sentry.
2. `/api/scenario/%` (некоректний `%`) зривав `decodeURIComponent` у `router.ts`. Раніше це
   був сирий 500 від Cloudflare, потім — 500 JSON і подія в Sentry. Правильно повертати
   **400**: кривий ввід не мусить виглядати як збій сервера.

### 11.09.2026 — «поганий ввід ≠ збій сервера» і прод-середовище бота

Причина кроку — та сама, що й у Sentry: **помилка має означати помилку.** Поки 500
з'являвся від сміттєвого запиту, Sentry рано чи пізно почав би панікувати на порожньому
місці, а безкоштовна квота (5 000 подій/міс) витрачалася б на сканери.

| Що | Файли |
|---|---|
| Прод-середовище бота: `"prod"` → `"production"` (одне слово для одного стану) | `bot-dev/src/shared/config/texts.ts`, `texts.test.ts` (2) |
| Безпечне декодування сегмента шляху — `null` замість `URIError` | `api-dev/src/shared/url.ts`, `url.test.ts` (7) |
| **400** замість 500 на битому кодуванні | `api-dev/src/router.ts` — `/api/scenario/`, `/api/mydate/analysis/` |
| Публічний ендпоїнт більше не віддає текст винятку з D1 | `api-dev/src/controllers/scenarios.controller.ts` |
| Тести | `api-dev/src/router-input.test.ts` (5), `api-dev/src/index.test.ts` (1) |

**Перевірка:** `npm test` — 182/182 ✅ · `npm run typecheck` — чисто ✅ · `npm run lint` — 0 errors ✅

**Чому це не косметика:** `/api/scenario/:slug` — **публічний** ендпоїнт (без авторизації),
а його обробник доти віддавав клієнту `e.message` з D1. Тобто назви таблиць і значення
з бази їхали анонімному запитувачу. Тепер назовні — `{ ok: false, error: "Internal error" }`,
а деталі — в Workers Logs і Sentry. Тест обробника 500 підміняє роутер (`vi.mock`) і
перевіряє, що у відповіді немає **жодного** фрагмента внутрішньої помилки.

