# api-dev

Cloudflare Worker: REST API для wwwuabot

## Налаштування

- **D1:** `wwwuabot-db-dev`
- **KV:** `CONTENT_KV`
- **Секрети:** `BOT_TOKEN`, `SECRET_TOKEN`, `ADMIN_SECRET`

`ADMIN_SECRET` — пароль входу в адмінку й ключ підпису cookie `admin_session`.
Усі адмін-маршрути (`/api/admin/*`, `/api/portal/*`, `/api/bot/*`) авторизуються
виключно цією cookie — секретів у заголовках немає (`docs/CONSOLIDATION_PLAN.md` §5.4).

---

**Останнє оновлення:** 2026-09-01 11:19 UTC
**Автор:** Buffy (Codebuff)
