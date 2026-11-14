# Звіти агента: канал «деплой → чат власника»

**Що це.** Після кожного прогону `Deploy` бот сам надсилає власникові rich-звіт: що поїхало,
чим перевірено, який коміт, що не перевірено. Ручного скрипта немає, токена бота в CI немає,
публічного ендпоінта немає.

## Потік

```
Deploy (GitHub Actions)
  └─ job `report` (always(), не на pull_request, id-token: write)
       └─ node scripts/deploy-report.mjs
            ├─ OIDC-токен джоби (audience wwwuabot-deploy-report)
            └─ POST https://bot-dev.diskomate.workers.dev/reports
                 ├─ 401 без доведеного походження
                 ├─ verify.ts  — підпис GitHub (JWKS) і твердження repo/ref/aud/exp
                 ├─ parse.ts   — алфавіт, довжини, ліміти, https-адреси
                 ├─ один рядок на run_id (повторний прогін не дублює)
                 ├─ render.ts  — підстановка в шаблон `/report` із D1
                 └─ sendRichMessage → ADMIN_TELEGRAM_ID
```

Надсилання не робить деплой червоним: джоба `report` має `continue-on-error`, а скрипт ловить
власні помилки.

## Безпека

- **Доказ походження, а не секрет у репозиторії.** CI просить OIDC-токен у GitHub
  (`ACTIONS_ID_TOKEN_REQUEST_URL`, `permissions: id-token: write`) і кладе його в тіло. Воркер
  перевіряє підпис за JWKS GitHub і твердження: `iss`, `aud = wwwuabot-deploy-report`,
  `repository = BotDev369/wwwuabot`, `ref = refs/heads/main`, `exp`. Токен живе хвилини, тож
  красти нічого; ключа в GitHub secrets немає взагалі.
- **Другий вхід — спільний ключ** `X-Report-Key` (стале за часом порівняння `sameKey`) з
  `env.AGENT_REPORT_KEY`: для ручного звіту й для `GET /reports`. Ключ лежить лише в wrangler
  secret, у репозиторії його немає.
- **Одержувач не в запиті.** Чат береться з `ADMIN_TELEGRAM_ID`; тіло не може вказати іншого.
- **Дані, а не розмітка.** Тіло — структуровані поля; HTML складає сервер із шаблону в базі, кожне
  значення проходить `escapeHtml`. Посилання — лише `https://github.com/...` (кнопки «Deploy run» і
  «Коміт») та наш https-хост.
- **Ліміти.** Тіло ≤ 8 КБ, джоб ≤ 12, гейтів ≤ 40, рядків ≤ 6 по 300 символів, 10 звітів на годину
  (лічильник у D1). Навіть із чужим ключем максимум — потік звітів у ваш чат.
- **Ідемпотентність.** `agent_reports.run_id` унікальний: повторний прогін повертає наявний
  `message_id`, а не друге повідомлення.

## Слова — у базі

Шаблон лежить у рядку `bot_scenarios` з `lookup = '/report'` (міграція
`2026-11-14-bot-report-template.sql`), `widget_data` тримає слова статусу. Код підставляє:

`{{repo}}` `{{statusIcon}}` `{{statusWord}}` `{{branch}}` `{{shaShort}}` `{{date}}` `{{jobs}}`
`{{gates}}` `{{gateCount}}` `{{commitSubject}}` `{{author}}` `{{added}}` `{{removed}}` `{{files}}`
`{{notes}}` `{{limitations}}` `{{env}}` `{{runUrl}}` `{{commitUrl}}` `{{platformUrl}}`

Немає рядка — звіт **не надсилається** (`500 template_missing`): типовий текст у коді приховав би
помилку, а не полагодив її. Правка слів — `UPDATE` рядка, без деплою воркера.

**Що змінилось і що не перевірено** приїжджає з тіла коміта: пункти `- …` стають списком змін, а
блок після рядка `Limits:` — списком обмежень. Тому звіт описує роботу так, як її описав автор
коміта, а не як угадав CI.

## Історія

Таблиця `agent_reports`: `run_id`, `created_at`, `status`, `sha`, `branch`, `html`, `message_id`.
`html` — точний rich-текст, який пішов у чат, тож історія відтворюється без перерахунку.

| Вхід | Що дає |
|---|---|
| `/reports` у боті (власник) | останні 10 звітів акордеонами `<details>` |
| `/report <run_id>` у боті | один звіт у тому вигляді, у якому він прийшов |
| `GET /reports?limit=20` з ключем | JSON-список для агента: без GitHub і Cloudflare |

## Секрети

| Ім'я | Де | Призначення |
|---|---|---|
| `AGENT_REPORT_KEY` | лише `wrangler secret put` | ручний звіт і `GET /reports`; CI ним не користується |
| `ADMIN_TELEGRAM_ID` | секрет бота (уже є) | єдиний одержувач звітів |

## Файли

`bot-dev/src/modules/reports/` (parse, render, template, repository, ingest, read, history),
`bot-dev/src/api/controllers/reports.controller.ts`, `scripts/deploy-report.mjs`,
`.github/workflows/deploy.yml`, `scripts/migrations/2026-11-14-bot-report-template.sql`.
