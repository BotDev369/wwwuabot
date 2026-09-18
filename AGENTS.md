# AGENTS.md

> **Версія:** 3.0 | **Оновлено:** 18.09.2026
>
> Інструкція для AI-агентів (Claude, GPT, Buffy тощо). Перед початком роботи прочитай цей файл **повністю**.
>
> **Це опис поточного стану.** Виміряних чисел тут немає: їх друкують самі гейти (`npm run check:css`, `check:docs`, `check:quality`). Число, вписане в документ, через тиждень стає неправдою — і його читають як факт.

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

Зв'язки: `bot` пише в D1 напряму (власний біндинг `DB`). `web` і `web-admin` — **тонкі оболонки**: усі дані йдуть через `api-dev` (service binding), жоден із них не має прямого доступу до D1. Деплой — автоматичний при пуші в `main` (GitHub Actions, path filtering).

**Середовища:** задеплоєні **лише дев-воркери** — `bot-dev`, `api-dev`, `web-platform-dev`, `web-admin-dev` (БД `wwwuabot-db-dev`). **Прода немає і він ніколи не деплоївся.** Слово «прод» у документах означає майбутній деплой, а не поточний стан: коли йдеться про те, що вже працює, правильно казати «дев» або називати воркер.

Код писаний так, щоб прод вмикався **конфігом**, а не правками в логіці: окремі воркери, окрема БД, власний `ENVIRONMENT`. Рішення «це прод?» приймає рівно одна функція — `isProduction()` з `packages/shared/src/config/environment.ts`; у кожному `wrangler.toml` `ENVIRONMENT` мусить збігатися з іменем воркера (`*-dev` → `dev`), і це стереже `wrangler-env.test.ts`.

Чого ще **немає** (не планувати роботу, виходячи з того, що це є): **Cloudflare Access** на адмінці (воркери живуть на `*.workers.dev`, політик Zero Trust немає — захист адмінки тримає лише cookie `admin_session` + адмін-гейт в `api-dev`) і **окремих доменів** (`admin.wwwuabot.com` / `app.wwwuabot.com`). Ліцензія: AGPL-3.0.

## 2. Доменні терміни

- **Scenario** — контентна одиниця: екран бота з кнопками, підписом, фото. Типи: `bot-dev/src/shared/types/scenario.ts`. Поля: `id` (номер рядка), `slug` (адреса), `photo_url`, `caption_top/mid/bot`, `keyboard_type`, `buttons`, `rich_message`/`rich_data`, `page_data`.
- **Стан користувача** — рядок таблиці `users` у D1 (`bot-dev/src/modules/users/user.repository.ts`). Схема «м'яка»: колонки додає `withAutoMigrate` з `@wwwuabot/shared/database/auto-migrate` на першому записі (`is_blocked`, `rate_limit_json`, …), тому фіксованого списку полів немає. Читання БД не пише: зміни позначає прапор `ctx.userDirty`, а запис робить post-middleware (`bot-dev/src/core/middleware/post/index.ts`), який викликає `botRouter` з `src/core/router/bot-router.ts`.
- **Ім'я на платформі** (`users.platform_username`) — **не** Telegram `username`: це ім'я, яке користувач обирає собі сам на wwwuabot, і саме воно є його іменем у продукті (`packages/shared/src/user/platform-username.ts` — єдині правила для TWA, адмінки й бота). Telegram `username` лишається даними Telegram; `telegram_json` — усе, що Telegram віддав про людину, як є. Плутати їх не можна: друге ми не обираємо і воно може зникнути.
- **Page Builder** — блочна система сторінок. Сторінка = рядок `scenarios` (колонка `page_data`). 4 зони: sidebar, header, main, footer. Блоки рекурсивні, автономні. Типи: `packages/shared/src/types/page-config.ts`. Реєстр: `packages/shared/src/constants/block-definitions/`. React-компоненти: `packages/ui/src/blocks/`.
- **Conditional Rendering** — умовний показ блоків за role/tariff/status/permissions користувача (`packages/shared/src/utils/condition-evaluator.ts`).
- **Design System** — подвійна тема Apple/Material через `data-brand` на `<html>` і **три кольори користувача** (фон / основний / акцент) через `data-colors` + `data-colors-mode`. CSS-токени: `packages/shared/src/styles/`; палітру з трьох кольорів виводить `user-colors.css`, а сам вибір живе в `localStorage` (ключ `wwwuabot-colors`). Світлої / темної як вибору немає — схему рахує фон.
- **Notes / Contacts** — два екрани-колекції платформи (`/notes`, `/contacts`), що живуть на **тих самих** спільних кирпичиках (`@wwwuabot/ui/collection`): смуга керування, чипи, вигляд (рядки / картки 1 / картки 2), акордеон у списку.

---

## 3. Архітектурні правила

### Спільний код (правило «двічі — в спільне»)

> Код, що повторюється 2+ рази, йде в `packages/shared/` або `packages/ui/`. Не внось у shared серверну логіку воркера (роутинг, мідлвари) і конфігурацію `wrangler.toml`.

### Єдиний API-шлюз

> Всі зовнішні REST-ендпоїнти — в `api-dev/`. Не створюй нові API в `bot-dev/`, `web-platform-dev/`, `web-admin-dev/`. Винятки: webhook'и в `bot-dev/`, тимчасові admin-ендпоїнти в `web-admin-dev/`.

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

**Ключове:** перевірка — спільна; реакція на провал — своя (TWA показує «відкрийте в Telegram», адмінка — `LoginScreen`). Причина: це різні обов'язки, і злите рішення тягне в shared роутинг, `worker.ts` і `wrangler.toml`.

### Єдиний дизайн і мобільний пріоритет

> `web-platform-dev` і `web-admin-dev` — дві оболонки **одного** продукту. Візуально вони мусять бути не «схожими», а **однаковими**: різниця лише в логіці (які роути, які дані, яка авторизація), не у вигляді. Будь-яка нова візуальна деталь проєктується спільною і живе в `packages/shared/src/styles/` або `packages/ui` — не в `index.css` однієї з оболонок.

- **Мобільний — пріоритет №1.** Єдина точка взаємодії користувачів — Telegram Mini App, а це переважно телефони. Мобільний вигляд перевіряється першим, десктоп — після нього.
- Верстка **резинова**: `flex`/`grid` + `clamp()`/`min()`, без фіксованих ширин розкладки. Пікселі — тільки для дрібних елементів, де вони справді мусять бути фіксованими.
- Висота екрана — `100dvh` (з `100vh` як фолбеком), не голий `100vh`: на мобільному адресний рядок ховається і висота «стрибає».
- Краї екрана — `var(--safe-top)` / `var(--safe-bottom)`: вони враховують і `env(safe-area-inset-*)`, і `--tg-safe-area-inset-*` від Telegram. Для цього в `index.html` обовʼязковий `viewport-fit=cover`.
- Мобільна навігація — виїзний drawer (`--drawer-w`, `--scrim`, `--duration-slow`, `--ease`): той самий патерн в обох оболонках, різні лише пункти меню.
- **`@media (hover: none)`.** Усе, що показується на `:hover`, на тачі не покажеться ніколи — дії, приховані до hover, мусять бути видимі постійно (кнопки ↑ ↓ ✕ у редакторі блоків).
- **Нативний хром Telegram — у кольорах теми.** Кольори — теж токени (`--chrome-header-bg` / `--chrome-bottom-bg`, плоскі hex — градієнти Telegram відхиляє), шле їх клієнту **один** модуль — `shared/app/telegram-chrome.ts` (`setHeaderColor` / `setBackgroundColor` / `setBottomBarColor`), викликається з `initTheme()` і сам стежить за зміною `data-brand`/`data-theme` і `themeChanged`. Не кликай їх з компонентів і не заводь другої таблиці «бренд × схема → колір» у TS — джерело значень у CSS-токенах. Бренд лишає на хромі тільки своє (у Apple — скло).
- **Екран — ОДИН плоский фон.** `--bg-page` (= `--chrome-header-bg`) малює `body`, `.wb-app`, `main`, зони `.page-zone*`, `.wb-splash`, `.wb-auth`; градієнт `--bg-home` — тло **поверхонь** (карток), не екрана, бо плоский колір клієнта ніколи не дорівняє градієнту й шов лишався б назавжди. У смуг хрому (`.wb-app-header`, `.wb-topbar`, `.wb-tabbar`) **немає ліній і тіней** (контур малює шов навіть при однаковому кольорі) і вони **прозорі на 9%**: `color-mix(in srgb, var(--chrome-*) 91%, transparent)` — прозорість нічого не затемнює, бо смуга лежить поверх тла того самого кольору.

### Кирпичики: оболонка складається, а не малюється

> Каркас оболонки описаний один раз — `packages/shared/src/styles/app-chrome.css`. Оболонка **складає** його з `.wb-*`-кирпичиків і додає лише своє: роути, дані, права, склад меню. Перелік нижче — це групи, а не реєстр: точний склад класів дають сам CSS і `npm run check:css`.

| Група | Кирпичики |
|---|---|
| Каркас | `.wb-app`, `.wb-app-main`, `.wb-app-body` (+ `--tabbar`), `.wb-app-header`, `.wb-app-title`, `.wb-app-hamburger`, `.wb-app-logout` |
| Меню | `.wb-nav` (+ `--collapsed`), `.wb-nav-header/-logo/-title/-toggle`, `.wb-nav-menu`, `.wb-nav-section(-title)`, `.wb-nav-item` (+ `--active`), `.wb-nav-icon`, `.wb-nav-label`, `.wb-nav-footer` |
| Футер | `.wb-tabbar-layout`, `.wb-tabbar`, `.wb-tabbar-inner`, `.wb-tabbar-item` (+ `--primary`, `--active`), `.wb-tabbar-icon` («комірка» всіх іконок), `.wb-tabbar-label` |
| Шапка | `.wb-topbar`, `.wb-topbar-left/-title/-right` |
| Сторінка | `.wb-page`, `.wb-page-head`, `.wb-page-title`, `.wb-page-actions`, `.wb-page-add` (коло з «+» у шапці списку: 36px, `--radius-full`, `padding: 0`, акцентне тло — головна дія, коли підпису немає), `.wb-page-sticky` (шапка, смуга й числа їдуть разом і лишаються на видноті), `.wb-page-scroll` (сторінка, що скролиться сама — каркас панелі тримає `overflow: hidden`) |
| Кнопки дій | `.wb-btn` (+ `-primary`/`-secondary`/`-danger`/`-sm`), `.wb-close-btn`, `.wb-move-btn`, `.wb-chip` (+ `--sm`); іконка всередині — зі shared, розмір задає CSS кирпичика. **Мірки** кнопки — токени `--btn-pad-y`/`--btn-pad-x`: `padding` пише лише базове правило, а бренд задає самі токени (Apple — просторіша, Android — щільніша), тому «зменшити кнопки» діє в обох оболонках і не глушиться `!important`; стелі тримає `packages/shared/src/styles/buttons.test.ts` |
| Поля вводу | `.wb-input`, `.wb-select`, `.wb-textarea` + власні поля композера (`.wb-composer-input/-tags`) — **одне правило поверхні** на всі: колір `--field-bg` і м'яка тінь `--field-ring` (схема — `themes.css`). Межу поля малює колір, а не лінія: бренди не нав'язують `!important`-рамку, а додають лише радіус і мірки. Шрифт — **не менше 16px** (`max(16px, 1em)`), і оголошує його **сам контрол у своєму правилі**, а не спільний список: інакше пізніше правило поля тихо перекриває межу, і iOS починає збільшувати сторінку на фокусі. Стежить `fields.test.ts` |
| Екрани | `.wb-splash`, `.wb-auth*` (картка, поле, помилка, кнопка) |
| Профіль | `.wb-profile*`, `.wb-profile-lookup`, `.wb-handle*` (рендерить спільний `UserProfileCard`; рядок «підпис → значення» — `UserProfileField` зі shared) |
| Колекція (спільна) | Смуга керування й вигляд: `.wb-tools`, `.wb-tools-bar`, `.wb-tools-search` (+ `-icon`, `-clear`, `--open`), `.wb-tools-controls`, `.wb-tools-btn` (+ `--on`, `--toggle`), `.wb-tools-chips`, `.wb-tools-chip-label`, `.wb-tools-summary`, `.wb-collection` (+ `--rows`/`--cards`/`--cols-1`/`--cols-2`), `.wb-collection-tool` — рендерить `@wwwuabot/ui/collection` (`CollectionToolbar`, `CollectionViewSwitch`); користувачі — нотатки й контакти |
| Нотатки | `.wb-note-list`, `.wb-note-item` (+ `--open`), `.wb-note-card` (+ `-line`/`-text`/`-stamp`/`-caret`/`-tags`/`-body`), `.wb-note-text`/`-dates`, `.wb-note-group` (+ `-title`/`-count`), `.wb-note-tag` (+ `--hit`) — рендерить `@wwwuabot/ui/notes` (акордеон, закритий типово; правила вигляду — чисті функції `view.ts`) |
| Контакти | `.wb-contact-list/-group(-title/-count)/-item(--open)/-card/-head/-number/-name/-stamp/-caret/-state/-who/-line/-tags/-tag(--hit)/-twin/-body/-stages/-stage(--done)/-stage-label/-stage-value/-stage-note/-joined/-nested/-link(-row)/-dates/-note-text/-open/-sheet`, підсумок — `.wb-contact-stats/-stat/-stat-label/-stat-value/-stat-word` (знак + цифра акцентом) — рендерить `@wwwuabot/ui/contacts`, кирпичики — у власному `contacts.css` |
| Меню | `.wb-sheet`, `.wb-sheet-head` (спільна повноекранна поверхня — композер і меню), `.wb-menu-body/-list`, `.wb-menu-item` (+ `--soon`), `.wb-menu-item-icon/-text/-label/-hint/-check`, `.wb-menu-hint`, `.wb-menu-ident*` (рендерить спільний `MenuModal`; відкриває «Профіль» футера через `withAction`; склад пунктів — `profile-menu.ts` оболонки; панель теми приходить сюди через `content`, а не списком) |
| Композер | `.wb-composer*` (+ `.wb-composer-field/-input/-tags/-tag*` — поля власні, бо бренд-теми нав'язують рамку `.wb-input`/`.wb-textarea` через `!important`; підпис над кожним полем, хештеги — чипи й поле в одному рядку, правило `#` — у `@wwwuabot/shared/notes`, бо воно потрібне і серверу), `.wb-modal--full`, `.wb-modal-overlay--tight` (рендерить спільний `ComposerModal`; відкриває «+» футера через `withPrimaryAction`, і він же **редагує** нотатку, коли оболонка дала `initial` із `id`; мірки `--composer-cell/-gap/-pad` спільні для стовпчика вкладок і смуги вкладень, ліній усередині немає) |

Правило: **однакова деталь у двох оболонках — це кирпичик, а не «стиль оболонки»**. Новий приватний клас під те, що вже має кирпичик, — дефект.

**Глобальний нижній футер** — теж кирпичик: смуга, «комірка» іконки й підсвічення активного розділу спільні; оболонка додає лише склад пунктів (і solid-пару іконок до них). Смуга **фіксована**, тож під нею мусить бути місце (`.wb-tabbar-layout`, `.wb-app-body--tabbar`) — інакше останній рядок лишається під нею. Футер — хром і в шарах: він вищий за модалки й виїзне меню (`--z-tabbar` = 1100), а кожна модалка лишає під ним місце (`html:has(.wb-tabbar) .wb-modal-overlay`). Слотів, які **відкривають поверхню**, а не ведуть на адресу, у футері два: центральний «+» (композер) і «Профіль» (меню, `withAction`). «Профіль» — це меню розділів, а не екран: склад пунктів — `web-platform-dev/src/layout/profile-menu.ts`, `onSelect` має пріоритет над `href`, тому в розмітці такого пункту ссилки немає. На `/profile` веде картка «хто ти» в самому меню, тож жоден пункт футера не веде на цей екран, і підсвічення «Профіль» рахується від відкритої поверхні, а не від адреси.

Перевірка межі автоматична — `npm run check:css` (той самий гейт у CI): (1) клас, який рендерить спільний код (`packages/ui`, `packages/shared`), мусить мати правило в `packages/shared/src/styles/`; (2) клас у розмітці оболонки мусить мати правило в shared або у власному CSS цієї оболонки (клас із CSS сусідньої оболонки не працює). Відомий борг живе в `scripts/css-baseline.mjs` і тільки зменшується.

### Кристалева ясність (Crystal Clarity Rule)

> **АБСОЛЮТНЕ ПРАВИЛО: ніколи не пиши «простині» (моноліти).** Файл > 200 рядків — червоний прапорець, > 400 — критично: зупинись і рефактори негайно.

- **Компонент** = тільки рендеринг. Логіка = в хуках (`use*.ts`).
- **Хук** = тільки стан та бізнес-логіка. Жодного JSX.
- **Хелпери/константи** = тільки чисті функції та дані. Жодного стану.

```
MyFeaturePage.tsx      (80)  — рендеринг
useMyFeature.ts        (120) — хук
MyFeatureTable.tsx     (80)  — підкомпонент
helpers.ts, types.ts   (40, 20) — чисті функції та типи
```

### Блок-дефінції: компактний запис

> Не пиши JSON-схеми. Використовуй хелпери з `packages/shared/src/constants/block-definitions/helpers.ts`:

```typescript
// Так — 7 рядків замість 30:
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

Причина останнього не стилістична: у Telegram Mini App на iOS WebView не має в'юхи для нативних діалогів — `prompt` повертає `null`, `confirm` — `false`, `alert` не показується взагалі. Спільний діалог малюється тими самими `.wb-modal-*`, тож вигляд однаковий в обох оболонках, і він єдиний для обох — окремих діалогів у застосунках немає.

```tsx
import { useDialog } from "@wwwuabot/ui/dialog";

const dialog = useDialog();
await dialog.alert("Щось зламалось", { tone: "danger" });
if (!(await dialog.confirm("Видалити?", { tone: "danger", confirmText: "Видалити" }))) return;
const name = await dialog.prompt("Назва:", { validate: (v) => (v.trim() ? null : "Порожньо") });
```

`DialogProvider` стоїть біля кореня `main.tsx` в обох оболонках — там же, де `initTheme()`. Іконки — `<Icon name="home" size={16} />` з `@wwwuabot/shared`; окремого списку іконок у документації немає навмисно (він дрейфує), єдине джерело — тип `IconName` у `packages/shared/src/components/icons.tsx`. Токени й нумеровані правила вигляду — `docs/DESIGN_SYSTEM.md` (номери правил стабільні: на них посилається код).

---

## 5. Де що шукати

### Дані

| Що | Де |
|---|---|
| Схема таблиць D1 — реєстр: ім'я, власник, призначення, DDL | `packages/shared/src/database/tables.ts` — **дані**; створення — `ensure-tables.ts` |
| Карта таблиць: хто власник, хто створює, хто читає; як виконати SQL на дев-базі | `docs/DATA_MODEL.md` |
| Контент сторінки: одна модель, адреса, діплінк | `packages/shared/src/content/` — `ContentPage`, `pickContentPage`, `toWebPath` / `toBotPayload` / `buildShareLinks`; правила — `docs/CONTENT_MODEL.md` |
| Адреса сторінки: одна сутність `slug`, два подання (веб / бот) | `packages/shared/src/content/resolve.ts` (`toWebPath`, `toBotPayload`, `isValidSlug`) |
| Авто-добір колонок (`withAutoMigrate`); перебудова таблиці — те, чого `ensureTables` не вміє | `packages/shared/src/database/auto-migrate.ts`; `scripts/migrations/*.sql` (2 кроки: копія + заміна з бекофісною) |

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

Обидва модулі в `security/` — **чисті функції**: секрет передається аргументом, рішення «що робити при провалі» приймає виклик. Не дублюй HMAC-логіку в воркерах.

**Три групи доступу — третя не має винятків:**

| Група | Префікс | Авторизація |
|---|---|---|
| Публічне | `/api/scenario/`, `/api/mydate/`, `/health` | немає |
| Користувач | `/api/my-dates`, `/api/user/profile` | підписаний `initData` + перевірка власника |
| Адмін | `/api/admin/`, `/api/portal/`, `/api/bot/` | cookie `admin_session` |

Адмін-авторизація існує в **двох місцях навмисно**: `web-admin-dev/src/worker.ts` (до проксі) і адмін-гейт в `api-dev/src/router.ts` (після). У `api-dev` є власний публічний URL, тому він не має покладатися на те, що перед ним стояв проксі. Два рівні однієї перевірки — це не дублювання, а недовіра до периметра.

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

Каркас (`AppShell`, меню, шапка, екран входу) — **спільні кирпичики** (`packages/shared/src/styles/app-chrome.css`, §3). Оболонка лише складає їх і додає своє: у адмінці — `layout/AppShell.tsx` + `layout/Sidebar/*` (`adminNav.store` — склад і порядок пунктів меню), у платформи — `app/AuthGate.tsx` (замість власного меню — зони спільного `PageRenderer`).

Відмінності в логіці: `web` — auth через TWA SDK (підписаний `initData`), API через service binding. **Власного `src/stores/` у платформи немає**: стан живе в хуках сторінок і фіч (`pages/ScenarioPage.tsx`), а спільний Zustand-стор — у `@wwwuabot/shared` (`useAppStore`), якщо він колись знадобиться. `web-admin` — auth через cookie + HMAC; прикладні стори живуть у своїх фічах (`features/scenarios/store`, `features/users/store`), а навігація — в `layout/Sidebar/adminNav.store.ts`.

---

## 6. Конвенції коду

- **TypeScript strict**, 0 `any` — ESLint `no-explicit-any` = **`error`** в усіх конфігах. **ESLint + Prettier** у всіх 4 сервісах: `npm run lint`, `npm run typecheck`, `npm run format:check`.
- **Логування:** `bot-dev/` — модуль `modules/logging/` (Queue); `api-dev/` — `apiLog` з префіксом `[api]`. Не використовувати `console.log` у продакшн-коді.
- **Дата/час у D1:** `formatSqliteDatetime()` з `packages/shared/src/utils/datetime.ts`.
- **CI/CD:** GitHub Actions + path filtering. Перед деплоєм в одній джобі `checks` виконуються `npm ci`, `npm audit --audit-level=high`, `npm run lint`, `npm run typecheck`, `npm run format:check`, `npm run check:css`, `npm run check:quality`, `npm run check:docs`, `npm run check:db`, `npm test` — будь-який збій блокує деплой усіх воркерів. Деплої воркерів стоять у черзі (`concurrency`), щоб старіший коміт не ліг поверх новішого. `pull_request` запускає лише гейти — деплой з PR неможливий. `GITHUB_TOKEN` має `contents: read`. Dependabot увімкнений.

---

## 7. Чого НЕ робити

- Не пиши власну авто-міграцію D1 — використовуй `withAutoMigrate` з shared.
- Не дублюй код між воркерами — клади в `packages/shared/`.
- Не створюй таблицю D1 повз реєстр `packages/shared/src/database/tables.ts` і не пиши свій `CREATE TABLE`. Нова таблиця = оголошення в реєстрі + `ensureTables(db, ["ім'я"])` у воркері-власнику. Стереже `npm run check:db`.
- Не додавай колонку, реагуючи на помилку SQLite (`no such column` → `ALTER TABLE`). Так схема таблиці починає залежати від того, що надіслав клієнт. Колонка додається рядком у реєстрі.
- Не створюй **другу таблицю під той самий контент**. Контент сторінки живе в одному рядку `scenarios`: `page_data` — сторінка вебу, `caption_*`/`buttons`/`rich_*` — подання в боті. Нова ознака контенту = колонка в `scenarios`, а не таблиця поруч; інакше з'явиться друге сховище одного `PageConfig` і друга реалізація правила «яка сторінка для цього URL».
- Перенос даних між таблицями — окремим SQL, який **тільки додає** (`INSERT`, ніколи `DELETE`/`DROP`/`UPDATE`), ідемпотентний і **називає у звіті** все, що пропустив: вибрати за власника «правильний» рядок — це тихо втратити чужий контент.
- Не покладайся на унікальність **імені індексу**: у SQLite імена індексів глобальні для бази, тому `CREATE UNIQUE INDEX IF NOT EXISTS` з тим самим ім'ям на другій таблиці — не помилка, а **порожня дія**, і таблиця лишається без унікальності. Стереже `tables.test.ts`.
- SQL у коді пиши **великими літерами** (`SELECT … FROM users`), інакше `check:db` не відрізнить таблицю від `from "react"`.
- Не роби `SELECT *` на таблицях з важкими JSON-колонками (`users`). Не забувай `[[d1_databases]]` на top-level `wrangler.toml`. Не змішуй prod/dev бази — різні `database_id`.
- Не створюй API-ендпоїнти поза `api-dev/`.
- Не довіряй `X-Telegram-User-Id`, cookie `user_id` чи `?user_id=` — ідентичність береться ТІЛЬКИ з підписаного `initData` (`api-dev/src/shared/identity.ts`).
- Не авторизуй адмін-дію секретом у заголовку (`X-Admin-Secret`, `X-Bot-Token`, `?secret=`) — тільки cookie `admin_session`. Секрет у заголовку тече через логи, ретраї та проксі, і його неможливо відкликати окремо від пароля.
- Не виноси адмін-ендпоїнт за префікс `/api/admin/`, `/api/portal/` чи `/api/bot/` — інакше він пройде **повз** адмін-гейт.
- Не пиши моноліти (>200 рядків) — див. правило кристалевості. Не хардкодь стилі/кольори — використовуй CSS-токени та `<Icon />`.
- Не клич `alert` / `confirm` / `prompt` — у Telegram Mini App на iOS вони не працюють; тільки `useDialog()` (§4).
- Не стилізуй клас, який рендерить спільний код (`packages/ui`), у `index.css` однієї з оболонок — місце такого CSS `packages/shared/src/styles/`. Це саме стосується брендових тем: правило в `apple.css`/`android.css` мусить посилатися на кирпичик (`.wb-nav-item`), а не на приватний клас однієї оболонки (`.sidebar-nav-item`) — інакше друга оболонка цього правила не отримає ніколи.
- Не додавай у розмітку клас, для якого немає правила. `class="wb-mt-3"` без `.wb-mt-3` не ламає ні збірку, ні тести — він просто нічого не робить. Перевір: `npm run check:css` (він же в CI).
- Не малюй власний каркас оболонки (меню, шапку, екран входу) — складай його з кирпичиків `app-chrome.css` (§3). Новий приватний клас під те, що вже має кирпичик, — дефект.
- Не лишай `100vh` без `100dvh`-фолбеку: висота екрана пишеться двома лініями (`height: 100vh;` для старих рушіїв, далі `height: 100dvh;`). Стереже `npm run check:quality`.
- Не додавай у код файли понад 400 рядків, емодзі в UI чи нативні діалоги — це не побажання, а гейт `npm run check:quality`. Якщо це вже описаний у документації борг, він мусить бути в `scripts/quality-baseline.mjs`, і звідти його можна тільки прибрати.
- Не роздувай документ: `.md` понад 200 рядків — червоний прапорець, понад 400 — помилка. Довгий документ **неможливо правити**: щоб змінити абзац, треба вгадати якір байт-у-байт, і невдача приходить мовчки. Діли на теми, покажчик — `docs/README.md`. Стереже `check:docs`.
- Не лишай мертве посилання чи мертвий шлях: посилання, згадка файлу в тексті й `AGENTS.md §N` мусять вести в те, що існує. Стереже `npm run check:docs`.
- Не тримай той самий факт у двох документах — **факт має одного власника**, решта посилається. Числа не вписуй: їх друкують гейти.
- Не парси `page_data` власним кодом і не пиши четверту копію правила «яка сторінка відповідає цьому URL» — бери `@wwwuabot/shared/content`. Фільтр видимості лишається у сховища (SQL або список у пам'яті): у редакторі чернетка мусить бути видимою, назовні — ні.
- Не тримай адресу сторінки в двох колонках (`codeword` і `slug`) і не пиши другу функцію «зробити з адреси посилання»: сутність одна — `slug`, подання будує `toWebPath` / `toBotPayload`. Готове посилання для «Поділитись» збирає `buildShareLinks()` (`shared/content/link.ts`) — не клей його в інтерфейсі й не вважай, що воно завжди є: функція повертає **причину** (`invalid_slug`, `no_bot_username`, `too_long`). Алфавіт `?start=` задає Telegram (`A-Za-z0-9_-`, ≤ 64 символи), тому **сегмент адреси не може містити `_`** — це перевіряє `isValidSlug`, а довжину — `isDeepLinkable` (на побудові, а не на переході: обрізаний параметр веде в нікуди, і дізнатись про це нічим).
- Не перевіряй право власника за одним сегментом URL. Якщо в шляху два незалежні ідентифікатори (`/api/x/:slug/y/:pid`), перевірка «контейнер мій» **не** захищає вкладений об'єкт: чужий `pid` під власним `slug` проходить її й пише в чужий об'єкт. Перевіряй зв'язок і роби це **до** будь-яких підказок про існування об'єкта — код відповіді (`400` проти `404`) теж витік.

---

## 8. Статус проєкту

- **Числа.** Жодного виміряного числа в документах: файли, рядки, тести й класи друкують самі гейти (`npm run check:css`, `check:docs`, `check:quality`, `npm test`). Число в документі старіє швидше, ніж його встигають перечитати.
- **Структурно:** шість воркспейсів; контент описано моделлю `packages/shared/src/content/` над однією таблицею `scenarios` (домену «сайтів» не існує). **Типізація:** 0 `any`, `tsc` чистий на всіх 6 воркспейсах.
- **Тести:** Vitest, гейтять CI (червоний тест блокує деплой). Покриті: `security/`, `config/`, утиліти, `PageRenderer`, роутинг і identity `api-dev`, `users.service`, реєстр таблиць D1, модель контенту й адреса (`content/`), хром Telegram (`app/telegram-chrome`), контролери `api-dev`, спільні кирпичики колекцій (`collection/`, `notes/`, `contacts/`). Не покриті: сторінки оболонок, екрани бота.
- **Дизайн-система як кирпичики:** каркас обох оболонок — спільні `.wb-*` (`app-chrome.css`, §3). `npm run check:css` тримає дві межі (див. §3). Відомий борг — `scripts/css-baseline.mjs` (тільки зменшувати).
- **Планка в CI:** `npm run check:quality` тримає чотири правила: ліміт рядків на файл, заборонені нативні діалоги, голий `100vh` і емодзі в UI. Деталі — `docs/QUALITY_GATE.md`; борг — `scripts/quality-baseline.mjs`.
- **Профіль:** **один** екран на обидві оболонки — `UserProfileCard` з `@wwwuabot/shared` (`/profile` у платформі й у панелі). Платформа бере дані з підписаного `initData` (тому показує **все**, що віддав Telegram) і дає змінити своє ім'я на платформі; панель показує той самий екран для вибраної людини. Свого профілю в панелі **не існує**: вхід там за паролем, а `admin = 1` немає в жодного рядка `users` — тож замість вигаданого «власника» вона показує акаунт сесії. Правило «рядок `users` → профіль» живе в одному місці (`web-admin-dev/src/shared/api/user-profile-row.ts`).
- **Ідентичність користувача:** єдине джерело — підписаний Telegram `initData` (`api-dev/src/shared/identity.ts`). **Адмін-авторизація:** єдина — cookie `admin_session` (HMAC-SHA256, `packages/shared/src/security/session.ts`); секретів у заголовках немає, `X-Admin-Secret`, `X-Bot-Token`, `/db-proxy` і легасі `/setup-webhook` не існують.
- **Схема D1:** усі таблиці — в одному реєстрі (`packages/shared/src/database/tables.ts`: дані; створення — `ensure-tables.ts`); поза реєстром таблиць немає (`npm run check:db` ловить `CREATE TABLE`, ім'я таблиці й `ALTER TABLE`, яких немає в оголошенні). Контент живе в одній таблиці `scenarios`: `id` — номер рядка (`PRIMARY KEY`), `slug` — адреса (`NOT NULL UNIQUE`), тому адресу можна редагувати, не втрачаючи ідентичність. **Нотатки й контакти — окремі таблиці (`notes`, `contacts`), а не `scenarios`:** там рядка без адреси не існує й це *опублікований* контент, а нотатка й контакт — дані власника (`scope`/`owner_id`). Карта, колонки й легасі-хвіст дев-бази — `docs/DATA_MODEL.md`.
- **Моніторинг:** Workers Logs увімкнено в усіх 4 воркерах. `api-dev` має два ендпоїнти здоров'я: `GET /health` (liveness, без залежностей) і `GET /health/deep` (D1 + KV; **503** при деградації) — саме його має опитувати зовнішній монітор. UptimeRobot і секрет `SENTRY_DSN` задає власник акаунта. Sentry під'єднано в `api-dev` і `bot-dev` — персональні дані вирізаються, без секрету він у no-op; браузерні застосунки — окремий крок. Деталі — `docs/MONITORING.md`.
- **Документація:** покажчик — `docs/README.md` (**один документ = одна тема = один власник**; там же таблиця «куди писати нове»). Розмір, мертві посилання, згадані шляхи й живість `AGENTS.md §N` з коду стереже `npm run check:docs`. **Два документи довші за 200 рядків, і обидва навмисне не діляться:** `AGENTS.md` — бо його читають повністю одним файлом; `docs/DESIGN_SYSTEM.md` — бо це один нумерований список правил, на номери якого посилається код. Решта — не більше 200 рядків.

**Відкрита робота** (тільки те, що справді попереду; закрите в документах не тримаємо):

| Що | Де живий слід |
|---|---|
| Мертвий CSS оболонок і перейменування `.usr-*` / `.scn-*` → `.wb-*` | `scripts/css-baseline.mjs` (тільки зменшувати) |
| Бюджет бандла (вага чанків оболонок) і поріг покриття нових модулів | `docs/QUALITY_GATE.md`, «чого тут немає» |
| Мобільний борг: `@media (hover: none)`, тап-таргети ≥44px | правила §3, борг — у коді |
| `SELECT *` на `users`, `npm audit` до 0 high | `npm run lint`, `check:quality` |
| Cloudflare Access на адмінці, окремі домени, прод | §1, «чого ще немає» |

---

## 9. Як оновлювати цей файл

- **Правила — тут, факти — у своєму документі.** Нова конвенція або заборона → відповідний § цього файлу. Тема, яка заслуговує окремого документа → новий маленький `.md` + рядок у покажчику `docs/README.md`.
- **Правило замінюється, а не обростає.** Якщо конвенція змінилась — перепиши абзац; старий текст лишається в `git log`, а тримати його поруч означає мати дві правди. Числа не вписуй — вони в гейтах і в `npm`-командах.
- **Причину пиши в самому правилі** — одним реченням («причина: …»). Правило без причини через місяць «оптимізують».
- **Розмір:** цей файл читається повністю одним файлом, тому він і є виняток із правила 200 рядків; решта документів — не більше 200 рядків (понад 400 — помилка `check:docs`).
