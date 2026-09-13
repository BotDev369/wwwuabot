<!-- компоненти .wb-*, діалог, іконки -->
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

### Каркас оболонки: кирпичики (`app-chrome.css`)

`web-platform-dev` і `web-admin-dev` — дві оболонки **одного** продукту: різниця лише
в логіці, правах і даних. Каркас (меню, шапка, сторінка, екран входу) описаний один
раз у `packages/shared/src/styles/app-chrome.css`; оболонка лише складає його.

| Кирпичик | Призначення |
|---|---|
| `.wb-app` / `.wb-app-main` / `.wb-app-body` | корінь застосунку: меню ліворуч, контент праворуч (`100dvh`) |
| `.wb-app-header` / `.wb-app-title` / `.wb-app-hamburger` / `.wb-app-logout` | верхня смуга: гамбургер, назва, вихід |
| `.wb-nav` (+ `--collapsed`) | бічне меню; на мобільному стає drawer'ом через `.app-drawer` |
| `.wb-nav-header` / `.wb-nav-logo` / `.wb-nav-title` / `.wb-nav-toggle` | шапка меню |
| `.wb-nav-menu` / `.wb-nav-section` / `.wb-nav-section-title` | прокручуваний список і групи пунктів |
| `.wb-nav-item` (+ `--active`) / `.wb-nav-icon` / `.wb-nav-label` | пункт меню — і посилання, і кнопка (напр. перемикач теми) |
| `.wb-nav-footer` | низ меню (вихід) |
| `.wb-topbar` / `.wb-topbar-left` / `.wb-topbar-title` / `.wb-topbar-right` | шапка сторінки з діями |
| `.wb-page` / `.wb-page-head` / `.wb-page-title` / `.wb-page-actions` | контент сторінки з заголовком і кнопками |
| `.wb-splash` / `.wb-splash-icon` | перший кадр, поки невідомо, хто користувач |
| `.wb-auth` / `-card` / `-logo` / `-form` / `-field` / `-label` / `-input` / `-error` / `-message` / `-submit` | екран входу й «відкрийте в Telegram» |
| `.wb-profile` / `-title` / `-fields` / `-field` / `-label` / `-value` | картка користувача (рендерить спільний `UserProfileCard`) |

```html
<!-- Адмінка: меню + контент -->
<div class="wb-app">
  <aside class="wb-nav app-drawer">
    <div class="wb-nav-header">…</div>
    <nav class="wb-nav-menu">
      <a class="wb-nav-item wb-nav-item--active">…</a>
    </nav>
  </aside>
  <div class="wb-app-main">
    <header class="wb-app-header">…</header>
    <main class="wb-app-body">…</main>
  </div>
</div>
```

Правило межі: **оболонка не малює новий каркас**. Якщо елемент потрібен обом — він
кирпичик у shared; якщо справді лише одній — клас цієї оболонки і лише *всередині*
її власного `index.css`. Брендові теми (`apple.css` / `android.css`) стилізують саме
кирпичики, тому `data-brand` доходить до обох оболонок однаково.

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

