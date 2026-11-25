# web-admin-dev

Cloudflare Worker: адмін-панель wwwuabot (React 19 + Vite 8 + Page Builder).

## Налаштування

- **D1:** немає — усі дані йдуть через service binding `API` (див. `AGENTS.md` §3)
- **Service binding:** `API` → `api-dev`
- **Секрети:** `ADMIN_SECRET` — пароль входу і ключ підпису cookie `admin_session`
- **Середовище:** `ENVIRONMENT = "dev"` — задеплоєний лише дев-воркер, прода немає

Авторизація — cookie `admin_session` (HMAC-SHA256, `packages/shared/src/security/session.ts`),
перевіряється **двічі**: у `worker.ts` (до проксі) і адмін-гейтом у `api-dev` (після).
Це навмисно: в `api-dev` є власний публічний URL, тож він не покладається на проксі.

> **Cloudflare Access поки не налаштований** — воркер живе на `*.workers.dev`, політики
> Zero Trust немає. Барʼєри сьогодні — cookie-сесія й вхід лише з Mini App.

## Вхід лише з Telegram

Панель показується тільки з підписаним `initData`: гейт спрацьовує до першого кадру, його
спільне тіло — `packages/shared/src/security/entry-gate.ts`, а в сторінку його вставляє
`entryGatePlugin()` (`vite.config.ts`). У браузері замість панелі — екран-блок, без блимання.
Зайти в панель можна з бота: власник надсилає `/admin` **у приватній лістці** й натискає кнопку
Mini App (`bot-dev/src/modules/admin/admin-panel.ts`, адреса — `WEB_ADMIN_URL`); у групі команда
мовчить. Локально на `localhost`/`127.0.0.1` гейт пропускає розробку — інакше панель не підняти
на `vite`.

Пароль (`ADMIN_SECRET`) і cookie лишилися як були: гейт прибирає доступ із вебу, а не замінює
авторизацію.

## Роути

`/` · `/scenarios` · `/page-builder/:slug` · `/users` · `/bot-settings`

Маршрутів «сайтів» і «шаблонів» немає навмисно: контент один — рядок `scenarios`, тож
ієрархії навколо нього теж одна. Контент редагується там, де він живе — сторінка
`/scenarios`, а блоковий конструктор `page_data` відкривається на `/page-builder/:slug`.

## Мобільний

Адмінку теж відкривають з телефону: бічна панель — виїзний drawer (`aside.app-drawer`, спільний із
TWA), `100dvh`, safe-area. Правила дизайну — `AGENTS.md` §3: різниця між оболонками лише в логіці.
