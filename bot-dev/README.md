# bot-dev

Cloudflare Worker: Telegram-бот для wwwuabot (grammY).

## Налаштування

- **D1:** `wwwuabot-db-dev` (біндинг `DB`) — бот пише в неї напряму, без `api-dev`
- **Queue:** `wwwuabot-logs` (продюсер і споживач — модуль `src/modules/logging/`)
- **Секрети:** `BOT_TOKEN`, `CLOUDINARY_API_SECRET`, `SENTRY_DSN` (необовʼязковий: без нього Sentry у no-op)
- **Середовище:** `ENVIRONMENT = "dev"` — задеплоєний лише дев-воркер, прода немає

## Команди

```bash
npm run dev --workspace=bot-dev      # wrangler dev
npm run typecheck --workspace=bot-dev
npm run lint --workspace=bot-dev
```

## Де що лежить

| Що | Де |
|---|---|
| HTTP-роутинг і webhook | `src/api/router.ts`, `src/api/controllers/` |
| Telegram-роутинг | `src/core/router/bot-router.ts` |
| Middleware | `src/core/middleware/{pre,post,intercept}/` |
| Репозиторії | `src/repositories/` (сценарії, налаштування), `src/modules/users/user.repository.ts` |
| Логування | `src/modules/logging/` |

Стан користувача живе в таблиці `users` із «мʼякою» схемою: колонки додає
`withAutoMigrate`, а запис робить post-middleware за прапором `userDirty`.

---

**Останнє оновлення:** 2026-09-12
