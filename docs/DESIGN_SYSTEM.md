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
    instead of drifting a few pixels. The tab column keeps its 62px at **every** width (8px side
    padding, so the cell inside stays 46px and the phone does not lose its tap target); the body's
    horizontal inset is `--sp-3`, which is what keeps the field off the column and off the edge. The attachment row sits **above** the note field as the
    continuation of the tab column, so it is a row of cells, not of chips.
    The composer carries **no separator lines**: no rule under the title, none above the footer,
    none beside the tab column, none around a field — space does the separating. There is no
    instructional paragraph under the fields either: the label and the button already say what they
    do, and such a paragraph only eats room.
    Its fields are their **own brick** (`.wb-composer-field` / `-input` / `-tags`), not
    `.wb-textarea` / `.wb-input`, and that is not a matter of taste: the brand themes force a border,
    a radius and padding onto those classes with `!important`, so beating them from `components.css`
    would take an `!important` of our own. The composer's flat fields are the decision, so they are
    a separate brick — and each one has a **label above it** (`.wb-label`), which is what says where
    things are in a modal with no borders. The note field is three rows tall, scrolls beyond that,
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
| `packages/shared/src/components/icons.tsx` | SVG icon definitions |
| `packages/shared/src/components/Icon.tsx` | `<Icon />` component |
| `packages/shared/src/components/StyleToggle.tsx` | `ThemeButton` component |
