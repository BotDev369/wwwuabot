<!-- §5.1–§5.4: аудит ризиків — біндинги, ідентичність, адмін-секрет -->
> **Частина архіву консолідації.** Покажчик розділів — [`docs/CONSOLIDATION_LOG.md`](../CONSOLIDATION_LOG.md).
> Числа тут — на дату свого запису, не «останні».

## 5. Етап 3 — ризики, знайдені під час аудиту

Це не рефакторинг. Це речі, які я знайшов, і вони можуть вистрілити.

### 5.1. ⚠️ `@wwwuabot/ui` не оголошений у `web-platform-dev/package.json`

Платформа імпортує `@wwwuabot/ui` у 4 файлах (`ScenarioPage`, `DynamicPage`,
`SiteEditorPage`, `SiteViewPage`), але в `dependencies` є тільки `@wwwuabot/shared`.

Зараз це працює **випадково** — через hoisting `node_modules` у npm workspaces.
Доказ, що залежність реальна: CI у `.github/workflows/deploy.yml` включає
`packages/ui/**` у фільтр для `web`.

**Дія:** додати `"@wwwuabot/ui": "*"` у `dependencies`. Один рядок, знімає ризик
«білд зламався після оновлення hoisting'у».

> **ЗАКРИТО 11.09.2026.** Залежність оголошена в `web-platform-dev/package.json`.
> Заразом прибрано залишковий службовий коментар з `web-platform-dev/src/worker.ts`.

### 5.2. `AGENTS.md` описує архітектуру, якої вже немає

`AGENTS.md` §1 стверджує: «`bot` і `web-admin` пишуть у D1 напряму».
Насправді:

- `web-admin-dev/wrangler.toml` справді має біндинг `[[d1_databases]] DB`
- але `env.DB` **не використовується ніде** в коді адмінки — `worker.ts` проксує все
  через `/api/*` у `api-dev`
- тобто біндинг зайвий, а документація вводить в оману

**Дія:** прибрати невикористаний D1-біндинг зі `wrangler.toml` адмінки (або підтвердити,
що він потрібен) і поправити `AGENTS.md` §1.

> **ЗАКРИТО 11.09.2026.** Біндинг `[[d1_databases]] DB` прибрано з
> `web-admin-dev/wrangler.toml` (у коді не використовувався — перевірено `grep env.DB`).
> `AGENTS.md` §1 виправлено: «`bot` пише в D1 напряму; `web` і `web-admin` — тонкі
> оболонки, жоден із них не має прямого доступу до D1». Заразом поправлено
> `web-admin-dev/README.md` і `docs/PAGE_ENGINE_ARCHITECTURE.md` §2.4, де лишалося
> твердження про прямі Service Bindings до D1.

### 5.3. ⛔ Ідентичності користувача не перевіряють — ЗНАЙДЕНО Й ПІДТВЕРДЖЕНО 11.09.2026

Це найважливіша знахідка аудиту. Авторизації користувача фактично немає.

**а) 16 хендлерів сайтів беруть особистість із непідписаної cookie.**

`getUserIdFromRequest()` — три ідентичні копії:
`sites.controller.ts:39`, `site-pages.controller.ts:34`, `templates.controller.ts:32`:

```ts
/** Витягує userId з cookie (HMAC auth). */
function getUserIdFromRequest(request: Request): number | null {
  const match = (request.headers.get("Cookie") ?? "").match(/user_id=(\d+)/);
  if (match) return parseInt(match[1], 10);
  return null;
}
```

Коментар каже «HMAC auth», але HMAC тут немає — це просто читання числа з cookie.

**б) Цю cookie ніхто і ніколи не ставить.** У всьому репозиторії єдиний `Set-Cookie` —
це `admin_session` в `auth.controller.ts`. Наслідки два, і обидва погані:

- **Зараз:** усі 16 хендлерів завжди повертають 401 — **фіча «сайти» мертва.**
- **Якщо cookie колись з'явиться:** будь-хто виставляє собі `user_id=1` і керує
  чужими сайтами, сторінками й шаблонами.

**в) `my-dates` приймає непідписаний `X-Telegram-User-Id`.**
`my-dates.controller.ts:114-134`: якщо `X-Telegram-Init-Data` є — перевіряється підпис;
якщо немає — береться голий числовий заголовок і код сам це логує:
`"unsigned X-Telegram-User-Id accepted"`. Тобто достатньо не надіслати initData, щоб
читати й писати чужі дати.

**г) `/api/user/profile?user_id=N` — публічний, без авторизації.**
`users.controller.ts:222-250` бере `user_id` з query-параметра і віддає `role`, `tariff`,
`status`, `discount`, `permissions`. Тобто будь-хто дізнається тариф і права будь-якого
користувача.

**д) `AuthGate` платформи — це перевірка браузера, не сервера.**
`web-platform-dev/src/app/AuthGate.tsx` робить лише
`!!window.Telegram?.WebApp?.initDataUnsafe?.user?.id`.

**е) Тестів на auth — нуль.**

**Дія:** одна довірена ідентичність — **тільки підписаний `initData`** (`verifyInitData`).
Відхиляти `X-Telegram-User-Id`, прибрати непідписану cookie, `/api/user/profile` має брати
`user_id` з перевіреного підпису, а не з query. Разом із сервером правиться клієнт
(надсилати `initData` у кожному запиті) — інакше сайти лишаться мертвими.

> **ЗАКРИТО 11.09.2026.** Єдина точка правди — `api-dev/src/shared/identity.ts`:
> `user_id` береться ТІЛЬКИ з підписаного `initData`. Непідписану cookie, голий
> `X-Telegram-User-Id` і `?user_id=` в `/api/user/profile` прибрано. Регресійні
> тести (`api-dev/src/shared/identity.test.ts`) явно перевіряють, що стара дірка
> не повернеться. Разом змінено 25 файлів; див. §9.

### 5.4. `X-Admin-Secret` збігається з паролем для входу

`api-dev/src/modules/security/admin-auth.ts` авторизує за заголовком `X-Admin-Secret`,
який порівнюється з `env.ADMIN_SECRET` — а це **той самий секрет**, що й пароль у
`handleLogin`. Наслідки: зміна пароля ламає всіх API-клієнтів; порівняння не
constant-time.

**Дія:** або окремий секрет для машинного доступу, або перевести адмін-API на cookie-сесію
(вона вже є і вже перевіряється).

> **ЗАКРИТО 11.09.2026.** Рішення: **жодних секретів у заголовках** — усе через
> наявну cookie-сесію. Аудит під час роботи виявив, що проблема ширша, ніж один
> заголовок: було **три** легасі-поверхні, кожна з яких дублювала вже наявний
> захищений маршрут і авторизувалася секретом у заголовку.
>
> | Поверхня | Було | Чому прибрано |
> |---|---|---|
> | `/db-proxy` | `X-Admin-Secret` == пароль входу | повний CRUD БД (сценарії, `SELECT * FROM users`, `settings`) на публічному URL api-dev; ніщо його не викликало; дублює `/api/admin/*` |
> | `/setup-webhook`, `/webhook-info` | `X-Bot-Token` == `BOT_TOKEN` | витік `BOT_TOKEN` дозволяв **переспрямувати вебхук на чужий сервер** і збирати `initData` всіх користувачів; дублює `/api/bot/*` за cookie |
> | `/auth/check` (старий) | `X-Admin-Secret` | мертвий код (не в роутері) + зливав існування користувача через `?user_id=` — пряме порушення §5.3/AGENTS §7 |
>
> Видалено: `modules/security/admin-auth.ts`, `controllers/auth-check.controller.ts`,
> `controllers/db-proxy.controller.ts`, `services/db-proxy.service.ts`,
> `controllers/webhook.controller.ts` (−~500 рядків, з них ~250 — мертвий
> `DbProxyService`). Заодно прибрано невикористаний `ADMIN_SECRET` з `Env` у `bot-dev`.
>
> **Тепер адмін-авторизація — це один блок коду** в `api-dev/src/router.ts` (адмін-гейт),
> плюс незалежна перевірка того самого токена в `web-admin-dev/src/worker.ts`.
> Два рівні однієї перевірки — навмисно: api-dev має власний публічний URL,
> тому не покладається на те, що перед ним стояв проксі.
>
> **Межу винесено в одну константу й покрито тестами.** Список префіксів —
> `ADMIN_PATH_PREFIXES` (експортований з `router.ts`), а `router.test.ts`
> перевіряє кожен із них. Це важливо, бо найтонший спосіб зламати гейт —
> не змінити його, а додати новий ендпоїнт поруч і забути про префікс.
> Тепер така помилка падає в CI, а не в прод.
>
> **Перевірено на живому дев-воркері** одразу після деплою: `/health` — 200,
> `POST /db-proxy` — 404, `GET /setup-webhook` — 404, усі три адмін-префікси
> без cookie — 401, `/api/catalog` та `/api/scenario/home` — 200,
> `/api/my-dates` без initData — 401, `/auth/check` — `{"authenticated":false}`.
>
> **Наслідок для експлуатації:** `ADMIN_SECRET` тепер має рівно одне призначення
> — пароль входу + ключ підпису cookie. Ротація пароля більше нікого не ламає.
> `BOT_TOKEN` лишається секретом бота і не дає доступу до адмінки.

