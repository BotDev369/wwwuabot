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

## Component Classes (`.wb-*`)

Defined in `packages/shared/src/styles/components.css`.

```html
<!-- Buttons -->
<button class="wb-btn wb-btn-primary">Primary</button>
<button class="wb-btn wb-btn-secondary">Secondary</button>
<button class="wb-btn wb-btn-ghost">Ghost</button>
<button class="wb-btn wb-btn-danger">Danger</button>
<button class="wb-btn wb-btn-sm">Small</button>
<button class="wb-btn wb-btn-dirty">Save (unsaved indicator)</button>

<!-- Cards -->
<div class="wb-card">
  <div class="wb-card-header">Header</div>
  <div class="wb-card-body">Body</div>
</div>

<!-- Modals -->
<div class="wb-modal-overlay">
  <div class="wb-modal">
    <div class="wb-modal-header"><h3>Title</h3></div>
    <div class="wb-modal-body">Content</div>
    <div class="wb-modal-footer">Actions</div>
  </div>
</div>

<!-- Forms -->
<label class="wb-label">Label</label>
<input class="wb-input" />
<select class="wb-select">...</select>
<textarea class="wb-textarea"></textarea>

<!-- Поле: підпис і контрол один під одним -->
<div class="wb-field">
  <label class="wb-label">Назва</label>
  <input class="wb-input" />
</div>

<!-- Теги -->
<div class="wb-tags-input">
  <span class="wb-chip">тег <button class="wb-tag-remove">…</button></span>
  <input class="wb-input" />
</div>
<div class="wb-tag-suggestions">
  <button class="wb-chip wb-chip-sm">+ тег</button>
</div>

<!-- Індикатор завантаження: розмір задає місце виклику -->
<div class="wb-spinner" style="width: 16px; height: 16px"></div>

<!-- Утиліти: flex/gap, відступи, вага, колір -->
<div class="wb-flex wb-gap-2 wb-mb-3">
  <h4 class="wb-font-semibold wb-text-primary">Заголовок</h4>
  <p class="wb-text-sm wb-text-muted wb-mt-1">Опис</p>
</div>

<!-- Badges -->
<span class="wb-badge wb-badge-green">Active</span>
<span class="wb-badge wb-badge-red">Blocked</span>
<span class="wb-badge wb-badge-yellow">Pending</span>
<span class="wb-badge wb-badge-neutral">Draft</span>
```

### Діалог (alert / confirm / prompt)

Не розмітка вручну, а хук: він малює `.wb-modal` з `wb-dialog` — тими самими
класами, що й решта модалок.

```tsx
import { useDialog } from "@wwwuabot/ui/dialog";

const dialog = useDialog();
await dialog.alert("Готово");
if (!(await dialog.confirm("Видалити?", { tone: "danger" }))) return;
const name = await dialog.prompt("Назва:");
```

| Клас | Призначення |
|---|---|
| `.wb-dialog` | розмір короткого діалогу (`max-width: 420px`, `height: auto`, `max-height: 85dvh`) |
| `.wb-dialog-body` / `.wb-dialog-message` / `.wb-dialog-error` | вміст і повідомлення про помилку вводу |
| `.wb-dialog-footer` / `.wb-dialog-btn` | кнопки на всю ширину, `min-height: 44px` — тап-таргет для пальця |

### Каркас сторінки і мобільна навігація

Ці класи рендерить **спільний** `PageRenderer`, тому вони мусять бути в shared, а не
в `index.css` однієї з оболонок:

| Файл | Класи |
|---|---|
| `page-layout.css` | `.page-layout`, `.page-zone`, `.page-zone--{sidebar,header,main,footer}`, `.page-hamburger` |
| `drawer.css` | `aside.app-drawer` (+ `--open`), `.app-drawer-overlay`, `.hamburger` |

```html
<div class="page-layout">
  <div class="app-drawer-overlay"></div>
  <aside class="page-zone page-zone--sidebar app-drawer app-drawer--open">…</aside>
  <div class="page-zone-group">…</div>
</div>
```

---

## Icons: `<Icon />`

```tsx
import { Icon } from "@wwwuabot/shared";
<Icon name="home" size={16} />
```

Іконок **75** (станом на 12.09.2026). Єдиний перелік — тип `IconName` у
`packages/shared/src/components/icons.tsx`; окремого списку в документації немає
навмисно, бо він дрейфує.

Групи (не всі імена): навігація — `home`, `scenarios`, `scenarios-admin`, `users`,
`bot`, `my-dates`, `settings`, `logout`, `menu`, `sidebar-toggle`; дії — `edit`,
`trash`, `save`, `copy`, `link`, `mail`, `lock`, `unlock`, `search`, `filter`,
`refresh`, `download`, `upload`; стан — `check`, `close`, `x`, `info`, `warning`,
`construction`, `sparkles`; медіа й контент — `image`, `video`, `camera`, `keyboard`,
`text`, `code`, `quote`, `list`, `divider`, `button`, `layout`, `grid`, `layers`,
`card`, `tabs`, `star`, `bar-chart`, `hash`, `percent`; стрілки — `arrow-left`,
`arrow-right`, `arrow-up`, `arrow-down`, `chevron-left`, `chevron-right`,
`chevron-down`, `chevron-up`, `external-link`.

Стрілки в редакторі блоків — саме `arrow-up` / `arrow-down`, а не текст «↑ ↓»:
символи не масштабуються з `size` і не читаються скрін-рідером.

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
    `components.css` — or use one that already exists.
12. Shared blocks (`packages/ui/src/blocks/*`) are still styled with inline
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
| `packages/shared/src/styles/page-layout.css` | каркас сторінки для `PageRenderer` |
| `packages/shared/src/styles/drawer.css` | виїзне меню й гамбургер (обидві оболонки) |
| `packages/ui/src/dialog/` | `DialogProvider` + `useDialog()` |
| `packages/shared/src/components/icons.tsx` | SVG icon definitions |
| `packages/shared/src/components/Icon.tsx` | `<Icon />` component |
| `packages/shared/src/components/StyleToggle.tsx` | `ThemeButton` component |
