/**
 * Імена знаків продукту — **єдине джерело списку**.
 *
 * Окремий файл, а не тип усередині `icons.tsx`, з двох причин:
 *
 *   1. `icons.tsx` — це `.tsx`, і будь-який імпорт із нього тягне JSX у збірку.
 *      Воркери (`api-dev`, `bot-dev`) компілюються БЕЗ `--jsx`, тож спільні дані
 *      мусять лежати в `.ts` — інакше типовий імпорт валить їхній `tsc`.
 *   2. Імена знаків — це дані. Кому потрібен лише перелік (напр. типи Page
 *      Builder для знака блоку), той не мусить тягнути за собою розмітку.
 *
 * **Список один, і він же перевірка.** `ICON_NAMES` — масив, з якого виведено
 * тип `IconName`, а `icons` у `icons.tsx` типізований як `Record<IconName, …>`:
 * забутий гліф або зайве ім'я валить компілятор, а не тихо рендериться
 * порожнечею (саме так картка блоку «Кнопки» стояла без знака: імені `buttons`
 * у наборі не існувало, а поле знака було звичайним рядком).
 *
 * Документація цього переліку **не дублює** — він дрейфує, і другої копії
 * тримати не можна.
 *
 * @module packages/shared/src/components/icon-names
 */

/** Імена всіх знаків. Порядок груп — той самий, що в `icons.tsx`. */
export const ICON_NAMES = [
  // ── Навігація й розділи ───────────────────────────────────────────────
  "home",
  "scenarios",
  "users",
  "bot",
  "my-dates",
  "compare",
  "settings",
  "logout",
  "sidebar-toggle",
  "announce",
  "palette",
  "game",
  "pin",
  "contact",
  "page",
  "folder",
  "question",
  "crown",
  // ── Дії ───────────────────────────────────────────────────────────────
  "eye",
  "eye-off",
  "edit",
  "mail",
  "lock",
  "unlock",
  "trash",
  "eraser",
  "clipboard",
  "save",
  "copy",
  "share",
  "check",
  "close",
  "refresh",
  "download",
  "upload",
  "link",
  "external-link",
  "plus",
  "minus",
  "search",
  "filter",
  "sort",
  "menu",
  "more",
  "expand",
  "collapse",
  "sparkles",
  "construction",
  "wrench",
  "warning",
  "info",
  // ── Стрілки ───────────────────────────────────────────────────────────
  "arrow-up",
  "arrow-down",
  "arrow-left",
  "arrow-right",
  "chevron-down",
  "chevron-right",
  "chevron-up",
  // ── Вміст, медіа й блоки ──────────────────────────────────────────────
  "image",
  "camera",
  "video",
  "keyboard",
  "text",
  "list",
  "divider",
  "grid",
  "blocks",
  "layout",
  "card",
  "table",
  "quote",
  "code",
  "tag",
  "badge",
  "star",
  "heart",
  "thumbs-up",
  "bar-chart",
  "progress",
  "percent",
  "hash",
  "message-square",
  "layers",
  "calendar",
  "globe",
  "sun",
  "moon",
  "sliders",
  "tabs",
  "accordion",
  "spacer",
  "hero",
  "select",
  "field",
  "textarea",
  "checklist",
  "buttons",
  // ── Знаки ігор ────────────────────────────────────────────────────────
  "mark-x",
  "mark-o",
  "rock",
  "scissors",
  "paper",
  // ── Залиті близнюки пунктів футера ────────────────────────────────────
  "home-solid",
  "scenarios-solid",
  "users-solid",
  "user-solid",
  // ── Решта ─────────────────────────────────────────────────────────────
  "user",
  // Кошик покупця ≠ торба магазину (`shop`): перше — те, що набирають,
  // друге — те, чим торгують.
  "cart",
  "shop",
] as const;

export type IconName = (typeof ICON_NAMES)[number];
