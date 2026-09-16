<!-- токени + правила + де що лежить -->
# Design System

> Single source of truth for UI styling. Used by `web-platform-dev` and `web-admin-dev` via `@wwwuabot/shared/styles/`.

---

## CSS Tokens

Defined in `packages/shared/src/styles/tokens.css`, overridden per brand in `apple.css` / `android.css`.

### Colors

| Token | Usage |
|---|---|
| `var(--bg-page)` | Фон **екрана**: плоский колір, той самий, що йде нативному хрому Telegram (`= var(--chrome-header-bg)`). Ним малюються `body`, `.wb-app`, `main`, зони `.page-zone*`, `.wb-splash`, `.wb-auth` |
| `var(--bg-home)` | Градієнт-підкладка **поверхонь** (картки, панелі). Площину екрана ним НЕ малюємо: плоский колір клієнта не дорівняє градієнту — був би шов |
| `var(--bg-0)` … `var(--bg-4)` | Поверхні від підкладки до hover |
| `var(--text-primary)` / `--text-secondary` / `--text-muted` | Текст: основний / другорядний / підказка |
| `var(--text-inverse)` | Текст на акцентній плашці |
| `var(--accent)` / `--accent-hover` / `--accent-dim` / `--accent-soft` | Акцент: база / hover / плашка / підкладка під фокус |
| `var(--border)` / `var(--border-subtle)` | Межі: помітна / ледь видима |
| `var(--surface)` / `--surface-hover` / `--surface-active` / `--surface-overlay` | Поверхні карток, стани й скрим |
| `var(--field-bg)` / `var(--field-ring)` | **Поле вводу**: колір поля (трохи інший за тло поверхні) і м'яка тінь по краях. Межу поля малює саме вони, а не лінія — одне правило на всі поля продукту (`.wb-input`, `.wb-select`, `.wb-textarea` і власні поля композера). Схема світла/темна — у `themes.css` |
| `var(--chrome-header-bg)` / `var(--chrome-bottom-bg)` | Нативний хром Telegram: шапка клієнта і смуга під футером; синхронізує `shared/app/telegram-chrome.ts`. Наші смуги (`.wb-app-header`, `.wb-topbar`, `.wb-tabbar`) малюються тими самими токенами на 91% (прозорі на 9%) і **без** ліній та тіней |
| `var(--green)` / `var(--green-dim)` | Успіх |
| `var(--red)` / `var(--red-dim)` | Небезпека |
| `var(--yellow)` / `var(--yellow-dim)` | Попередження |

### Typography

| Token | Usage |
|---|---|
| `var(--font-ui)` | Primary UI font |
| `var(--font-display)` | Accent/heading font |
| `var(--font-mono)` | Monospace/code |

### Radius

| Token | Value |
|---|---|
| `var(--radius-xs)` | 2px |
| `var(--radius-sm)` | 4px |
| `var(--radius)` | 6px |
| `var(--radius-md)` | 8px |
| `var(--radius-lg)` | 12px |
| `var(--radius-xl)` | 16px |
| `var(--radius-full)` | 9999px (pills) |

### Spacing, elevation, motion

| Група | Токени |
|---|---|
| Відступи | `--sp-0` … `--sp-16` (4px-крок) |
| Мірки кнопки | `--btn-pad-y`, `--btn-pad-x` (задає і спільний шар, і бренд — `padding` у `.wb-btn` пише лише базове правило) |
| Тіні | `--shadow-xs` … `--shadow-xl`, `--elevation-0` … `--elevation-3` |
| Анімація | `--duration-fast`, `--duration`, `--duration-slow`, `--ease`, `--ease-in`, `--ease-out`, `--ease-spring` |
| Шари | `--z-dropdown` < `--z-sticky` < `--z-overlay` < `--z-modal` (400) < `--z-tabbar` (**1100** — футер завжди видно: він вище за модалки й виїзне меню) < `--z-toast` (1200) |

### Layout і мобільні

Це не «дизайн», а геометрія екрана — тому її теж використовуємо тільки через токени:

| Token | Призначення |
|---|---|
| `var(--sidebar-w)` / `--sidebar-w-collapsed` | Ширина бічної панелі на десктопі |
| `var(--drawer-w)` | Ширина виїзного меню на мобільному (те саме значення в обох оболонках) |
| `var(--scrim)` | Затемнення під drawer/модалкою |
| `var(--topbar-h)` / `--nav-bar-h` | Висоти хедерів і нижньої смуги (бренд: 56px Apple HIG, 60px Material — планка бренду плюс місце під залите коло активного розділу) |
| `var(--tab-bar-h)` | Повна висота нижнього футера = `--nav-bar-h` + `--safe-bottom` (не перевизначати третім числом) |
| `var(--safe-top)` / `var(--safe-bottom)` | Краї екрана: `env(safe-area-inset-*)` + `--tg-safe-area-inset-*` від Telegram |
| `var(--max-content)` | Максимальна ширина контенту |

> `--safe-*` != 0 лише тоді, коли в `index.html` є `viewport-fit=cover`. Без нього
> контент залазить під виріз і індикатор «додому» — і виглядає це як «десь дизайн поламався».

---


## Rules

1. Always use `.wb-*` classes — never define local `.btn`, `.modal`, `.card`.
2. Always use CSS tokens — never hardcode hex colors or pixel border-radius.
3. **Emoji in UI are forbidden** — use `<Icon />`.
4. **Dropdowns are forbidden** — use full-screen modals.
5. Brand themes: `data-brand` attribute on `<html>` (Apple / Material).
6. Dark/Light: `data-theme` attribute on `<html>`.
7. New files MUST use `<Icon />` — never create local `const ico` helpers.
8. **Native `alert` / `confirm` / `prompt` are forbidden** — on iOS the Telegram WebView
   does not render them, so the button silently does nothing. Use `useDialog()`.
9. Actions are labelled with `<Icon />`, not Unicode glyphs: `↑`, `↓`, `✕` don't scale with
   `size`, aren't read by screen readers, and look different across fonts.
10. If shared code (`packages/ui`) renders a class, its styles live in
    `packages/shared/src/styles/` — not in one shell's `index.css`.
11. **A class without a rule is a bug, not a style.** `class="wb-mt-3"` in the markup
    with no `.wb-mt-3` anywhere renders nothing and fails silently: the spacing simply
    never appears, and no test catches it. Before adding a class to markup, add it to
    `components.css` — or use one that already exists. Enforced automatically:
    `npm run check:css` (the same gate in CI) fails when markup uses a class with no
    rule, or when shared code is styled in only one shell. Known debt lives in
    `scripts/css-baseline.mjs` and must shrink, never grow.
12. **Compose from bricks — don't draw your own chrome.** A shell's chrome is
    `.wb-app*`, `.wb-nav*`, `.wb-tabbar*`, `.wb-topbar*`, `.wb-page*`, `.wb-auth*`, `.wb-splash`,
    `.wb-profile*`, `.wb-profile-lookup`, `.wb-handle*` (`app-chrome.css`). A page that must scroll
    inside the panel adds `.wb-page-scroll`: the panel chrome keeps `overflow: hidden`, so the page
    has to bring its own scrolling. The same detail in both shells → a brick in
    shared; a new private class for the same thing is a defect, not "the shell's style".
    The profile's first block is the platform username: `.wb-handle*` (`-head`, `-badge`,
    `-info`, `-label`, `-name` (+`--empty`), `-hint`, `-form`, `-input-row`, `-at`, `-input`,
    `-error`, `-actions`) with `.wb-profile-note` / `-details` / `-summary` / `-subfields`
    for the rest. Whether the name can be edited is decided by one thing only — the presence
    of a save handler — so the visual stays identical in both shells.
    The global bottom footer (`.wb-tabbar`, `TabBar` from `@wwwuabot/ui/nav`) is one of those
    bricks: equal slots, the action `+` in the middle, profile at the far right. The active
    section is highlighted **by its own glyph, not by a background**: the shell hands over a
    solid twin of the outline icon (`iconActive`, e.g. `home` → `home-solid`), exactly like
    YouTube / Instagram / TikTok do it. A filled circle under the icon was tried on 14.09 and
    rejected — it shouts louder than the label it is meant to support.    It is `position: fixed`,
    so the content needs room under it (`.wb-tabbar-layout` / `.wb-app-body--tabbar`).
    The footer is **chrome**: no modal may cover it. It sits above modals and the drawer
    (`--z-tabbar` = 1100 > `--z-modal` = 400), and every modal leaves room for it —
    `html:has(.wb-tabbar) .wb-modal-overlay { padding-bottom: … + var(--tab-bar-h) }` — because
    the shared dialog renders at the app root, outside the shell. Selecting another section
    closes the composer (the shell owns that state), and the `+` toggles it.
13. **The composer (`+` in the footer) is one shared modal, not a per-shell screen.**
    `ComposerModal` (`@wwwuabot/ui/composer`) opens in both shells; its markup uses the same
    `.wb-modal*` bricks as `useDialog()` plus `.wb-composer*` (tabs as a compact column on the left —
    `.wb-composer-tabs` / `-tab` / `-tab-label`, note pane, stub pane, `.wb-composer-tool` for the
    icon-only attachment buttons). Labels vanish on narrow screens, so every tab and every icon-only
    button carries its name in `aria-label`.
    A tab and an attachment button are the **same cell** — one rule styles both (`.wb-composer-tab,
    .wb-composer-tool`): no border, no fill, radius, hover highlight. The cell size, the gap and the
    inset from the edge are **local variables on `.wb-composer`** (`--composer-cell` 46px,
    `--composer-gap`, `--composer-pad`), and the tab column and the attachment row both measure
    themselves with them — that is why the attachment row lands exactly on the first tab's level
    instead of drifting a few pixels. The tab column keeps its `--composer-col` (68px) at **every** width (8px side
    padding, so the cell inside stays ≥ 46px and the phone does not lose its tap target); the body's
    horizontal inset is `--sp-3`, which is what keeps the field off the column and off the edge. The
    width is a measure, not a taste: it is what lets the longest tab name ("Сторінка") sit on **one**
    line — a label that wraps mid-word ("Сторінк / а") is a layout defect, not a hyphenation, so the
    label is `nowrap` + ellipsis and never rides onto the field. The attachment row sits **above** the note field as the
    continuation of the tab column, so it is a row of cells, not of chips.
    The composer carries **no separator lines**: no rule under the title, none beside the tab column,
    none around a field, none above the action row — space does the separating. There is no
    instructional paragraph under the fields either: the label and the button already say what they
    do, and such a paragraph only eats room. The actions ("Закрити" / "Зберегти", and more to come)
    are **the last row of the tab's body** (`.wb-sheet-actions` — the same brick the note view uses,
    rule 18), not a pinned footer: the modal
    grows with its content, so a fixed bar would eat the fields' room; `margin-top: auto` holds them
    at the bottom while there is room and lets them scroll with the body when there is not.
    Its fields keep their own layout classes (`.wb-composer-field` / `-input` / `-tags`) — the text
    field is three rows tall with its own size rules and the hashtag row is a box for chips — but
    the **surface** comes from the shared field brick: one rule lists `.wb-input`, `.wb-select`,
    `.wb-textarea` and both composer fields, and paints them with `--field-bg` plus a soft
    `--field-ring`. A field is therefore visible everywhere by **colour and blurred edges**, not by
    a line, and the brand themes no longer force a border onto those classes with `!important`
    (Apple and Android only add radius and metrics now, so they cannot make one shell's fields look
    different from the other's). Each field also has a **label above it** (`.wb-label`), which is
    what says where things are in a modal without borders. Every field pins a **font floor of 16px**
    (`max(16px, 1em)`) **in its own rule**, not in a shared list: iOS WebKit enlarges the whole page
    when focus lands in a field with a smaller font (Android never does — hence "it only breaks on
    iPhone"), and a later rule of one field quietly overriding the shared floor is exactly how that
    bug came back twice. `packages/shared/src/styles/fields.test.ts` reads the CSS of the whole
    product and fails on any field below that floor. The note field is three rows tall, scrolls beyond that,
    and grows two ways: `resize: vertical` on desktop and with the text (`useAutoGrowField`, capped,
    and it never shrinks what a hand has dragged) on touch, where no WebView renders the handle.
    Hashtags are chips plus an inline input in the same row (`.wb-composer-tag*`): a tag ends on a
    space, a comma or Enter, and Backspace on an empty input drops the last one. Their rules are
    pure functions in `tags.ts`, since what counts as a tag decides whether the note is found
    later.
    Tabs are data (`tabs.ts`): a new tab is a line in the list, not new markup. A tab whose
    interface does not exist yet renders a statement of what will be there, and every unwired
    action answers with `useDialog()` ("that is a separate topic") instead of doing nothing
    silently on a phone. The footer's action slot carries its own `onSelect`
    (`ShellTab.onSelect` + `withPrimaryAction`): "create" is an action, not a route, so it has
    no `href` to invent.
14. Shared blocks (`packages/ui/src/blocks/*`) are still styled with inline
    `style={{ … }}` (192 objects there, 556 in live `src` overall; 97 hardcoded `#hex`),
    and **45 `wb-block-*` classes have no CSS rule at all**, so `data-brand` and
    `data-theme` don't reach them (вимір 13.09.2026). Moving those styles into `.wb-block-*` rules in
    `components.css` is open work — `docs/CONSOLIDATION_PLAN.md` §3 (пункт 3).
15. **Розділювач — не лінія.** Ні шапка модалки, ні футер картки, ні рядок таблиці
    не малюють штрих: місце відділяє простір, а структуру тримають **поверхня**
    (колір картки, шапки таблиці, смуга парних рядків), **м'яка тінь** (краї
    закріплених колонок) або сам контрол (залитий чип, залита кнопка, поле з
    `--field-bg`). Рамка лишається лише там, де вона — не прикраса, а зміст:
    індикатор (спінер, крапка незбереженого), пунктир порожнього слота
    («додати блок») і кільце фокуса/помилки.

    Правило спільне для **всіх** шарів: і `components.css`, і `app-chrome.css`,
    і бренди. Саме тому бренди більше не додають `border-bottom` рядкам
    таблиць, `border-right` меню чи `border` карткам: бренд — це характер
    (радіус, мірки, скло), а не повернення ліній, яких у продукті немає.

17. **A full-screen sheet is one brick, and the profile menu is its second user.** The
    surface is `.wb-sheet` / `.wb-sheet-head` (shadow instead of a border, safe-area padding,
    the phone radius) — it started as `.wb-composer` and was named after its first caller,
    which would have made the menu a second, near-identical copy of it. The composer still
    owns its layout tokens (`--composer-*`). The menu itself (`.wb-menu-body`,
    `.wb-menu-list`, `.wb-menu-item` (+ `--soon`), `.wb-menu-item-icon` / `-text` / `-label` /
    `-hint` / `-check`, `.wb-menu-ident*`) is rendered by the shared `MenuModal`
    (`@wwwuabot/ui/menu`), so a shell only supplies the list of items. A row is a
    **full-width tappable surface** (`--field-bg`, no border): a tap must land anywhere on the
    row, not just on the icon. A row whose screen does not exist yet says so **before the tap**
    (`status: "soon"` + a hint line under the label) and answers with `useDialog()` — an item
    that does nothing silently is the same defect as an unlabelled icon. `selected` draws a
    check, because the theme panel is a choice, not a transition. Both the profile and the
    theme panel are views of **one** modal (a "back" button appears only where there is
    something to return to), never a modal above a modal.

16. **Button metrics are tokens, not a brand's private `padding`.** How big a button is, is decided by
    `--btn-pad-y` / `--btn-pad-x`, and only the base `.wb-btn` rule writes `padding` — from those tokens.
    Apple and Android own the character (pill vs 20px radius, font, weight) and set the tokens; they no
    longer write `padding: 12px 24px !important` on `.wb-btn`, which made any reduction in the shared layer
    invisible — the same trap as the field border (rule 13). `packages/shared/src/styles/buttons.test.ts`
    fails on a `.wb-btn` padding that isn't the token pair, on a brand `min-height` above 44px, and on a
    pad token above 20×12px.

18. **Нотатки — один спільний екран, і його вигляд — чисті функції.** Список, смуга
    керування й перегляд живуть у `@wwwuabot/ui/notes` (кирпичики `.wb-note*`), а оболонка
    лише вирішує, **чиї** нотатки та куди їх писати (`createNotesApi` зі своїм транспортом).
    Пошук, фільтр, сортування й групування — один виклик `buildGroups(notes, view, now)` без
    React: тут помилка виглядає як «нічого не знайдено», а не як зламаний код. Тому: пошук
    вимагає **всі** слова запиту (теги в базі — без `#` і в нижньому регістрі), фільтр має
    три стани («усі» / «без хештегів» / конкретний тег — не рядок-сентевел), а групи «за
    днями» рахуються від **локальної** опівночі, і `now` приходить аргументом — інакше
    «Сьогодні» залежало б від моменту виклику і тестом це не перевірити.
    Вибори не випадають списком (правило 4): кожен відкриває ту саму поверхню `MenuModal`,
    а вибране позначене галочкою — це стан, а не перехід. Картка — **кнопка на всю ширину**
    (палець дістає будь-де), а її текст обрізається по висоті, не `line-clamp`: переноси —
    це те, як нотатку написали. Редагує **той самий** композер (`initial` із `id`), а
    перегляд — окрема поверхня: у композері текст набраний, а не показаний, і другого
    редактора для того самого поля не заводять. Кнопки дій будь-якої повноекранної поверхні
    — `.wb-sheet-actions` (композер і перегляд — одна деталь, а не «схожа»).

---

## File Locations

| File | Purpose |
|---|---|
| `packages/shared/src/styles/tokens.css` | CSS custom properties |
| `packages/shared/src/styles/apple.css` | Apple brand overrides |
| `packages/shared/src/styles/android.css` | Material brand overrides |
| `packages/shared/src/styles/components.css` | `.wb-*` component styles (включно з `.wb-dialog*`) |
| `packages/shared/src/styles/app-chrome.css` | кирпичики каркаса оболонки: app / nav / **tabbar (нижній футер)** / topbar / page / auth / splash / profile |
| `packages/shared/src/styles/page-layout.css` | каркас сторінки для `PageRenderer` |
| `packages/shared/src/styles/drawer.css` | виїзне меню й гамбургер (обидві оболонки) |
| `scripts/check-css-classes.mjs` | перевірка «клас у розмітці ↔ правило в CSS» (гейт CI) |
| `scripts/css-baseline.mjs` | задокументований борг для цієї перевірки (тільки зменшувати) |
| `packages/ui/src/dialog/` | `DialogProvider` + `useDialog()` |
| `packages/ui/src/nav/` | `TabBar` — глобальний нижній футер (розмітка й активи спільні, пункти — з оболонки) |
| `packages/ui/src/composer/` | `ComposerModal` — модалка швидкого створення (відкриває «+» футера) |
| `packages/ui/src/menu/` | `MenuModal` + `buildMenuItems` — повноекранна поверхня зі списком пунктів (відкриває «Профіль» футера; склад — з оболонки) |
| `packages/ui/src/notes/` | `NotesList`, `NotesToolbar`, `NoteSheet` + чисті `view.ts` — список нотаток: пошук, фільтр, сортування, групування (екран платформи `/notes`) |
| `packages/shared/src/components/icons.tsx` | SVG icon definitions |
| `packages/shared/src/components/Icon.tsx` | `<Icon />` component |
| `packages/shared/src/components/StyleToggle.tsx` | `ThemeButton` component |
