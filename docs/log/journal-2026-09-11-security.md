<!-- журнал 11.09: ідентичність, HMAC-сесія, адмін-авторизація -->
> **Частина архіву консолідації.** Покажчик розділів — [`docs/CONSOLIDATION_LOG.md`](../CONSOLIDATION_LOG.md).
> Числа тут — на дату свого запису, не «останні».

### 11.09.2026 — безпека ідентичності (§5.3) + гігієна

| Що | Файли |
|---|---|
| Єдина ідентичність | `api-dev/src/shared/identity.ts` (новий), `+ identity.test.ts` |
| Спільна перевірка `initData` | `packages/shared/src/security/telegram.ts` (новий, +тести) |
| Видалено дубль | `api-dev/src/shared/telegram-auth.ts` (видалено, −62) |
| Контролери переведено на `resolveUserId` | `sites`, `site-pages`, `templates`, `users`, `my-dates` |
| Клієнт надсилає `initData` | `web-platform-dev/src/app/AuthGate.tsx`, `shared/api/client.ts`, `mydate.api.ts`, сторінки site-builder |
| Блок `my-dates-table` | `packages/ui/src/blocks/my-dates-table/api.ts` |

### 11.09.2026 — HMAC-сесія в shared (§3.1) + фабрика сценаріїв (§3.4)

| Що | Файли |
|---|---|
| Спільна сесія | `packages/shared/src/security/session.ts` (новий, +`session.test.ts`) |
| Тонкий `worker.ts` адмінки | `web-admin-dev/src/worker.ts` (−~100) |
| Тонкий `auth.controller.ts` | `api-dev/src/controllers/auth.controller.ts` (−~90) |
| Фабрика сценаріїв | `api-dev/src/controllers/scenarios.controller.factory.ts` (новий) + обидва контролери (~30 рядків кожен, −~280) |
| Оголошена залежність | `web-platform-dev/package.json` (`@wwwuabot/ui`) |

**Перевірка після всього:** `npm test` — 106/106 ✅ · `npm run typecheck` — чисто на
всіх 6 воркспейсах ✅ · `npm run lint` — 0 errors (6 попередніх warnings у `web-admin`) ✅

_Числа тестів нижче зросли до 111 після §5.4 — див. наступний запис._

### 11.09.2026 — єдина точка адмін-авторизації (§5.4)

Аудит усіх маршрутів `api-dev` перед правкою показав, де саме проходить межа
«публічне / `initData` / адмін». Результат:

| Група | Маршрути | Авторизація |
|---|---|---|
| Публічні | `/health`, `/api/mydate/*`, `/api/scenario/:slug`, `/api/catalog*`, `GET /api/templates` | немає (задумом) |
| Користувач | `/api/sites/*`, `/api/sites/:slug/pages/*`, `/api/templates` (write), `/api/my-dates`, `/api/user/profile` | підписаний `initData`, перевірка власника |
| Адмін | `/api/admin/*`, `/api/portal/*`, `/api/bot/*` | cookie `admin_session` (HMAC) |

| Що | Файли |
|---|---|
| Видалено `X-Admin-Secret` | `api-dev/src/modules/security/admin-auth.ts` (+ порожня тека `modules/`) |
| Видалено мертвий ендпоїнт | `api-dev/src/controllers/auth-check.controller.ts` |
| Видалено `/db-proxy` | `controllers/db-proxy.controller.ts`, `services/db-proxy.service.ts` |
| Видалено легасі вебхук-ендпоїнти | `controllers/webhook.controller.ts` |
| Роутер | `api-dev/src/router.ts` — один явний адмін-гейт, коментарії до нього |
| Типи | `api-dev/src/shared/types.ts` (опис `ADMIN_SECRET`), `bot-dev/src/shared/types/env.ts` (прибрано невикористаний `ADMIN_SECRET`) |
| **Знайдено під час аудиту** | `GET /api/templates/:id` не перевіряв власника взагалі — приватна конфігурація читалась за UUID (IDOR) |
| Фікс IDOR | `api-dev/src/controllers/templates.controller.ts` — `canReadTemplate()` + тест (`templates.controller.test.ts`, 5 кейсів) |
| Межа гейта в одній константі | `ADMIN_PATH_PREFIXES` в `api-dev/src/router.ts` |
| Регресійні тести гейта | `api-dev/src/router.test.ts` (15 тестів): підроблена/протермінована/сміттєва cookie, відсутній `ADMIN_SECRET`, секрет у заголовку, 404 на видалених маршрутах, публічні vs користувацькі шляхи |
| Доки | `api-dev/README.md`, `bot-dev/src/api/router.ts` |

**Перевірка:** `npm test` — 126/126 ✅ · `npm run typecheck` — чисто на всіх 6
воркспейсах ✅ · `npm run lint` — 0 errors ✅
**Прод:** задеплоєно `api-dev` і `bot-dev` (run 34584327030 ✅); поведінка
перевірена запитами до живого воркера (див. вставку вище).

> **Що варто знати про `GET /api/templates/:id`:** цей маршрут **не викликає жоден
> клієнт** — ні `web-platform`, ні `web-admin`. Я не видаляв його, бо він входить
> у заявлений REST-CRUD шаблонів і може знадобитись у редакторі. Але якщо він не
> знадобиться — це кандидат на видалення разом з рештою легасі (§3.5).
>
> **`/api/mydate/*` свідомо лишається публічним** — це калькулятори з кешем по
> даті, не персональні дані. Але це неавторизований *запис* у D1/KV: хто завгодно
> може наповнити кеш довільними датами. Не діра в даних, а питання витрат і спаму.
> Закрити після запуску, коли з'явиться реальний трафік (кандидат у §5.6).

