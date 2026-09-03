# Design System — WWWUABot

> **Single source of truth** for all UI styling in `web-admin-dev` and `web-platform-dev`.
> Both apps import these styles via `@wwwuabot/shared/styles/index.css`.

## CSS Token System

All tokens are defined in `packages/shared/src/styles/tokens.css` and overridden per brand in `apple.css` / `android.css`.

### Colors

| Token | Usage |
|---|---|
| `var(--bg-1)` | Page/card background |
| `var(--bg-2)` | Secondary background |
| `var(--bg-3)` | Tertiary background |
| `var(--bg-4)` | Hover background |
| `var(--text-primary)` | Primary text |
| `var(--text-secondary)` | Muted text |
| `var(--text-inverse)` | Text on accent background |
| `var(--accent)` | Brand/accent color |
| `var(--accent-hover)` | Accent hover state |
| `var(--border)` | Default border |
| `var(--green)` | Success/active |
| `var(--green-dim)` | Success background |
| `var(--red)` | Error/danger |
| `var(--red-dim)` | Danger background |
| `var(--yellow)` | Warning/pending |
| `var(--yellow-dim)` | Warning background |

### Typography

| Token | Usage |
|---|---|
| `var(--font-ui)` | Primary UI font |
| `var(--font-display)` | Accent/heading font (Space Grotesk) |
| `var(--font-mono)` | Monospace/code |

### Spacing & Radius

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

All component styles are in `packages/shared/src/styles/components.css`.

### Buttons

```html
<!-- Base -->
<button class="wb-btn">Default</button>

<!-- Variants -->
<button class="wb-btn wb-btn-primary">Primary</button>
<button class="wb-btn wb-btn-secondary">Secondary</button>
<button class="wb-btn wb-btn-ghost">Ghost</button>
<button class="wb-btn wb-btn-danger">Danger</button>

<!-- Sizes -->
<button class="wb-btn wb-btn-sm">Small</button>
<button class="wb-btn wb-btn-lg">Large</button>

<!-- Semantic modifiers -->
<button class="wb-btn wb-btn-analyze">Analyze</button>
<button class="wb-btn wb-btn-compare">Compare</button>
<button class="wb-btn wb-btn-inline">Inline</button>
<a class="wb-btn wb-btn-telegram">Telegram</a>

<!-- Dirty indicator (unsaved changes dot) -->
<button class="wb-btn wb-btn-primary wb-btn-dirty">Save</button>
```

### Cards

```html
<div class="wb-card">
  <div class="wb-card-header">Header</div>
  <div class="wb-card-body">Body</div>
  <div class="wb-card-footer">Footer</div>
</div>
```

### Modals

```html
<div class="wb-modal-overlay">
  <div class="wb-modal">
    <div class="wb-modal-header">
      <h3>Title</h3>
      <button class="modal-close">×</button>
    </div>
    <div class="wb-modal-body">Content</div>
    <div class="wb-modal-footer">
      <button class="wb-btn wb-btn-secondary">Cancel</button>
      <button class="wb-btn wb-btn-primary">Save</button>
    </div>
  </div>
</div>
```

### Form Inputs

```html
<label class="wb-label">Label</label>
<input class="wb-input" />
<select class="wb-select">...</select>
<textarea class="wb-textarea"></textarea>
```

### Badges

```html
<span class="wb-badge wb-badge-green">Active</span>
<span class="wb-badge wb-badge-red">Blocked</span>
<span class="wb-badge wb-badge-yellow">Pending</span>
<span class="wb-badge wb-badge-neutral">Draft</span>
<span class="wb-badge wb-badge-accent">Featured</span>
```

### Other Components

```html
<!-- Chips -->
<span class="wb-chip">Tag</span>

<!-- Toast notifications -->
<div class="wb-toast">Message</div>

<!-- Empty state -->
<div class="wb-empty">No items found</div>

<!-- Loading skeleton -->
<div class="wb-skeleton"></div>

<!-- Divider -->
<hr class="wb-divider" />
```

---

## Rules for New Code

1. **Always use `.wb-*` classes** — never define local `.btn`, `.modal`, `.card` classes.
2. **Always use CSS tokens** — never hardcode hex colors or pixel values for border-radius.
3. **Emoji in UI are forbidden** — use SVG icons from `@wwwuabot/shared` (`icons` object).
4. **Dropdowns are forbidden** — use full-screen modals for all selection UI.
5. **Brand themes** (Apple / Material) are toggled via `data-brand` attribute on `<html>`.
6. **Dark/Light themes** are toggled via `data-theme` attribute on `<html>`.

## File Locations

| File | Purpose |
|---|---|
| `tokens.css` | CSS custom properties (colors, spacing, radius) |
| `apple.css` | Apple brand overrides |
| `android.css` | Material brand overrides |
| `components.css` | All `.wb-*` component styles |
| `reset.css` | CSS reset |
| `themes.css` | Theme variables |
| `index.css` | Barrel import of all styles |
| `icons.tsx` | SVG icon components |

---

*Last updated: 03.09.2026*
