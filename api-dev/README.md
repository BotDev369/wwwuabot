# api-dev

Cloudflare Worker: єдиний REST API для wwwuabot (D1 + KV).

## Налаштування

- **D1:** `wwwuabot-db-dev` (біндинг `DB`)
- **KV:** `CONTENT_KV`
- **Секрети:** `BOT_TOKEN`, `SECRET_TOKEN`, `ADMIN_SECRET`, `SENTRY_DSN` (необовʼязковий)
- **Середовище:** `ENVIRONMENT = "dev"` — задеплоєний лише дев-воркер, прода немає

`ADMIN_SECRET` — пароль входу в адмінку й ключ підпису cookie `admin_session`.
Усі адмін-маршрути (`/api/admin/*`, `/api/portal/*`, `/api/bot/*`) авторизуються
виключно цією cookie — секретів у заголовках немає (`docs/CONSOLIDATION_PLAN.md` §5.4).

Ідентичність користувача береться **тільки** з підписаного Telegram `initData`
(`src/shared/identity.ts`): `resolveUserId()` — обовʼязкова, `tryResolveUserId()` — для
публічних ендпоїнтів. `X-Telegram-User-Id`, cookie `user_id` і `?user_id=` не приймаються.

## Фреймворку немає

Маршрутизація — розбір `pathname` у `src/router.ts` (376 рядків) + контролери в
`src/controllers/`. Сервіси з бізнес-логікою — в `src/services/`.

## Ендпоїнти здоров'я

| Ендпоїнт | Що перевіряє | Відповідь |
|---|---|---|
| `GET /health` | сам воркер (без БД і KV) | завжди 200 |
| `GET /health/deep` | D1 + KV | 200, або **503** при деградації |

Зовнішній монітор мусить опитувати саме `/health/deep` — він падає, коли лежить
база, а `/health` на цю роль не годиться (давав би «все добре» при мертвій D1).
Тексти помилок назовні не віддаються, лише `checks: { db, kv }`
(`docs/CONSOLIDATION_PLAN.md` §5.8).

---

**Останнє оновлення:** 2026-09-12
