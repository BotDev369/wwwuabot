<!-- токени + правила + де що лежить -->
# Design System

> Single source of truth for UI styling. Used by `web-platform-dev` and `web-admin-dev` via `@wwwuabot/shared/styles/`.

---

## CSS Tokens

Defined in `packages/shared/src/styles/tokens.css`, overridden per brand in `apple.css` / `android.css`.

### Colors

| Token | Usage |
|---|---|
| `var(--bg-home)` | Фон-підкладка сторінки (найтемніший/найсвітліший рівень) |
| `var(--bg-0)` … `var(--bg-4)` | Поверхні від підкладки до hover |
| `var(--text-primary)` / `--text-secondary` / `--text-muted` | Текст: основний / другорядний / підказка |
| `var(--text-inverse)` | Текст на акцентній плашці |
| `var(--accent)` / `--accent-hover` / `--accent-dim` / `--accent-soft` | Акцент: база / hover / плашка / підкладка під фокус |
| `var(--border)` / `var(--border-subtle)` | Межі: помітна / ледь видима |
| `var(--surface)` / `--surface-hover` / `--surface-active` / `--surface-overlay` | Поверхні карток, стани й скрим |
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
| Шари | `--z-dropdown`, `--z-sticky`, `--z-overlay`, `--z-modal`, `--z-toast` |

### Layout і мобільні

Це не «дизайн», а геометрія екрана — тому її теж використовуємо тільки через токени:

| Token | Призначення |
|---|---|
| `var(--sidebar-w)` / `--sidebar-w-collapsed` | Ширина бічної панелі на десктопі |
| `var(--drawer-w)` | Ширина виїзного меню на мобільному (те саме значення в обох оболонках) |
| `var(--scrim)` | Затемнення під drawer/модалкою |
| `var(--topbar-h)` / `--nav-bar-h` / `--tab-bar-h` | Висоти хедерів |
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
    `.wb-app*`, `.wb-nav*`, `.wb-topbar*`, `.wb-page*`, `.wb-auth*`, `.wb-splash`,
    `.wb-profile*` (`app-chrome.css`). The same detail in both shells → a brick in
    shared; a new private class for the same thing is a defect, not "the shell's style".
13. Shared blocks (`packages/ui/src/blocks/*`) are still styled with inline
    `style={{ … }}` (192 objects, 30 hardcoded hex values), and **44 `wb-block-*`
    classes have no CSS rule at all**, so `data-brand` and `data-theme` don't reach them. Moving those styles into `.wb-block-*` rules in
    `components.css` is open work — `docs/CONSOLIDATION_PLAN.md` §3 (пункт 3).

---

## File Locations

| File | Purpose |
|---|---|
| `packages/shared/src/styles/tokens.css` | CSS custom properties |
| `packages/shared/src/styles/apple.css` | Apple brand overrides |
| `packages/shared/src/styles/android.css` | Material brand overrides |
| `packages/shared/src/styles/components.css` | `.wb-*` component styles (включно з `.wb-dialog*`) |
| `packages/shared/src/styles/app-chrome.css` | кирпичики каркаса оболонки: app / nav / topbar / page / auth / splash / profile |
| `packages/shared/src/styles/page-layout.css` | каркас сторінки для `PageRenderer` |
| `packages/shared/src/styles/drawer.css` | виїзне меню й гамбургер (обидві оболонки) |
| `scripts/check-css-classes.mjs` | перевірка «клас у розмітці ↔ правило в CSS» (гейт CI) |
| `scripts/css-baseline.mjs` | задокументований борг для цієї перевірки (тільки зменшувати) |
| `packages/ui/src/dialog/` | `DialogProvider` + `useDialog()` |
| `packages/shared/src/components/icons.tsx` | SVG icon definitions |
| `packages/shared/src/components/Icon.tsx` | `<Icon />` component |
| `packages/shared/src/components/StyleToggle.tsx` | `ThemeButton` component |
