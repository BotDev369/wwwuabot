# Моніторинг wwwuabot

> Для власника проєкту. Технічне обґрунтування — `docs/CONSOLIDATION_PLAN.md` §5.8.

## Що вже працює

- **Workers Logs** увімкнено в усіх 4 воркерах: помилки й необроблені винятки видно в
  Cloudflare Dashboard → Workers & Pages → `<воркер>` → Logs. Безкоштовно:
  200 000 подій/добу, зберігання 3 дні.
- **`GET /health`** — воркер відповідає. Свідомо не торкається БД і KV: мусить бути
  миттєвим і не залежати від того, що перевіряє.
- **`GET /health/deep`** — живі D1 і KV; повертає **503**, якщо хоч одна недоступна.
  Саме цей ендпоїнт опитує зовнішній монітор.

## Крок 1. Задеплоїти зміну

Ендпоїнт `/health/deep` з'явиться в проді після пуша в `main` (CI деплоїть `api-dev`
автоматично). Перевірка у браузері:

```
https://api-dev.diskomate.workers.dev/health/deep
```

Має повернути `{"status":"ok","checks":{"db":true,"kv":true},...}`.

## Крок 2. UptimeRobot (безкоштовно, картка не потрібна)

1. Зареєструватись на [uptimerobot.com](https://uptimerobot.com).
2. **+ New monitor**.
3. **Monitor Type:** `HTTP(s)`.
4. **Friendly Name:** `wwwuabot api (prod)`.
5. **URL:** `https://api-dev.diskomate.workers.dev/health/deep`
6. **Monitoring Interval:** `5 minutes` (швидше — лише на платному плані).
7. **Alert Contacts:** свій email, галочка «To be alerted».
8. **Create monitor**.

Безкоштовний план: **50 моніторів**, перевірка раз на 5 хвилин.

### Чому саме `/health/deep`

`/health` не торкається бази — він скаже «все добре», навіть коли D1 лежить, тобто
дасть фальшиве заспокоєння. `/health/deep` віддає 503, і монітор це побачить.

### Що робити, коли прийшов лист «Down»

1. Відкрити `https://api-dev.diskomate.workers.dev/health/deep` — у відповіді буде
   `checks`. Те, що дорівнює `false`, і є зламана залежність (`db` або `kv`).
2. Cloudflare Dashboard → Workers & Pages → `api-dev` → **Logs**: там буде рядок
   `[api] /health/deep degraded`.
3. [Cloudflare Status](https://www.cloudflarestatus.com) — можливо, це збій на боці
   Cloudflare, і робити нічого не потрібно.

Текст помилки назовні не віддається (ендпоїнт публічний, а повідомлення D1 бувають
детальними), тому деталі шукай саме в логах.

## Далі: Sentry

Sentry дає стек-трейси помилок із 4 воркерів, а не факт падіння. Це окремий крок
після UptimeRobot — потребує SDK і DSN-секрету.
