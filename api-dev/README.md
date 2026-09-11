# api-dev

Cloudflare Worker: REST API для wwwuabot

## Налаштування

- **D1:** `wwwuabot-db-dev`
- **KV:** `CONTENT_KV`
- **Секрети:** `BOT_TOKEN`, `SECRET_TOKEN`, `ADMIN_SECRET`

`ADMIN_SECRET` — пароль входу в адмінку й ключ підпису cookie `admin_session`.
Усі адмін-маршрути (`/api/admin/*`, `/api/portal/*`, `/api/bot/*`) авторизуються
виключно цією cookie — секретів у заголовках немає (`docs/CONSOLIDATION_PLAN.md` §5.4).

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

**Останнє оновлення:** 2026-09-01 11:19 UTC
**Автор:** Buffy (Codebuff)
