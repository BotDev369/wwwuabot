/**
 * Page Builder — типи для блочної системи сторінок.
 *
 * Цей файл містить ТІЛЬКИ інтерфейси та типи.
 * Допоміжні функції — у page-config.utils.ts.
 *
 * @module packages/shared/src/types/page-config.types
 */

// ── Зони сторінки ─────────────────────────────────────────────────

/** Структурні регіони сторінки. */
export type BlockZone = 'sidebar' | 'header' | 'main' | 'footer';

// ── Блок (рекурсивний) ────────────────────────────────────────────

/**
 * Один блок контенту всередині зони.
 *
 * Блоки є рекурсивними: будь-який блок може мати `children` з інших блоків,
 * що дозволяє необмежену глибину вкладеності.
 */
export interface PageBlock {
  /** Унікальний ідентифікатор блоку (UUID v4). */
  id: string;

  /**
   * Тип модуля — ключ у реєстрі блоків.
   * Наприклад: 'text', 'image', 'buttons', 'list', 'divider', 'custom'.
   */
  type: string;

  /** Позиція блоку в межах зони (починається з 0). */
  order: number;

  /** Конфігурація модуля (залежить від типу). */
  props: Record<string, unknown>;

  /**
   * Вкладені блоки (необов'язково).
   * Рекурсивна структура — кожен вкладений блок теж може мати children.
   */
  children?: PageBlock[];

  /**
   * Умови показу блоку (необов'язково).
   * Якщо не вказано — блок показується завжди.
   * Якщо вказано — блок показується тільки коли ВСІ умови виконуються.
   */
  conditions?: BlockConditions;
}

// ── Умови показу блоку ────────────────────────────────────────────

/**
 * Умови показу блоку — перевіряються щодо профілю користувача.
 *
 * Всі умови поєднуються через AND (всі мають виконатися).
 * Масиви значень працюють як OR (значення користувача має бути в одному з масиву).
 */
export interface BlockConditions {
  /** Роль користувача. */
  role?: string[];

  /** Тариф користувача. */
  tariff?: string[];

  /** Статус користувача. */
  status?: string[];

  /** Мінімальна знижка (%). */
  minDiscount?: number;

  /** Дозволи (permissions). */
  permissions?: string[];

  /** Довільне поле користувача (深层 перевірка). */
  fieldMatch?: Record<string, string | number | boolean>;

  /** Альтернативний блок, якщо умови НЕ виконуються. */
  fallback?: PageBlock;
}

// ── Користувач (розширений профіль) ───────────────────────────────

/**
 * Профіль користувача для системи conditional rendering.
 */
export interface UserProfile {
  id: number;
  firstName?: string;
  lastName?: string;
  username?: string;
  role?: string;
  tariff?: string;
  status?: string;
  discount?: number;
  permissions?: string[];
  language?: string;
  [key: string]: unknown;
}

// ── Конфігурація сторінки ─────────────────────────────────────────

/**
 * Повна конфігурація сторінки.
 *
 * Зберігається в колонці `page_data` таблиці `scenarios`.
 */
export interface PageConfig {
  /** Версія формату (для майбутніх міграцій). */
  version: number;

  /** Блоки по зонах. */
  zones: Record<BlockZone, PageBlock[]>;

  /** Зони, які користувач явно додав (видимі в конструкторі). */
  visibleZones?: BlockZone[];
}

// ── Контекст блоку ────────────────────────────────────────────────

/**
 * Контекст, що передається в кожен блок при рендері.
 */
export interface BlockContext {
  /** Codeword поточної сторінки (slug для URL). */
  codeword: string;

  /** Назва сторінки. */
  title: string | null;

  /** URL фотографії сторінки (якщо є). */
  photoUrl: string | null;

  /** Дані користувача (якщо доступні). */
  user?: UserProfile;

  /** Додаткові дані, що передаються зі сторінки. */
  extra?: Record<string, unknown>;
}

// ── Визначення типу блоку ─────────────────────────────────────────

/** Категорії блоків для галереї модулів. */
export type BlockCategory =
  | 'content'
  | 'layout'
  | 'navigation'
  | 'data'
  | 'commerce'
  | 'forms'
  | 'bot-domain'
  | 'analytics'
  | 'raw';

/**
 * Метадані одного типу блоку.
 */
export interface BlockDefinition {
  /** Унікальний ключ типу (відповідає PageBlock.type). */
  type: string;

  /** Людська назва для UI. */
  label: string;

  /** Короткий опис модуля. */
  description?: string;

  /** Іконка (назва іконки з реєстру icons.tsx). */
  icon?: string;

  /** Категорія для групування в галереї модулів. */
  category: BlockCategory;

  /** Зони, в яких цей блок може використовуватись. */
  compatibleZones: BlockZone[];

  /** JSON Schema для валідації props блоку. */
  schema: Record<string, unknown>;

  /** Дефолтні значення props. */
  defaultProps: Record<string, unknown>;
}

// ── Block component props ──────────────────────────────────────────

/**
 * Пропси, що передаються в React-компонент блоку.
 */
export interface BlockComponentProps {
  /** Дані блоку. */
  block: PageBlock;

  /** Контекст сторінки. */
  context: BlockContext;

  /** Зона, в якій рендериться блок. */
  zone: BlockZone;

  /** Вкладені блоки (якщо є). */
  children?: React.ReactNode;
}
