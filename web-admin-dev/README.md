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
> Zero Trust немає. Єдиний барʼєр сьогодні — cookie-сесія.

## Роути

`/` · `/scenarios` · `/page-builder/:slug` · `/users` · `/bot-settings`

Маршрутів «сайтів» і «шаблонів» немає навмисно: контент один — рядок `scenarios`, тож
ієрархії навколо нього теж одна. Контент редагується там, де він живе — сторінка
`/scenarios`, а блоковий конструктор `page_data` відкривається на `/page-builder/:slug`.

## Мобільний

Адмінку теж відкривають з телефону: бічна панель — виїзний drawer (`aside.app-drawer`,
спільний із TWA), `100dvh`, safe-area. Правила дизайну — ті самі, що в
`web-platform-dev`: різниця між оболонками лише в логіці (`AGENTS.md` §3).
