<!-- журнал 11.09: CI блокує деплой, моніторинг -->
> **Частина архіву консолідації.** Покажчик розділів — [`docs/CONSOLIDATION_LOG.md`](../CONSOLIDATION_LOG.md).
> Числа тут — на дату свого запису, не «останні».

### 11.09.2026 — CI блокує деплой (S-6, §5.7)

| Що | Файл |
|---|---|
| Єдина блокуюча джоба `checks` | `.github/workflows/deploy.yml` — `npm ci` → `npm audit --audit-level=critical` → `lint` → `typecheck` → `test` |
| Тести тепер гейтять (S-6 закрито) | там само |
| Відтворювані збірки | `npm install` → `npm ci` у всіх джобах + `cache: npm` |
| Гейти на pull request | `pull_request` тригер; деплой-джоби під `github.event_name != 'pull_request'` |
| Черга деплоїв | `concurrency: deploy-${{ github.ref }}`, `cancel-in-progress: false` |
| Мінімум прав | `permissions: contents: read` |
| Гілка `audit` злита в `checks` | окрема джоба видалена (менше інсталів, один лог для дебагу) |
| Доки | `README.md`, `CONTRIBUTING.md`, `AGENTS.md` §6/§8 |

**Перевірка:** YAML валідний (розібраний парсером, не «на око») ✅ ·
`npm audit --audit-level=critical` exit 0 ✅ · `npm test` — 126/126 ✅ ·
`typecheck` — чисто ✅ · `lint` — 0 errors ✅
**CI на GitHub:** run 34584670467 ✅ — джоба `checks` виконала всі п'ять гейтів
(`npm ci` → аудит → лінт → типи → тести), деплой-джоби коректно пропущені
(у пуші не було коду воркерів).

### 11.09.2026 — моніторинг: `/health/deep` + Workers Logs (§5.8)

| Що | Файли |
|---|---|
| Два health-ендпоїнти | `api-dev/src/controllers/health.controller.ts` — `/health` (liveness) і `/health/deep` (503 при мертвих D1/KV) |
| Роутинг | `api-dev/src/router.ts` — `/health/` і `/health/deep` |
| Workers Logs у всіх 4 воркерах | `api-dev/wrangler.toml`, `bot-dev/wrangler.toml`, `web-platform-dev/wrangler.toml`, `web-admin-dev/wrangler.toml` |
| Тести | `api-dev/src/controllers/health.controller.test.ts` (7): 503, відсутність витоку тексту помилки, один запит до БД |
| Лог | `health.controller.ts` → `apiLog.error` замість сирого `console.error` |

**Перевірка:** `npm test` — 133/133 ✅ · `npm run typecheck` — чисто на всіх 6
воркспейсах ✅ · `npm run lint` — 0 errors (6 warnings у `web-admin`) ✅
**Далі (поза комітом):** підключити UptimeRobot на `/health/deep`, потім Sentry.
_На момент цього кроку тестів було 133; наступний коміт (§3.3) додав 8 → 141._

