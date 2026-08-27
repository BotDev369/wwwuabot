# AGENTS.md — Інструкція для AI-агентів у проєкті wwwuabot

> **Версія:** 1.1
> **Останнє оновлення:** 27.08.2026
> **Статус:** містить перевірені факти та архітектурні рішення.

Цей файл — стислий орієнтир для будь-якого AI-агента (Claude, GPT,
Buffy чи інший), що вперше заходить у проєкт. Мета: не змушувати
агента вгадувати структуру й конвенції заново щоразу.

**Перед будь-якою задачею з робочого плану** — обов'язково прочитай
також `public docs/PROJECT_PLAN.md` (там окрема секція "Інструкція
для AI-агентів" з протоколом статусів задач) і, за потреби,
`public docs/AUDIT.md` та `public docs/SCORECARD.md`.

---

## 1. Що це за проєкт

Монорепо (npm workspaces) з чотирма незалежними Cloudflare Workers:

```
wwwuabot/
├── bot/            # Telegram-бот: grammY + D1 (SQLite) + Cloudflare Queues + Cloudinary
├── api/            # REST API: калькулятори, CRUD, аналітика (D1 + KV-кеш)
├── web/            # Telegram Mini App: React 18, Vite 5, React Router 6
├── web-admin/      # Адмін-панель: React 19, Vite, Zustand, Tailwind CSS 4, React Router 7
├── packages/       # Спільний код (npm workspace package)
│   └── shared/     # Утиліти, типи, константи для всіх воркерів
└── public docs/    # AUDIT.md, PROJECT_PLAN.md, SCORECARD.md — читати першими
```

Кожен воркер має власний `wrangler.toml` і `package.json` та
деплоїться окремо. Зв'язки: `bot` і `web-admin` пишуть у D1 напряму;
`web` (TWA) ходить через `api` (service binding) до тієї ж D1 + KV.

Ліцензія — **AGPL-3.0** (`LICENSE` у корені). Будь-який похідний
проєкт зобов'язаний залишатись відкритим під тією ж ліцензією —
враховуй це, якщо пропонуєш підключити сторонній код/бібліотеку.

---

## 2. Доменні терміни

- **Scenario** — контентна одиниця: екран бота з кнопками, підписом,
  фото. Типи описані в `bot/src/shared/types/scenario.ts`
  (`ScenarioRow` — сира БД-форма з полями як JSON-рядки; `Scenario` —
  розпарсена форма для використання в коді). Поля включають
  `codeword`, `photo_url`, `caption_top/mid/bot`, `keyboard_type`,
  `buttons`, `rich_message`/`rich_data` (block-based повідомлення).
  Читання/оновлення сценаріїв в адмінці — через ендпоінти
  `POST /api/scenarios/read-all` і `POST /api/scenarios/update`
  (web-admin worker).

- **Family Box** — JSON-стан користувача, серіалізований у текстову
  колонку D1 (наприклад, кошик, дати, стан гри). Утиліти —
  `bot/src/shared/utils/family-box.ts`: `getFamilyBox()` безпечно
  парсить (повертає `{}` при биттих даних, не кидає виняток),
  `setByPath()` пише за шляхом з крапками (`"survey.name"`),
  `saveFamilyBox()` серіалізує назад у поле користувача. **Важливо:**
  ці функції не викликають запис у БД самі — прапор "юзер змінився"
  (`userDirty`) виставляється окремо в `bot-router.ts`.

- **Rich Message** — блоковий формат повідомлень (`rich_data` —
  масив блоків, `rich_message` — булевий прапорець "чи саме такий
  формат використовувати"). Редагується через RichMessage Editor у
  `web-admin`.

- **Forum Topics** — нотифікації в Telegram-групах з розділенням по
  темах (topics). Логіка створення/пошуку топіка —
  `bot/src/modules/notifications/topic-manager.ts`
  (`getOrCreateTopic()`): назва топіка формується як
  `"{user_id} - {first_name} {last_name} - @{username}"`, обрізається
  до 128 символів (ліміт Telegram API), id топіків зберігаються в
  JSON-полі `topics` користувача.

---

## 3. Архітектура: API та спільний код (правила повторюваності)

### 3.1. Правило «двічі — в спільне»

> **Якщо код повторюється двічі або більше — це треба виносити
> в `packages/shared/`.**

Конкретні приклади з проєкту:
- `formatSqliteDatetime()` був скопійований у 3 воркери (bot, api,
  web-admin) — винесено в `packages/shared/utils/datetime.ts`
  (задача P1-3).
- `withAutoMigrate()` був скопійований з `bot/` в `api/` — винесено
  в `packages/shared/database/auto-migrate.ts` (задача P1-2).
- `VALID_TYPES` дублювався у 3 копіях в `api/index.ts` —
  об'єднано в одну константу на рівні модуля (задача P1-4).

**Що НЕ виносити в shared:**
- Компоненти React (web / web-admin) — різні фреймворки/версії.
- Серверна логіка воркера (роутинг, мідлвари) — специфічна
  для кожного сервісу.
- Конфігурація `wrangler.toml` — окрема для кожного воркера.

### 3.2. Єдиний API-шлюз через `api/`

> **Всі зовнішні REST-ендпоїнти мають бути в `api/`.**
> **Не створюй нові API-маршрути в `bot/`, `web/` чи `web-admin/`.**

Поточна архітектура:

| Воркер | Роль | API-ендпоїнти |
|---|---|---|
| `api/` | **Єдиний REST API-шлюз** | `/api/*` — все для зовнішніх клієнтів |
| `bot/` | Telegram-бот | Тільки webhook + Telegram Bot API |
| `web/` | Telegram Mini App | Через `api/` (service binding) |
| `web-admin/` | Адмін-панель | Внутрішні ендпоїнти (адмінські функції) |

**Винятки (поки що дозволені):**
- `web-admin/worker.ts` має власні `/api/*` маршрути — адмінські
  функції (CRUD користувачів, сценаріїв, повідомлення). Це
  тимчасовий стан до завдання P2-3 (монорепо), коли `web-admin`
  може використовувати service binding до `api/`.
- `bot/src/api/router.ts` має HTTP-ендпоїнти для Telegram webhook
  та callback queries — це специфіка grammY.

**Правило для нових задач:** якщо потрібен новий REST-ендпоїнт,
додавай його в `api/src/index.ts` (або після P1-1 — в
`api/src/router.ts` + відповідний controller).

### 3.3. Структура `packages/shared`

```
packages/shared/
├── src/
│   ├── utils/          # Чисті функції (datetime.ts, family-box.ts)
│   ├── types/          # Спільні TypeScript-типи
│   ├── database/       # Авто-міграція D1 (auto-migrate.ts)
│   └── constants/      # Константи (VALID_TYPES тощо)
├── package.json        # npm workspace package: @wwwuabot/shared
└── tsconfig.json
```

Доступ з воркерів: `import { formatSqliteDatetime } from "@wwwuabot/shared"`.

### 3.4. Додавання нового спільного коду (чек-ліст)

1. **Чи ця функція/константа/тип вже існує в іншому воркері?**
   Якщо так — використовуй її, не копіюй.
2. **Чи ця логіка специфічна для одного воркера?**
   Якщо так — не винось (наприклад, Telegram webhook handler).
3. **Чи ця логіка буде потрібна в 2+ воркерах?**
   Якщо так — клади в `packages/shared/`.
4. **Додай типи та JSDoc** — shared-код використовується без
   контексту, тому документація обов'язкова.
5. **Онови цей файл** (AGENTS.md) — якщо з'явилась нова конвенція.

---

## 4. Де що шукати (`bot/` — еталонна структура)

`bot/src/` — найбільш дисципльнована частина репозиторію. Якщо не
знаєш, куди класти новий код у `bot/`, орієнтуйся на цю мапу:

| Тип коду | Куди класти | Приклад |
|---|---|---|
| HTTP-роутинг Worker'а (не Telegram-апдейти) | `bot/src/api/router.ts` + `bot/src/api/controllers/` | `webhook.controller.ts`, `my-dates.controller.ts` |
| Обробка Telegram-команд/колбеків | `bot/src/core/router/` | `command.ts`, `callback.ts`, `text-input.ts`, `actions/` |
| Middleware (до/після обробки апдейту) | `bot/src/core/middleware/{pre,post,intercept}/` | `rate-limit.ts`, `filter-updates.ts` |
| Доступ до БД (репозиторії) | `bot/src/repositories/` (для сценаріїв/налаштувань) або `bot/src/modules/<domain>/*.repository.ts` (для доменних сутностей) | `scenario.repository.ts`, `modules/users/user.repository.ts` |
| Авто-міграція колонок D1 | `bot/src/core/database/auto-migrate.ts` | функція `withAutoMigrate` |
| Доменна логіка окремого модуля | `bot/src/modules/<domain>/` | `modules/notifications/`, `modules/games/tictactoe/`, `modules/logging/` |
| Спільні утиліти без прив'язки до домену | `packages/shared/src/utils/` (або `bot/src/shared/utils/` поки shared не зібрано) | `family-box.ts`, `datetime.ts`, `screen.ts` |
| Спільні типи | `packages/shared/src/types/` (або `bot/src/shared/types/`) | `env.ts`, `scenario.ts`, `log.ts` |
| Текстові константи / конфіг | `bot/src/shared/config/` | `texts.ts` |
| Обробка задач з Cloudflare Queue | `bot/src/api/queue/queue.handler.ts` | — |

`api/` **поки не дотримується** цієї структури повністю — весь код в
одному `api/src/index.ts` (612 рядків), спільні шматки вже винесені
в `api/src/shared/` (`logger.ts`, `datetime.ts`, `auto-migrate.ts`).
Розбиття на router+controllers за прикладом `bot/src/api/` — задача
**P1-1** у `PROJECT_PLAN.md` (ще не виконана). Поки що: не сприймай
поточну структуру `api/` як зразок для нового коду — краще
орієнтуватись на `bot/src/api/`.

`web/src/` — `components/` (rendering, fallback, layout, demo) +
`pages/`. `web-admin/src/` — feature-based:
`features/<domain>/` (store, логіка) + `pages/<domain>/` (компоненти
сторінки) + `shared/api/` (API-клієнти по доменах, напр.
`users.api.ts`, `scenarios.api.ts`) + `layout/`.

---

## 5. Конвенції коду

- **TypeScript** скрізь, `strict`-орієнтовано, хоча повне усунення
  `any` ще не завершене (задача P2-1 у плані, зараз ~101 випадок,
  переважно в `api/`).
- **ESLint + Prettier** підключені у всіх 4 сервісах через кореневий
  конфіг + `.editorconfig`. Команди з кореня: `npm run lint`,
  `npm run lint:fix`, `npm run format`, `npm run format:check`.
  Лінтер **не блокує коміт локально** (немає pre-commit hook) —
  тому обов'язково прогнати `npm run lint` вручну перед тим, як
  вважати задачу завершеною.
- **Логування:** єдиний підхід у `bot/` — модуль
  `bot/src/modules/logging/` (пише в Cloudflare Queue). В `api/` —
  простіша обгортка `api/src/shared/logger.ts` (`apiLog`, префікс
  `[api]`). Ніде не використовувати "голий" `console.log`/
  `console.error` у продакшн-коді.
- **Дата/час у D1:** використовувати `formatSqliteDatetime()`
  з `packages/shared/src/utils/datetime.ts` (не писати
  `new Date().toISOString().replace(...)` вручну — раніше це
  дублювалось у 7+ місцях).
- **CI/CD:** `.github/workflows/` — GitHub Actions з path filtering
  (деплоїться лише змінений воркер), крок lint перед деплоєм,
  Dependabot увімкнений. Секрети (`CLOUDFLARE_API_TOKEN`,
  `CLOUDFLARE_ACCOUNT_ID`) — тільки в GitHub Secrets, ніколи в коді
  чи `wrangler.toml`.

---

## 6. Чого точно НЕ робити (реальні прецеденти з цього репо)

- **Не пиши власну версію авто-міграції колонок D1.** `api/` колись
  завела власну спрощену версію (`ensureMyDatesColumn`) замість
  використання вже готової `withAutoMigrate` з `bot/`. Дублікат
  прибрано (задача P1-2) — не повторюй цю помилку в новому коді.
  Використовуй `withAutoMigrate` з `packages/shared/`.
- **Не дублюй списки/константи копіюванням.** У `api/src/index.ts`
  один і той самий `VALID_TYPES` існував у трьох копіях
  (`VALID_TYPES`, `VALID_TYPES_PUT` тощо) — прибрано в P1-4. Якщо
  потрібна константа в кількох місцях файлу — винось на рівень
  модуля один раз.
- **Не роби `SELECT *` на таблицях з важкими JSON-колонками.**
  `users` містить важкі поля (`my_dates`, `admin`, `galyashop`,
  `topics`, `ttt`) — `SELECT * FROM users` для списків ризикує
  перевищити CPU-time ліміт воркера. Для списків — вибіркові
  колонки (див. `WA-U14` у `PROJECT_PLAN.md` як приклад виправлення).
- **Не забувай `[[d1_databases]]` на top-level `wrangler.toml`,**
  якщо біндинг визначений лише в `[env.dev]`/`[env.production]` —
  дефолтний воркер отримає `env.DB = undefined` (реальний баг,
  виправлений у `WA-U12`, спричиняв `Cannot read properties of
  undefined (reading 'prepare')`).
- **Не змішуй prod і dev бази/оточення.** `wrangler.toml` кожного
  сервісу повинен мати явні `[env.production]` і `[env.dev]` з
  різними `database_id` (прецедент: P0-1, `web-admin` спочатку
  вказував напряму на dev-базу).
- **Не дублюй код між воркерами.** Якщо потрібна функція/константа
  вже є в іншому воркері — клади в `packages/shared/`, а не
  копіюй (приклад: `formatSqliteDatetime` був у 7+ місцях).
- **Не створюй нові API-ендпоїнти поза `api/`** (крім адмінських
  в `web-admin/` та webhook'ів у `bot/`). Див. розділ 3.2.
- **Не позначай задачу з `PROJECT_PLAN.md` виконаною (✅) без
  локального/dev-тестування.** Це явна вимога самого плану, не лише
  цього файлу.
- **Не редагуй заднім числом "Журнал виконаних задач" чи "Нові
  знахідки" в `PROJECT_PLAN.md`** — тільки додавай нові рядки.

---

## 7. Поточні обмеження проєкту (щоб не дивуватись)

- **Тестів немає взагалі** — жодного `*.test.ts`/`*.spec.ts`, жодного
  test-фреймворку в жодному з 4 `package.json`. Якщо задача передбачає
  зміну критичної логіки (розрахунки, валідація), тестами вона поки
  не підстрахована — будь обережним і перевіряй вручну.
- **Немає CONTRIBUTING.md, CHANGELOG.md, README всередині кожного
  сервісу** (`bot/`, `api/`, `web/` — крім `web-admin/README.md`,
  який уже існує).
- Повна методика оцінки стану проєкту і поточні бали за 10
  критеріями — `public docs/SCORECARD.md`. Актуальний план задач із
  пріоритетами і статусами — `public docs/PROJECT_PLAN.md`.

---

## 8. Як розширювати цей файл

Це версія 1.1 — оновлена з додаванням розділу 3 (архітектура API
та спільний код). Коли з'являться нові стабільні конвенції або
будуть закриті задачі, що на них впливають (наприклад, P1-1 —
розбиття `api/` на router+controllers, або P2-3 — повний збір
`packages/shared/`), онови відповідні розділи тут і познач
задачу `S-8` у `PROJECT_PLAN.md`. Не видаляй попередні розділи
"мовчки" — якщо конвенція змінилась, познач це явно (стара
версія → нова, дата).

### Журнал змін

| Дата | Версія | Що змінилось |
|---|---|---|
| 27.08.2026 | 1.0 | Початкова версія |
| 27.08.2026 | 1.1 | Додано розділ 3: архітектура API та спільний код, правило «двічі — в спільне», єдиний API-шлюз через `api/`, структура `packages/shared`, чек-ліст нового shared-коду |
