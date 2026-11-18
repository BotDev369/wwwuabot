/**
 * Каталог ролей вигляду: одна карта стилю на кожну роль контенту.
 *
 * **Навіщо.** Сторінка, модалка й меню не описують, як вони виглядають: вони
 * називають категорію й роль, а колір, розмір, відступ, радіус і рух беруться
 * звідси. Нова сторінка = тексти в базі + роль із цього списку.
 *
 * **Чому дані, а не класи в розмітці.** Один і той самий `sc-tone-data-3` на
 * десяти екранах означає одне: третя серія даних. Зміна палітри — правка
 * `role-catalog.css`, а не пошук кольору по файлах.
 *
 * @module packages/shared/src/ui/role-catalog
 */

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

/** Категорії контенту. Порядок — як на демо-сторінці. */
export const ROLE_CATEGORIES: readonly RoleCategory[] = [
  { id: "hero", label: "Гасло", note: "назва продукту й підзаголовок" },
  { id: "surface", label: "Поверхні", note: "картки, панелі, смуги" },
  { id: "nav", label: "Навігація", note: "меню, вкладки, шляхи" },
  { id: "data", label: "Дані", note: "показники, таблиці, списки" },
  { id: "chart", label: "Графіки", note: "серії, смуги, кільця, легенди" },
  { id: "form", label: "Форми", note: "поля, перемикачі, кнопки" },
  { id: "status", label: "Статуси", note: "стани й попередження" },
  { id: "empty", label: "Порожній стан", note: "коли даних ще немає" },
  { id: "motion", label: "Рух", note: "поява, пульс, скелетон" },
];

/**
 * Ролі вигляду. Кожна — одна річ на екрані: не «заголовок узагалі», а
 * «заголовок картки даних», бо саме від ролі залежить колір.
 */
export const STYLE_ROLES: readonly StyleRole[] = [
  {
    id: "hero-display",
    category: "hero",
    label: "Гасло продукту",
    tone: "ink",
    size: "display",
    space: "loose",
    motion: "rise",
    radius: "none",
    note: "Назва — найбільше на екрані, 38 px, вага 900",
  },
  {
    id: "hero-lead",
    category: "hero",
    label: "Пояснення гасла",
    tone: "muted",
    size: "body",
    space: "base",
    motion: "rise",
    radius: "none",
    note: "Дрібний опис під назвою, не конкурує з нею",
  },
  {
    id: "card",
    category: "surface",
    label: "Картка",
    tone: "ink",
    size: "body",
    space: "base",
    motion: "rise",
    radius: "lg",
    note: "Поверхня з власною серією кольору в заголовку",
  },
  {
    id: "panel-strip",
    category: "surface",
    label: "Смуга-підсумок",
    tone: "muted",
    size: "label",
    space: "tight",
    motion: "fade",
    radius: "md",
    note: "Тонка поверхня між блоками, без власного заголовка",
  },
  {
    id: "nav-item",
    category: "nav",
    label: "Пункт меню",
    tone: "ink",
    size: "label",
    space: "tight",
    motion: "fade",
    radius: "full",
    note: "Активний пункт бере акцент, решта — основний текст",
  },
  {
    id: "tab",
    category: "nav",
    label: "Вкладка",
    tone: "muted",
    size: "caption",
    space: "tight",
    motion: "none",
    radius: "full",
    note: "Вибір усередині екрана, окремо від меню",
  },
  {
    id: "kpi",
    category: "data",
    label: "Показник",
    tone: "data-3",
    size: "number",
    space: "tight",
    motion: "fade",
    radius: "md",
    note: "Число — колір своєї серії, підпис — сірий капс",
  },
  {
    id: "row-lead",
    category: "data",
    label: "Перша колонка таблиці",
    tone: "ink",
    size: "body",
    space: "none",
    motion: "none",
    radius: "none",
    note: "Закріплена: видно, коли таблиця їде вбік",
  },
  {
    id: "row-cell",
    category: "data",
    label: "Комірка таблиці",
    tone: "muted",
    size: "label",
    space: "none",
    motion: "none",
    radius: "none",
    note: "Текст комірки — другий рівень, без кольору серії",
  },
  {
    id: "series",
    category: "chart",
    label: "Серія графіка",
    tone: "data-5",
    size: "caption",
    space: "tight",
    motion: "rise",
    radius: "full",
    note: "Колір серії фарбує смугу, число й легенду однаково",
  },
  {
    id: "series-neutral",
    category: "chart",
    label: "Нейтральна серія",
    tone: "data-0",
    size: "caption",
    space: "tight",
    motion: "fade",
    radius: "full",
    note: "«Інше», «скасоване», «приховане» — сірий, не акцент",
  },
  {
    id: "field",
    category: "form",
    label: "Поле вводу",
    tone: "ink",
    size: "body",
    space: "base",
    motion: "none",
    radius: "md",
    note: "Підпис згори, підказка знизу, межа — токен поля",
  },
  {
    id: "switch",
    category: "form",
    label: "Перемикач",
    tone: "accent",
    size: "label",
    space: "tight",
    motion: "none",
    radius: "full",
    note: "Стан триває: увімкнено / вимкнено, без галочки",
  },
  {
    id: "action",
    category: "form",
    label: "Головна дія",
    tone: "accent",
    size: "label",
    space: "base",
    motion: "fade",
    radius: "full",
    note: "Акцент — тільки дія, ніколи не дані",
  },
  {
    id: "status-ok",
    category: "status",
    label: "Успіх",
    tone: "green",
    size: "caption",
    space: "tight",
    motion: "none",
    radius: "full",
    note: "Зміст, а не серія: «активний», «оплачено»",
  },
  {
    id: "status-warn",
    category: "status",
    label: "Увага",
    tone: "yellow",
    size: "caption",
    space: "tight",
    motion: "none",
    radius: "full",
    note: "Те саме, що успіх, але про незавершене",
  },
  {
    id: "status-danger",
    category: "status",
    label: "Небезпека",
    tone: "red",
    size: "caption",
    space: "tight",
    motion: "none",
    radius: "full",
    note: "Помилка або видалення — лише за змістом",
  },
  {
    id: "empty",
    category: "empty",
    label: "Порожній стан",
    tone: "muted",
    size: "body",
    space: "loose",
    motion: "fade",
    radius: "lg",
    note: "Пояснює, чому порожньо, і дає одну дію",
  },
  {
    id: "skeleton",
    category: "motion",
    label: "Завантаження",
    tone: "data-0",
    size: "caption",
    space: "base",
    motion: "pulse",
    radius: "sm",
    note: "Місце під контент, який ще їде",
  },
];

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
