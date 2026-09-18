# Моніторинг

**Для власника акаунта.** Поки прода немає, «падіння» означає падіння дев-воркера: неприємно,
але не боляче для користувачів. Моніторинг варто вважати **страховкою на майбутнє**, а не описом
того, що вже когось рятує.

## Що вже працює

| Що | Стан | Що робить власник |
|---|---|---|
| Workers Logs | `[observability]` є в усіх 4 `wrangler.toml` | нічого |
| `/health` і `/health/deep` | код + `health.controller.test.ts` | нічого |
| Зовнішній монітор | — | UptimeRobot на `/health/deep` (нижче) |
| Sentry в `api-dev` і `bot-dev` | `withSentry`; без `SENTRY_DSN` — no-op | секрет `SENTRY_DSN` (нижче) |
| Sentry у браузері | немає — потрібен `VITE_`-DSN на етапі збірки | відкладено |

- **Workers Logs** увімкнено в усіх 4 воркерах: помилки й необроблені винятки видно в Cloudflare
  Dashboard → Workers & Pages → `<воркер>` → Logs. Безкоштовно: 200 000 подій/добу, зберігання
  3 дні. Локально зафіксований конфіг — `[observability]/[observability.logs]`,
  `invocation_logs = false` (вимкнено лише службовий лог кожного запиту; власні логи й винятки
  лишаються).
- **`GET /health`** — воркер відповідає. Свідомо не торкається БД і KV: мусить бути миттєвим і не
  залежати від того, що перевіряє.
- **`GET /health/deep`** — живі D1 і KV; повертає **503**, якщо хоч одна недоступна. Тексти
  помилок назовні не віддаються (ендпоїнт публічний, а повідомлення D1 бувають детальні), лише
  `checks: { db, kv }`. **Саме цей ендпоїнт опитує монітор**: `/health` скаже «все добре», навіть
  коли D1 лежить.
- **Sentry.** `api-dev` ловить необроблені винятки (`withSentry`) і віддає клієнту
  `{"error":"Internal error"}`; `bot-dev` — на `fetch` і на споживачі черги, а помилки, які grammY
  перехоплює сам, звітує `bot.catch`. Перформанс вимкнено (`tracesSampleRate: 0`), `dataCollection`
  вимкнено, а `beforeSend` додатково вирізає заголовки, cookie, тіло й query-параметри: у заголовку
  їде Telegram `initData` (ним можна видати себе за користувача, поки підпис не сплив), а в cookie —
  `admin_session`. **Без секрету SDK не робить нічого** — деплой без нього безпечний, вмикається
  одним секретом, без зміни коду.

## UptimeRobot (безкоштовно, картка не потрібна)

1. [uptimerobot.com](https://uptimerobot.com) → реєстрація.
2. **+ New monitor** → Type: `HTTP(s)`.
3. Name: `wwwuabot api (dev)`, URL: `https://api-dev.diskomate.workers.dev/health/deep`.
4. Interval: `5 minutes` (швидше — лише на платному плані).
5. Alert Contacts: свій email, галочка «To be alerted» → **Create monitor**.

Безкоштовний план: 50 моніторів, перевірка раз на 5 хвилин.

**Що робити, коли прийшов лист «Down»:**

1. Відкрити `https://api-dev.diskomate.workers.dev/health/deep` — те, що у відповіді дорівнює
   `false`, і є зламана залежність (`db` або `kv`).
2. Cloudflare Dashboard → Workers & Pages → `api-dev` → **Logs**: там буде рядок
   `[api] /health/deep degraded`.
3. [Cloudflare Status](https://www.cloudflarestatus.com) — можливо, це збій на боці Cloudflare, і
   робити нічого не потрібно.

## Sentry (безкоштовно, картка не потрібна)

UptimeRobot каже **що** впало, Sentry — **чому**. Безкоштовний план: 5 000 помилок/місяць,
30 днів зберігання.

1. [sentry.io](https://sentry.io) → реєстрація → **Create project** → platform
   `Cloudflare Workers`, назва `wwwuabot-api`.
2. Лишити тільки **Error Monitoring** (Logging, Tracing, Application Metrics — вимкнені).
3. Скопіювати **DSN** — рядок виду `https://<key>@o<org>.ingest.de.sentry.io/<project>`.
4. Cloudflare Dashboard → Workers & Pages → **`api-dev`** → Settings → Variables and Secrets →
   **Add** → Type: **Secret** → Name: `SENTRY_DSN` → **Save**. Те саме для **`bot-dev`** (можна
   той самий DSN — тоді обидва воркери в одному проєкті). Секрет застосовується одразу, нового
   деплою не потрібно.

**Якщо подій немає** — це може бути нормою: без помилок подій і не буде. Єдиний справді тихий
ризик — **ім'я секрету**: якщо замість `SENTRY_DSN` стоїть, скажімо, `SENTRY_DNS`, воркер його не
побачить і Sentry лишиться вимкненим **без жодної помилки**. При найменшому сумніві перевір саме
ім'я (у дашборді воно обрізане — натисни олівець). Друга ознака — Workers Logs: якщо SDK не зміг
стартувати, він скаржиться саме туди, з префіксом `[Sentry]`.

### Чому не для `web-platform-dev` і `web-admin-dev`

Там помилки живуть у браузері, і DSN треба вшивати в бандл на етапі збірки — це окремий механізм
(секрет GitHub Actions + `VITE_`-змінна). Додамо, коли з'явиться трафік: зараз це дало б більше
шуму, ніж користі.
