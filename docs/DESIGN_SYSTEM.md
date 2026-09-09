# Design System

> Single source of truth for UI styling. Used by `web-platform-dev` and `web-admin-dev` via `@wwwuabot/shared/styles/`.

---

## CSS Tokens

Defined in `packages/shared/src/styles/tokens.css`, overridden per brand in `apple.css` / `android.css`.

### Colors

| Token | Usage |
|---|---|
| `var(--bg-1)` | Page/card background |
| `var(--bg-2)` | Secondary background |
| `var(--bg-3)` | Tertiary background |
| `var(--bg-4)` | Hover background |
| `var(--text-primary)` | Primary text |
| `var(--text-secondary)` | Muted text |
| `var(--accent)` | Brand/accent color |
| `var(--accent-hover)` | Accent hover |
| `var(--border)` | Default border |
| `var(--green)` / `var(--green-dim)` | Success |
| `var(--red)` / `var(--red-dim)` | Danger |
| `var(--yellow)` / `var(--yellow-dim)` | Warning |

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

<!-- Badges -->
<span class="wb-badge wb-badge-green">Active</span>
<span class="wb-badge wb-badge-red">Blocked</span>
<span class="wb-badge wb-badge-yellow">Pending</span>
<span class="wb-badge wb-badge-neutral">Draft</span>
```

---

## Icons: `<Icon />`

```tsx
import { Icon } from "@wwwuabot/shared";
<Icon name="home" size={16} />
```

Available names: `home`, `edit`, `trash`, `eye`, `close`, `settings`, `user`, `users`, `calendar`, `search`, `plus`, `minus`, `check`, `x`, `chevron-down`, `chevron-right`, `chevron-left`, `chevron-up`, `star`, `heart`, `bookmark`, `share`, `download`, `upload`, `filter`, `refresh`, `copy`, `external-link`, `menu`, `arrow-left`, `arrow-right`, `text`, `image`, `list`, `divider`, `button`, `layout`, `grid`, `layers`, `sliders`, `code`, `link`.

---

## Rules

1. Always use `.wb-*` classes — never define local `.btn`, `.modal`, `.card`.
2. Always use CSS tokens — never hardcode hex colors or pixel border-radius.
3. **Emoji in UI are forbidden** — use `<Icon />`.
4. **Dropdowns are forbidden** — use full-screen modals.
5. Brand themes: `data-brand` attribute on `<html>` (Apple / Material).
6. Dark/Light: `data-theme` attribute on `<html>`.
7. New files MUST use `<Icon />` — never create local `const ico` helpers.

---

## File Locations

| File | Purpose |
|---|---|
| `packages/shared/src/styles/tokens.css` | CSS custom properties |
| `packages/shared/src/styles/apple.css` | Apple brand overrides |
| `packages/shared/src/styles/android.css` | Material brand overrides |
| `packages/shared/src/styles/components.css` | `.wb-*` component styles |
| `packages/shared/src/components/icons.tsx` | SVG icon definitions |
| `packages/shared/src/components/Icon.tsx` | `<Icon />` component |
| `packages/shared/src/components/StyleToggle.tsx` | `ThemeButton` component |
