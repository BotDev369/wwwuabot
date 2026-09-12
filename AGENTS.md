# AGENTS.md

> **Версія:** 2.6 | **Останнє оновлення:** 12.09.2026
>
> **Зміна 2.6:** з'явилась **планка в CI** — `npm run check:quality`. Чотири правила,
> які доти існували лише текстом у цьому файлі, тепер перевіряються статично: ліміт
> рядків файлу (400 — помилка, 200 — попередження), заборона нативних
> `alert`/`confirm`/`prompt`, `100vh` без `100dvh`-фолбеку і емодзі в UI. Гейт
> одразу знайшов і закрив **16 справжніх емодзі** в кнопках обох оболонок
> (📋 🔗 🤖 🏗️ 🔄 📥 та інші) і заодно виправив два числа в аудиті: «13 голих `100vh`»
> виявились фолбек-парами — голих немає жодного. `no-explicit-any` переведено з
> `warn` у **`error`** в усіх п'яти конфігах. Відомий борг — `scripts/quality-baseline.mjs`
> (4 файли > 400 із плану §3.2 і §3.5), і він тільки зменшується.
>
> **Зміна 2.5:** каркас оболонок винесено в спільні кирпичики —
> `packages/shared/src/styles/app-chrome.css` (`.wb-app*`, `.wb-nav*`, `.wb-topbar*`,
> `.wb-page*`, `.wb-auth*`, `.wb-splash`, `.wb-profile*`). До цього в `web-platform-dev`
> і `web-admin-dev` **не було жодного спільного за назвою класу** для тих самих
> елементів (адмінка мала `.sidebar-*`/`.login-*`/`.topbar`/`.splash`, платформа — свої),
> а брендові теми стилізували приватні класи адмінки з `!important`, тож платформа
> їхніх правил не отримувала ніколи. Тоді ж з'явився гейт «клас без правила»
> (`npm run check:css`, той самий у CI) — він знайшов і закрив 8 реальних дефектів.
> Деталі — `docs/CONSOLIDATION_LOG.md` §9.
>
> **Зміна 2.4:** видалено **74 недосяжні файли (5 238 рядків, 15% коду)** — легасі-острів
> `pages/mydate/` платформи, легасі-редактор блоків адмінки, чотири сторінки-сироти й шими
> (перевірено графом імпортів, а не оком). Масштаб у §8 переміряно: **253 файли,
> 29 960 рядків** (було 349 і ≈ 37 200). Додано `docs/CODE_QUALITY_AUDIT.md` —
> оцінка за 10 критеріями з доказами; поточний бал **58%**, стеля плану ~90%.
>
> **Зміна 2.3:** план і журнал розділено. Актуальні числа й план робіт —
> `docs/CONSOLIDATION_PLAN.md`; хронологія, деталі аудиту та журнал —
> `docs/CONSOLIDATION_LOG.md` (нумерація §1–§5, §7–§9 збережена — на неї є посилання
> з коду). У §7 виправлено число: класів `wb-block-*` без правил не 107, а 44
> (переміряно 12.09.2026).
>
> **Зміна 2.2:** §7 отримав правило «клас без правила — це помилка» (деталі —
> `docs/CONSOLIDATION_LOG.md` §4.5). Виправлено хибне посилання на «§10» у §8 —
> журнал плану це §9.
>
> **Зміна 2.1:** прибрано неіснуючий «Family Box» з §2 (перевірено пошуком по всьому
> репозиторію — ані файлу, ані згадок), уточнено реальні шляхи в §5, §8 переписано
> за вимірюваннями, а не за оцінками.

Інструкція для AI-агентів (Claude, GPT, Buffy тощо). Перед початком роботи прочитай цей файл повністю.

---

## 1. Монорепозиторій

4 незалежні Cloudflare Workers + 2 спільні пакети:

```
bot-dev/          Telegram-бот: grammY + D1 + Queues + Cloudinary
api-dev/          REST API: калькулятори, CRUD, аналітика (D1 + KV)
web-platform-dev/ Telegram Mini App: React 19, Vite 8, Tailwind 4, Zustand
web-admin-dev/    Адмін-панель: React 19, Vite 8, Tailwind 4, Page Builder
packages/shared/  Типи, утиліти, дизайн-токени, іконки (@wwwuabot/shared)
packages/ui/      Спільні React-компоненти Page Builder (@wwwuabot/ui)
```

Зв'язки: `bot` пише в D1 напряму (власний біндинг `DB`). `web` і `web-admin` — тонкі оболонки: усі дані йдуть через `api-dev` (service binding), жоден із них не має прямого доступу до D1. Деплой — автоматичний при пуші в `main` (GitHub Actions, path filtering).

**Середовища (станом на 12.09.2026):** задеплоєні **лише дев-воркери** — `bot-dev`,
`api-dev`, `web-platform-dev`, `web-admin-dev` (БД `wwwuabot-db-dev`). **Прода немає і він
ніколи не деплоївся.** Слово «прод» у доках означає майбутній деплой, а не поточний стан:
коли йдеться про те, що вже працює, правильно казати «дев» або називати воркер.

Код пишевся так, щоб прод вмикався **конфігом**, а не правками в логіці: окремі воркери,
окрема БД, власний `ENVIRONMENT`. Рішення «це прод?» приймає рівно одна функція —
`isProduction()` з `packages/shared/src/config/environment.ts`; у кожному `wrangler.toml`
`ENVIRONMENT` мусить збігатися з іменем воркера (`*-dev` → `dev`), і це стереже
`wrangler-env.test.ts`.

**Ліцензія:** AGPL-3.0 — похідні проекти зобов'язані залишатись open source.

---

## 2. Доменні терміни

- **Scenario** — контентна одиниця: екран бота з кнопками, підписом, фото. Типи: `bot-dev/src/shared/types/scenario.ts`. Поля: `codeword`, `photo_url`, `caption_top/mid/bot`, `keyboard_type`, `buttons`, `rich_message`/`rich_data`, `page_data`.
- **Стан користувача** — рядок таблиці `users` у D1 (репозиторій: `bot-dev/src/modules/users/user.repository.ts`). Схема «м'яка»: колонки додає `withAutoMigrate` з `@wwwuabot/shared/database/auto-migrate` на першому записі (`is_blocked`, `rate_limit_json`, …), тому фіксованого списку полів немає. Читання БД не пише: зміни позначає прапор `ctx.userDirty`, а запис робить post-middleware (`bot-dev/src/core/middleware/post/index.ts`), який викликає `botRouter` з `src/core/router/bot-router.ts`.
  > **Було до 12.09.2026:** тут описувались «Family Box» і `packages/shared/src/utils/family-box.ts`. Такого файлу й такої назви в коді **немає** — це була документація до скасованої ідеї, і вона вводила в оману при пошуку утиліт.
- **Page Builder** — блочна система сторінок. Сторінка = scenarios з `page_data`. 4 зони: sidebar, header, main, footer. Блоки рекурсивні, автономні. Типи: `packages/shared/src/types/page-config.ts`. Реєстр: `packages/shared/src/constants/block-definitions/`. React-компоненти: `packages/ui/src/blocks/`.
- **Conditional Rendering** — умовний показ блоків за role/tariff/status/permissions користувача. `packages/shared/src/utils/condition-evaluator.ts`.
- **Design System** — подвійна тема Apple/Material через `data-brand` на `<html>`. CSS-токени: `packages/shared/src/styles/`. Темна/світла: `data-theme`.

---

## 3. Архітектурні правила

### Спільний код (правило «двічі — в спільне»)
> Код, що повторюється 2+ рази, йде в `packages/shared/` або `packages/ui/`.

- Створюй у shared, якщо логіка потрібна в 2+ воркерах.
- Не внось серверну логіку воркера (роутинг, мідлвари).
- Не внось конфігурацію `wrangler.toml`.

### Єдиний API-шлюз
> Всі зовнішні REST-ендпоїнти — в `api-dev/`. Не створюй нові API в `bot-dev/`, `web-platform-dev/`, `web-admin-dev/`.

Винятки: webhook'и в `bot-dev/`, тимчасові admin-ендпоїнти в `web-admin-dev/`.

### Межа між `web` і `web-admin` (тонкі оболонки)
> Обидва — оболонки навколо спільного ядра. Ділити можна *логіку*, не *рішення*.

| Шар | Спільний? | Куди |
|---|---|---|
| Типи, утиліти, токени, CSS | ✅ | `packages/shared` |
| Рендеринг блоків і сторінок (`PageRenderer`) | ✅ | `packages/ui` |
| Транспорт API (`apiFetch`) | ✅ | `packages/shared` |
| Перевірка сесії (HMAC, cookie, `initData`) — **чиста функція** | ✅ | `packages/shared/src/security/` |
| `AuthGate` (що робити при провалі) | ❌ | окремо в кожному застосунку |
| Роутер, `worker.ts`, `wrangler.toml` | ❌ | окремо |

**Ключове:** перевірка — спільна; реакція на провал — своя (TWA показує «відкрийте
в Telegram», адмінка — `LoginScreen`). План робіт — `docs/CONSOLIDATION_PLAN.md`, деталі й
журнал — `docs/CONSOLIDATION_LOG.md`.

### Єдиний дизайн і мобільний пріоритет (встановлено 12.09.2026)

> `web-platform-dev` і `web-admin-dev` — дві оболонки **одного** продукту. Візуально вони
> мусять бути не «схожими», а **однаковими**: різниця лише в логіці (які роути, які дані,
> яка авторизація), не у вигляді. Будь-яка нова візуальна деталь проєктується спільною і
> живе в `packages/shared/styles/` або `packages/ui` — не в `index.css` однієї з оболонок.

- **Мобільний — пріоритет №1.** Єдина точка взаємодії користувачів — Telegram Mini App,
  а це переважно телефони. Мобільний вигляд перевіряється першим, десктоп — після нього.
- Верстка **резинова**: `flex`/`grid` + `clamp()`/`min()`, без фіксованих ширин розкладки.
  Пікселі — тільки для дрібних елементів, де вони справді мусять бути фіксованими.
- Висота екрана — `100dvh` (з `100vh` як фолбеком), не голий `100vh`: на мобільному
  адресний рядок ховається і висота «стрибає».
- Краї екрана — `var(--safe-top)` / `var(--safe-bottom)`: вони враховують і
  `env(safe-area-inset-*)`, і `--tg-safe-area-inset-*` від Telegram. Для цього в
  `index.html` обовʼязковий `viewport-fit=cover`.
- Мобільна навігація — виїзний drawer (`--drawer-w`, `--scrim`, `--duration-slow`,
  `--ease`): той самий патерн в обох оболонках, різні лише пункти меню.
- **`@media (hover: none)`.** Усе, що показується на `:hover`, на телефоні не покажеться
  ніколи. Дії, приховані до hover, на тачі мусять бути видимі постійно (приклад — кнопки
  ↑ ↓ ✕ у редакторі блоків).

### Кирпичики: оболонка складається, а не малюється (встановлено 12.09.2026)

> Каркас оболонки описаний один раз — `packages/shared/src/styles/app-chrome.css`.
> Оболонка **складає** його з `.wb-*`-кирпичиків і додає лише своє: роути, дані,
> права, склад меню.

| Група | Кирпичики |
|---|---|
| Каркас | `.wb-app`, `.wb-app-main`, `.wb-app-body`, `.wb-app-header`, `.wb-app-title`, `.wb-app-hamburger`, `.wb-app-logout` |
| Меню | `.wb-nav` (+ `--collapsed`), `.wb-nav-header/-logo/-title/-toggle`, `.wb-nav-menu`, `.wb-nav-section(-title)`, `.wb-nav-item` (+ `--active`), `.wb-nav-icon`, `.wb-nav-label`, `.wb-nav-footer` |
| Шапка | `.wb-topbar`, `.wb-topbar-left/-title/-right` |
| Сторінка | `.wb-page`, `.wb-page-head`, `.wb-page-title`, `.wb-page-actions` |
| Екрани | `.wb-splash`, `.wb-auth*` (картка, поле, помилка, кнопка) |
| Профіль | `.wb-profile*` (рендерить спільний `UserProfileCard`) |

Правило: **однакова деталь у двох оболонках — це кирпичик, а не «стиль оболонки»**.
Новий приватний клас під те, що вже має кирпичик, — дефект. Брендові теми
(`apple.css` / `android.css`) стилізують саме кирпичики, тому `data-brand` доходить
до обох оболонок однаково; раніше бренд стилізував `.sidebar-*` адмінки з `!important`,
а в платформі ці правила не спрацьовували ніколи.

Перевірка межі автоматична — `npm run check:css` (той самий гейт у CI):

1. клас, який рендерить спільний код (`packages/ui`, `packages/shared`), мусить мати
   правило в `packages/shared/src/styles/`;
2. клас у розмітці оболонки мусить мати правило в shared або у власному CSS цієї
   оболонки (клас із CSS сусідньої оболонки не працює).

Відомий борг живе в `scripts/css-baseline.mjs` і тільки зменшується.

### Кристалева ясність (Crystal Clarity Rule)
> **АБСОЛЮТНЕ ПРАВИЛО: ніколи не пиши «простині» (моноліти).**

| Рівень | Дія |
|---|---|
| Файл > 200 рядків | Червоний прапець. Розбивай на хуки, підкомпоненти, хелпери. |
| Файл > 400 рядків | Критично. Зупинись і рефактори НЕГАЙНО. |

- **Компонент** = тільки рендеринг. Логіка = в хуках (`use*.ts`).
- **Хук** = тільки стан та бізнес-логіка. Жодного JSX.
- **Хелпери/константи** = тільки чисті функції та дані. Жодного стану.

Приклад:
```
MyFeaturePage.tsx      (80)  — рендеринг
useMyFeature.ts        (120) — хук
MyFeatureTable.tsx     (80)  — підкомпонент
helpers.ts             (40)  — чисті функції
types.ts               (20)  — типи
```

### Блок-дефінції: компактний запис
> Не пиши JSON-схеми. Використовуй хелпери з `packages/shared/src/constants/block-definitions/helpers.ts`:

```typescript
// БУЛО (30+ рядків):
{ type: "text", label: "Текст", schema: { type: "object", properties: {
  title: { type: "string", title: "Заголовок" },
  content: { type: "string", title: "Текст" },
  level: { type: "string", title: "Рівень", enum: ["h1","h2","body"], default: "body" },
}}}

// СТАЛО (7 рядків):
block({ type: "text", label: "Текст", icon: "text", category: "content",
  props: { title: s("Заголовок"), content: s("Текст"),
    level: e("Рівень", ["h1","h2","body"], { default: "body" }) },
  required: ["content"], defaultProps: { title: "", content: "", level: "body" } })
```

---

## 4. Іконки та дизайн

> **Емоджі в UI ЗАБОРОНЕНІ. Використовувати `<Icon />` з shared.**
> **Дропдауни ЗАБОРОНЕНІ. Використовувати модалки на все вікно.**
> **Нативні `alert` / `confirm` / `prompt` ЗАБОРОНЕНІ. Використовувати `useDialog()`.**

Причина останнього не стилістична: у Telegram Mini App на iOS WebView не має в'юхи для
нативних діалогів — `prompt` повертає `null`, `confirm` — `false`, `alert` не показується
взагалі. Кнопка «Додати сторінку» й підтвердження видалення на телефоні просто нічого не
робили, причому тихо. Спільний діалог малюється тими самими `.wb-modal-*`, тож вигляд
однаковий в обох оболонках, і він єдиний для обох — окремих діалогів у застосунках немає.

```tsx
import { useDialog } from "@wwwuabot/ui/dialog";

const dialog = useDialog();
await dialog.alert("Щось зламалось", { tone: "danger" });
if (!(await dialog.confirm("Видалити?", { tone: "danger", confirmText: "Видалити" }))) return;
const name = await dialog.prompt("Назва:", { validate: (v) => (v.trim() ? null : "Порожньо") });
```

`DialogProvider` стоїть біля кореня `main.tsx` в обох оболонках — там же, де `initTheme()`.

```tsx
import { Icon } from "@wwwuabot/shared";
<Icon name="home" size={16} />
```

Повний перелік іконок та токенів — див. `docs/DESIGN_SYSTEM.md`.

---

## 5. Де що шукати

### bot-dev (еталонна структура)

| Що | Де |
|---|---|
| HTTP-роутинг | `src/api/router.ts` + `src/api/controllers/` |
| Telegram-команди | `src/core/router/` |
| Middleware | `src/core/middleware/{pre,post,intercept}/` |
| Доступ до БД | `src/repositories/` (сценарії, налаштування) або `src/modules/<domain>/*.repository.ts` (користувачі) |
| Доменна логіка | `src/modules/<domain>/` |
| Логування | `src/modules/logging/` |
| Конфіг / тексти | `src/shared/config/texts.ts` |

### Ідентичність і безпека

| Що | Де |
|---|---|
| Перевірка підпису Telegram `initData` | `packages/shared/src/security/telegram.ts` |
| Адмінська cookie-сесія (`signSessionToken`, `hasValidSession`) | `packages/shared/src/security/session.ts` |
| `user_id` для хендлера API | `api-dev/src/shared/identity.ts` — `resolveUserId()` (обов'язково) або `tryResolveUserId()` (для публічних) |
| Діалоги (alert / confirm / prompt) | `packages/ui/src/dialog` — `DialogProvider` + `useDialog()` |
| Адмін-гейт (єдина точка входу) | `api-dev/src/router.ts` — блок `pathname.startsWith("/api/admin/")` |

Обидва модулі в `security/` — **чисті функції**: секрет передається аргументом, рішення
«що робити при провалі» приймає виклик. Не дублюй HMAC-логіку в воркерах.

**Три групи доступу — третя не має винятків:**

| Група | Префікс | Авторизація |
|---|---|---|
| Публічне | `/api/catalog*`, `/api/scenario/`, `/api/mydate/`, `/health` | немає |
| Користувач | `/api/sites`, `/api/my-dates`, `/api/user/profile` | підписаний `initData` + перевірка власника |
| Адмін | `/api/admin/`, `/api/portal/`, `/api/bot/` | cookie `admin_session` |

Адмін-авторизація існує в **двох місцях навмисно**: `web-admin/worker.ts` (до проксі)
і адмін-гейт в `api-dev/router.ts` (після). У `api-dev` є власний публічний URL, тому він
не має покладатися на те, що перед ним стояв проксі. Два рівні однієї перевірки — це не
дублювання, а недовіра до периметра.

### web / web-admin (однакова архітектура)

```
src/
├── App.tsx, main.tsx, index.css, worker.ts
├── app/          AuthGate.tsx, router.tsx
├── layout/       AppShell.tsx, Sidebar/, Header, Footer, PageTopbar
├── pages/        Сторінки
├── shared/api/   Typed API-функції
└── features/     Доменні модулі
```

Каркас (`AppShell`, меню, шапка, екран входу) — **спільні кирпичики**
(`packages/shared/src/styles/app-chrome.css`, §3). Оболонка лише складає їх і додає
своє: у адмінці — `layout/AppShell.tsx` + `layout/Sidebar/*` (`adminNav.store` —
склад і порядок пунктів меню), у платформи — `app/AuthGate.tsx` (замість власного
меню — зони спільного `PageRenderer`).

Відмінності в логіці: `web` — auth через TWA SDK (підписаний `initData`), API через
service binding. **Власного `src/stores/` у платформи немає**: стан живе в хуках сторінок
і фіч (`pages/site-editor/use*.ts`), а спільний Zustand-стор — у `@wwwuabot/shared`
(`useAppStore`), якщо він колись знадобиться. `web-admin` — auth через cookie + HMAC;
прикладні стори живуть у своїх фічах (`features/scenarios/store`, `features/users/store`),
а навігація — в `layout/Sidebar/adminNav.store.ts`.

---

## 6. Конвенції коду

- **TypeScript strict**, 0 `any` — ESLint `no-explicit-any` = **`error`** в усіх 5 конфігах (піднято 12.09.2026; код уже мав 0 `any`, тож правило нічого не зламало).
- **ESLint + Prettier** у всіх 4 сервісах. Команди: `npm run lint`, `npm run typecheck`.
- **Логування:** `bot-dev/` — модуль `modules/logging/` (Queue). `api-dev/` — `apiLog` з префіксом `[api]`. Не використовувати `console.log` у продакшн-коді.
- **Дата/час у D1:** `formatSqliteDatetime()` з `packages/shared/src/utils/datetime.ts`.
- **CI/CD:** GitHub Actions + path filtering. Перед деплоєм в одній джобі `checks` виконуються `npm ci`, `npm audit --audit-level=critical`, `npm run lint`, `npm run typecheck`, `npm run format:check`, `npm run check:css`, `npm run check:quality`, `npm test` — будь-який збій блокує деплой усіх воркерів. Деплої воркерів стоять у черзі (`concurrency`), щоб старіший коміт не ліг поверх новішого. `pull_request` запускає лише гейти — деплой з PR неможливий. `GITHUB_TOKEN` має `contents: read`. Dependabot увімкнений.

---

## 7. Чого НЕ робити

- Не пиши власну авто-міграцію D1 — використовуй `withAutoMigrate` з shared.
- Не дублюй код між воркерами — клади в `packages/shared/`.
- Не роби `SELECT *` на таблицях з важкими JSON-колонками (users).
- Не забувай `[[d1_databases]]` на top-level `wrangler.toml`.
- Не змішуй prod/dev бази — різні `database_id`.
- Не створюй API-ендпоїнти поза `api-dev/`.
- Не довіряй `X-Telegram-User-Id`, cookie `user_id` чи `?user_id=` — ідентичність береться ТІЛЬКИ з підписаного `initData` (`api-dev/src/shared/identity.ts`).
- Не авторизуй адмін-дію секретом у заголовку (`X-Admin-Secret`, `X-Bot-Token`, `?secret=`) — тільки cookie `admin_session`. Секрет у заголовку = секрет, який тече через логи, ретраї та проксі, і який неможливо відкликати окремо від пароля.
- Не виноси адмін-ендпоїнт за префікс `/api/admin/`, `/api/portal/` чи `/api/bot/` — інакше він пройде **повз** адмін-гейт.
- Не пиши моноліти (>200 рядків) — див. правило кристалевості.
- Не хардкодь стилі/кольори — використовуй CSS-токени та `<Icon />`.
- Не клич `alert` / `confirm` / `prompt` — у Telegram Mini App на iOS вони не працюють; тільки `useDialog()` (§4).
- Не стилізуй клас, який рендерить спільний код (`packages/ui`), у `index.css` однієї з оболонок — так він буде стилізований лише там; місце такого CSS — `packages/shared/src/styles/`. Це саме стосується брендових тем: правило в `apple.css`/`android.css` мусить посилатися на кирпичик (`.wb-nav-item`), а не на приватний клас однієї оболонки (`.sidebar-nav-item`) — інакше друга оболонка цього правила не отримає ніколи.
- Не додавай у розмітку клас, для якого немає правила. `class="wb-mt-3"` без `.wb-mt-3` не ламає ні збірку, ні тести — він просто нічого не робить, і помітити це можна лише очима. Перед уживанням перевір: `npm run check:css` (він же в CI).
- Не малюй власний каркас оболонки (меню, шапку, екран входу) — складай його з кирпичиків `app-chrome.css` (§3). Новий приватний клас під те, що вже має кирпичик, — дефект, а не «свій стиль».
- Не лишай `100vh` без `100dvh`-фолбеку: висота екрана пишеться двома лініями (`height: 100vh;` для старих рушіїв, далі `height: 100dvh;`). Голий `100vh` на телефоні «стрибає». Стереже `npm run check:quality`.
- Не додавай у код файли понад 400 рядків, емодзі в UI чи нативні діалоги — це не побажання, а гейт `npm run check:quality` (той самий у CI). Якщо це вже описаний у документації борг, він мусить бути в `scripts/quality-baseline.mjs`, і звідти його можна тільки прибрати.

---

## 8. Статус проєкту

- **Масштаб (виміряно 12.09.2026):** **253 файли `.ts`/`.tsx` у `src/` шести воркспейсів, 29 892 рядки** без тестів (було 327 і 35 198 — видалено 74 недосяжні файли). Разом із тестами — 275 файлів, 31 904 рядки. Найбільші: `api-dev/src/services/sites.service.ts` (777), `packages/shared/src/constants/site-templates.ts` (623), `web-admin-dev/src/pages/scenarios/ScenarioCardModal.tsx` (443), `packages/shared/src/components/icons.tsx` (423). Понад 200 рядків — 41 файл логіки (з 250; ще 3 — дані, ліміт на них не діє), понад 400 — 7 (4 логіки, усі чотири в леджері боргу, і 3 даних).
- **CSS (виміряно 12.09.2026, після «одного дизайну»):** **12 файлів, 6 330 рядків** (було 12 і 7 366). З них `packages/shared/src/styles/` — **4 008** (+`app-chrome.css` 602 — спільні кирпичики каркаса), `web-platform-dev` — **327** (було 1 223), `web-admin-dev` — **1 995** (було 2 473 + `profile.css` 84). **Лішні 1 036 рядків** — приватні копії того самого каркаса в обох оболонках, мертвий CSS платформи й `profile.css`, який стилізував класи спільного `UserProfileCard`.
- **Якість:** аудит за 10 критеріями (ISO/IEC 25010, CISQ, WCAG) — **58%**; оцінку від появи планки не перераховували: планка дає не бали, а неможливість відкотитись назад. Сильне: типи, процес, документація; слабке: тести критичних шляхів, дизайн-система всередині блоків, мобільна доступність (тап-таргети й `@media (hover: none)`). Деталі й ціна кожного кроку — `docs/CODE_QUALITY_AUDIT.md`.
- **Типізація:** 0 `any`, `tsc` чистий на всіх **6 воркспейсах** (4 воркери + `packages/shared` + `packages/ui`).
- **Тести:** Vitest, **182 unit-тести у 22 файлах**. **Гейтять CI** (S-6 закрито 11.09.2026) — червоний тест блокує деплой. Покриті: `security/`, `config/`, `condition-evaluator`, `datetime`, `PageRenderer`, `PermissionGate`, роутинг і identity `api-dev`, `users.service`, `templates.controller`. Не покриті: `sites.service` (777 рядків), жодна сторінка оболонок, жоден екран бота.
- **Форматування:** Prettier у гейті CI (`npx prettier --check .`) — код, який не відповідає стилю, не доїде до деплою.
- **Дизайн-система як кирпичики:** каркас обох оболонок — спільні `.wb-*` (`app-chrome.css`, §3). Перевірка `npm run check:css` (гейт CI) тримає дві межі: клас, який рендерить спільний код, стилізований у shared; клас у розмітці оболонки має правило. Поточно: 189 класів у спільному коді + 289 у оболонках, усі мають правила (415 у 12 CSS-файлах). Відомий борг — `scripts/css-baseline.mjs` (тільки зменшувати).
- **Планка в CI:** `npm run check:quality` (окремий крок у тій же джобі `checks`) тримає
  чотири правила, які доти були лише текстом: файл > 400 рядків — помилка (200 — попередження),
  нативні `alert`/`confirm`/`prompt` заборонені, `100vh` без `100dvh`-фолбеку заборонений,
  емодзі в UI заборонені. Він знайшов і закрив 16 емодзі в кнопках обох оболонок.
  Відомий борг — `scripts/quality-baseline.mjs`: 4 файли > 400 (план §3.2 і §3.5) і 3 файли-дані.
  Деталі й причини кожного правила — `docs/QUALITY_GATE.md`.
- **Ідентичність користувача:** єдине джерело — підписаний Telegram `initData` (`api-dev/src/shared/identity.ts`). Заборонено приймати `X-Telegram-User-Id` або `user_id` з cookie/query.
- **Адмін-авторизація:** єдина — cookie `admin_session` (HMAC-SHA256, `packages/shared/src/security/session.ts`). Секретів у заголовках немає: `X-Admin-Secret`, `X-Bot-Token`, `/db-proxy` і легасі `/setup-webhook` видалено 11.09.2026 (`docs/CONSOLIDATION_LOG.md` §5.4).
- **Моніторинг:** Workers Logs увімкнено в усіх 4 воркерах. `api-dev` має два ендпоїнти здоров'я: `GET /health` (liveness, без залежностей) і `GET /health/deep` (D1 + KV; **503** при деградації) — саме його має опитувати зовнішній монітор. UptimeRobot і секрет `SENTRY_DSN` задає власник акаунта. Усі воркери — дев (`ENVIRONMENT = "dev"`). Sentry під'єднано в `api-dev` і `bot-dev` — персональні дані вирізаються, без секрету `SENTRY_DSN` він у no-op; браузерні застосунки — окремий крок (`docs/CONSOLIDATION_LOG.md` §5.8).
- **Документація:** CHANGELOG немає — історія змін живе в `git log` і в журналі `docs/CONSOLIDATION_LOG.md` (§9 — «Журнал виконаного»). Актуальний стан і план робіт — `docs/CONSOLIDATION_PLAN.md` (§0 — виміри, §3 — план). Станом на 12.09.2026 усі 10 документів звірено з кодом; оцінка якості — `docs/CODE_QUALITY_AUDIT.md`.

---

## 9. Як оновлювати цей файл

Коли з'являється нова конвенція або закривається задача, що впливає на правила — онови відповідний розділ. Не видаляй попередні правила мовчки — познач зміну явно.
