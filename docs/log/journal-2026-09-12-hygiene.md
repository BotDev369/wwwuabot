<!-- журнал 12.09: гігієна репозиторію, Prettier, 0 warnings -->
> **Частина архіву консолідації.** Покажчик розділів — [`docs/CONSOLIDATION_LOG.md`](../CONSOLIDATION_LOG.md).
> Числа тут — на дату свого запису, не «останні».

### 12.09.2026 — гігієна репозиторію: одна модель середовищ, правильні імена, Prettier-гейт, 0 warnings

Три речі, які щодня коштували часу — і всі три виправлені одним заходом.

**1. Модель середовищ була брехливою.** `bot-dev` і `api-dev` мали `ENVIRONMENT = "production"`,
хоча воркери називаються `*-dev` і прод ніколи не деплоївся. Наслідок: користувачі дев-бота
бачили «(Dev mode)» там, де мало бути мовчки, а Sentry плутав би середовища після
майбутнього деплою прода.

| Що | Файли |
|---|---|
| Єдине джерело правди: `getEnvironment()`, `isProduction()` | `packages/shared/src/config/environment.ts` + тест (5) |
| Тест-сторож: `name = "*-dev"` мусить дорівнювати `ENVIRONMENT = "dev"` | `packages/shared/src/config/wrangler-env.test.ts` (13) |
| `ENVIRONMENT = "dev"` у всіх 3 воркерах, де він є | `bot-dev/`, `api-dev/`, `web-platform-dev/wrangler.toml` |
| `isProduction(env)` замість порівняння рядків | `packages/shared/src/observability/sentry.ts` |
| `CURRENT_ENVIRONMENT` у тексті помилки бота | `bot-dev/src/shared/config/texts.ts` |

Ключове: рішення «це прод?» тепер приймає **рівно одна функція**, а не порівняння
рядків у кожному воркері. Коли прод колись увімкнеться — це буде зміна конфігу
(`*-dev` → `*`, `ENVIRONMENT = "production"`), а не правка логіки.

**2. Імена воркерів у документах розходились із реальністю.** `AGENTS.md` описував
`bot/`, `web/`, `web-admin/`, а воркери звуться `bot-dev/`, `web-platform-dev/`,
`web-admin-dev/`. Це не косметика: у репозиторії без прода неправильна назва —
прямий шлях до пушу не туди. Виправлено 3 місця в `AGENTS.md`.

**3. `format:check` був свідомо відсутній у CI, а lint давав 22 warnings.**
201 файл відформатовано Prettier; гейт `npm run format:check` доданий у джобу `checks`.
Тепер жоден агент (включно зі мною) не запушить код, який не відповідає Prettier.

| Категорія warnings (було 22) | Як виправлено |
|---|---|
| 10 незадіяних імпортів/змінних | Видалено (мертвий код) |
| 4 змішано в `useEffect` + `useState` | Перероблено: `useMemo` (`SiteEditorPage`), синхронна перевірка без стану (`AuthGate`) |
| 1 відсутня залежність `useMemo` | `requestedCodeword` → `codeword` (`DynamicPage`) |
| 8 `set-state-in-effect` на async-завантаженні | Точкові `eslint-disable-next-line` з поясненням: `setState` відбувається в `.then()`, тобто **після** ефекту |

**Перевірка:** `npm test` — 182/182 ✅ · `npm run typecheck` — чисто на 6 воркспейсах ✅ ·
`npm run lint` — **0 errors, 0 warnings** ✅ · `npm run format:check` — All matched files use Prettier code style ✅

**Чому це важливіше за нову фічу:** кожен наступний коміт (людський чи агентський) починається
з чистого `git status`-у можливостей: лінт не шумить, формат не сперечається, а ім'я воркера
й `ENVIRONMENT` не можуть розійтися без червоного CI.

