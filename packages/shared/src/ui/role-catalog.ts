/**
 * Каталог ролей вигляду: одна карта стилю на кожну роль контенту.
 *
 * **Навіщо.** Сторінка, модалка й меню не описують, як вони виглядають: вони
 * називають категорію й роль, а колір, розмір, відступ, радіус і рух беруться
 * звідси. Нова сторінка = тексти в базі + роль із цього списку.
 *
 * **Слова — в `role-catalog.json`,** а не в коді: гейт `check:texts` рахує
 * кирилицю в UI-коді, і текст, який бачить людина, мусить жити даними.
 *
 * @module packages/shared/src/ui/role-catalog
 */

import texts from "./role-catalog.json";

export type CategoryId =
  "hero" | "surface" | "nav" | "data" | "chart" | "form" | "status" | "empty" | "motion";

export type Tone =
  | "ink"
  | "muted"
  | "accent"
  | "data-0"
  | "data-1"
  | "data-2"
  | "data-3"
  | "data-4"
  | "data-5"
  | "data-6"
  | "green"
  | "yellow"
  | "red";

export type RoleSize = "display" | "title" | "head" | "body" | "label" | "number" | "caption";
export type RoleSpace = "none" | "tight" | "base" | "loose";
export type RoleMotion = "none" | "rise" | "fade" | "pulse";
export type RoleRadius = "none" | "sm" | "md" | "lg" | "full";

export interface StyleRole {
  /** Ім'я ролі — те, що пише автор сторінки. */
  id: string;
  category: CategoryId;
  label: string;
  tone: Tone;
  size: RoleSize;
  space: RoleSpace;
  motion: RoleMotion;
  radius: RoleRadius;
  /** Що саме це означає на екрані. */
  note: string;
}

export interface RoleCategory {
  id: CategoryId;
  label: string;
  note: string;
}

/** Ознаки ролі без слів: слова приходять із JSON. */
type RoleShape = Omit<StyleRole, "label" | "note">;

const SHAPES: readonly RoleShape[] = [
  {
    id: "hero-display",
    category: "hero",
    tone: "ink",
    size: "display",
    space: "loose",
    motion: "rise",
    radius: "none",
  },
  {
    id: "hero-lead",
    category: "hero",
    tone: "muted",
    size: "body",
    space: "base",
    motion: "rise",
    radius: "none",
  },
  {
    id: "card",
    category: "surface",
    tone: "ink",
    size: "body",
    space: "base",
    motion: "rise",
    radius: "lg",
  },
  {
    id: "panel-strip",
    category: "surface",
    tone: "muted",
    size: "label",
    space: "tight",
    motion: "fade",
    radius: "md",
  },
  {
    id: "nav-item",
    category: "nav",
    tone: "ink",
    size: "label",
    space: "tight",
    motion: "fade",
    radius: "full",
  },
  {
    id: "tab",
    category: "nav",
    tone: "muted",
    size: "caption",
    space: "tight",
    motion: "none",
    radius: "full",
  },
  {
    id: "kpi",
    category: "data",
    tone: "data-3",
    size: "number",
    space: "tight",
    motion: "fade",
    radius: "md",
  },
  {
    id: "row-lead",
    category: "data",
    tone: "ink",
    size: "body",
    space: "none",
    motion: "none",
    radius: "none",
  },
  {
    id: "row-cell",
    category: "data",
    tone: "muted",
    size: "label",
    space: "none",
    motion: "none",
    radius: "none",
  },
  {
    id: "series",
    category: "chart",
    tone: "data-5",
    size: "caption",
    space: "tight",
    motion: "rise",
    radius: "full",
  },
  {
    id: "series-neutral",
    category: "chart",
    tone: "data-0",
    size: "caption",
    space: "tight",
    motion: "fade",
    radius: "full",
  },
  {
    id: "field",
    category: "form",
    tone: "ink",
    size: "body",
    space: "base",
    motion: "none",
    radius: "md",
  },
  {
    id: "switch",
    category: "form",
    tone: "accent",
    size: "label",
    space: "tight",
    motion: "none",
    radius: "full",
  },
  {
    id: "action",
    category: "form",
    tone: "accent",
    size: "label",
    space: "base",
    motion: "fade",
    radius: "full",
  },
  {
    id: "status-ok",
    category: "status",
    tone: "green",
    size: "caption",
    space: "tight",
    motion: "none",
    radius: "full",
  },
  {
    id: "status-warn",
    category: "status",
    tone: "yellow",
    size: "caption",
    space: "tight",
    motion: "none",
    radius: "full",
  },
  {
    id: "status-danger",
    category: "status",
    tone: "red",
    size: "caption",
    space: "tight",
    motion: "none",
    radius: "full",
  },
  {
    id: "empty",
    category: "empty",
    tone: "muted",
    size: "body",
    space: "loose",
    motion: "fade",
    radius: "lg",
  },
  {
    id: "skeleton",
    category: "motion",
    tone: "data-0",
    size: "caption",
    space: "base",
    motion: "pulse",
    radius: "sm",
  },
];

/** Категорії контенту — у порядку каталогу. */
export const ROLE_CATEGORIES: readonly RoleCategory[] = (
  Object.keys(texts.categories) as CategoryId[]
).map((id) => ({ id, ...texts.categories[id] }));

/** Ролі вигляду: ознаки з коду, слова — з JSON. */
export const STYLE_ROLES: readonly StyleRole[] = SHAPES.map((shape) => ({
  ...shape,
  label: texts.roles[shape.id as keyof typeof texts.roles].label,
  note: texts.roles[shape.id as keyof typeof texts.roles].note,
}));

/** Класи ролі: тон, розмір, відступ, рух і радіус — рівно з каталогу. */
export function roleClass(role: StyleRole): string {
  return [
    "sc-role",
    `sc-tone-${role.tone}`,
    `sc-size-${role.size}`,
    `sc-gap-${role.space}`,
    `sc-motion-${role.motion}`,
    `sc-radius-${role.radius}`,
  ].join(" ");
}

/** Ролі однієї категорії — у порядку каталогу. */
export function rolesIn(category: CategoryId): readonly StyleRole[] {
  return STYLE_ROLES.filter((role) => role.category === category);
}
