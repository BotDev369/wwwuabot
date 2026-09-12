<!-- журнал 12.09: «один дизайн» — каркас оболонок -->
> **Частина архіву консолідації.** Покажчик розділів — [`docs/CONSOLIDATION_LOG.md`](../CONSOLIDATION_LOG.md).
> Числа тут — на дату свого запису, не «останні».

### 12.09.2026 — «один дизайн»: каркас оболонок складено зі спільних кирпичиків

**Стартова точка була гіршою, ніж здавалося.** Перевірка множин класів показала: у
`web-platform-dev/src/index.css` і `web-admin-dev/src/index.css` **немає жодного спільного
за назвою класу** (перетин множин порожній). Кожен описував ті самі елементи своїми
іменами, і «однаковий вигляд» тримався на ручному копіюванні:

| Елемент | web-platform-dev | web-admin-dev |
|---|---|---|
| Екран входу | Tailwind-утиліти в `AuthGate` | `.login-*` — 13 класів, 119 рядків |
| Перший кадр | — | `.splash` + `@keyframes pulse` |
| Меню | `page-zone--sidebar` (разом із `PageRenderer`) | `.sidebar` + 15 класів `.sidebar-*` + `.sidebar--collapsed` |
| Шапка | — | `.main-header`, `.topbar`, `.page-topbar` |
| Профіль | `.card`, `.profile-*`, `.hero`, `.page-header` | ті самі — у `profile.css` (84) |

Останній рядок — прямий дефект: розмітку `.card` / `.profile-field*` рендерить **спільний**
`UserProfileCard` із `packages/shared`, а стилі для нього лежали в кожній оболонці окремо.

**Друга знахідка — бренди били повз платформу.** `apple.css` і `android.css` майже весь
вигляд меню й шапки описували через `html[data-brand="apple"] .sidebar-nav-item`,
`.logout-btn`, `.topbar`, `.login-*` — тобто через **приватні класи адмінки** й `!important`.
У платформі таких класів немає, тож «єдина тема» для неї не існувала: ті самі перемикачі
`data-brand`, різний результат.

**Що зроблено.**

| Крок | Результат |
|---|---|
| Новий шар `packages/shared/src/styles/app-chrome.css` (602) | кирпичики `.wb-app*`, `.wb-nav*`, `.wb-topbar*`, `.wb-page*`, `.wb-splash`, `.wb-auth*`, `.wb-profile*` |
| `AppShell`, `Sidebar`, `SidebarNav`, `PageTopbar`, `LoginScreen`, `AuthGate` (адмінка) | складаються з кирпичиків; інлайн-`<svg>` виходу і тумблера → `<Icon />` |
| `AuthGate`, `MySitesPage`, `PublicCatalogPage`, `TemplatePicker` (платформа) | те саме; Tailwind-утиліти зі стилями пішли геть |
| `UserProfileCard`, `SaveActionButtons`, `ThemeButton` (спільний код) | `card`/`profile-*` → `.wb-profile*`; `.usr-edit-success` і 30 рядків інлайн-стилів прибрано |
| `apple.css` (141) і `android.css` (128) | бренд стилізує кирпичики й `.page-zone--sidebar`, а не приватні класи адмінки |
| `web-admin-dev/src/index.css` | 2 473 + 84 → 1 995: каркас, `page-topbar`, мертвий `.codeword-*` прибрано; `profile.css` видалено |
| `web-platform-dev/src/index.css` | 1 223 → 327: лишились `main`/`footer` і `site-editor-*`, мертвий острів `mydate`-класів прибрано |

**Гейт замість добрих намірів.** Причина широка: `packages/shared/styles/` існує давно,
але ніщо не заважало оболонці завести свій клас — тому завели обидві. Тепер
`npm run check:css` (`scripts/check-css-classes.mjs`, той самий крок у CI) перевіряє дві
межі: клас, який рендерить спільний код, стилізований у shared; клас у розмітці оболонки
має правило. Відомий борг — `scripts/css-baseline.mjs` (91 клас `wb-block-*`, тобто §3
пункт 3), і він тільки зменшується. Інструмент написаний так, щоб не шуміти: розуміє
`@media`-вкладеність, склеєні імена (`tg-heading--h${level}`) і не вважає класом значення
з тернарників (`tone === "danger"`).

**Сім реальних дефектів, які він знайшов одразу:**

| Дефект | Наслідок для користувача |
|---|---|
| `.sidebar-theme-btn` (у спільному `ThemeButton`) | кнопка теми в згорнутому меню без жодного правила |
| `.site-preview` (`SiteEditorPanel`) | прев'ю сайту без рамки й прокрутки |
| `.wb-input-error` (`SiteNewPage`) | некоректний slug не підсвічувався |
| `.site-nav-label` (`SiteRenderer`) | довгий підпис ламав висоту смуги навігації |
| `.page-zone-label` (`PageRenderer`) | діагностичні мітки зон виглядали як звичайний текст |
| `.pb-be-props`, `.pb-sidebar-settings` | тримались на інлайн-стилях, тому не бачили токенів теми |
| `.usr-th-status`, `.usr-card-th-*` | заголовок першої колонки відклеювався при скролі |

Ще три класи виявились зайвими в розмітці спільного коду (`.page-sidebar-overlay`,
`.page-zone--sidebar--open`, `.usr-edit-success`) — прибрані, а два `!important`-хуки
адмінки (`phone-frame`) переведені на спільний `.app-drawer-overlay`.

**Перевірка:** `npm run typecheck` — чисто на 6 воркспейсах ✅ · `npm run lint` — 0/0 ✅ ·
`npm test` — 182/182 ✅ · `npx prettier --check .` — чисто ✅ · `npm run check:css` — 0 помилок ✅ ·
збірки `web-platform-dev` (CSS 100.71 kB) і `web-admin-dev` (CSS 123.91 kB) ✅

**Підсумок:** `348 insertions(+), 1 936 deletions(-)` у 34 файлах; CSS 7 366 → **6 330**
(−1 036). Головне не рядки: тепер прибрати кнопку можна в одному файлі, і вона зникне
в обох оболонках, а нова деталь не може з'явитись лише в одній — це зупинить CI.

