/**
 * Page Builder — типи для блочної системи сторінок.
 *
 * Сторінка = запис scenarios з колонкою `page_data` (JSON).
 * Зони = структурні регіони сторінки (sidebar, header, main, footer).
 * Блоки = автономні модулі всередині зон (рекурсивні).
 *
 * @module packages/shared/src/types/page-config
 */

// ---------------------------------------------------------------------------
// Зони сторінки
// ---------------------------------------------------------------------------

/** Структурні регіони сторінки. */
export type BlockZone = 'sidebar' | 'header' | 'main' | 'footer';

/** Усі зони як масив (для ітерації). */
export const ALL_ZONES: readonly BlockZone[] = [
  'sidebar',
  'header',
  'main',
  'footer',
] as const;

// ---------------------------------------------------------------------------
// Блок (рекурсивний)
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Умови показу блоку (permissions / conditional rendering)
// ---------------------------------------------------------------------------

/**
 * Умови показу блоку — перевіряються щодо профілю користувача.
 *
 * Всі умови поєднуються через AND (всі мають виконатися).
 * Масиви значень працюють як OR (значення користувача має бути в одному з масиву).
 */
export interface BlockConditions {
  /**
   * Роль користувача.
   * Якщо вказано — user.role має бути одним із значень.
   */
  role?: string[];

  /**
   * Тариф користувача.
   * Якщо вказано — user.tariff має бути одним із значень.
   */
  tariff?: string[];

  /**
   * Статус користувача.
   * Якщо вказано — user.status має бути одним із значень.
   */
  status?: string[];

  /**
   * Мінімальна знижка (%).
   * Якщо вказано — user.discount має бути >= цього значення.
   */
  minDiscount?: number;

  /**
   * Дозволи (permissions).
   * Якщо вказано — user.permissions має містити ВСІ вказані значення.
   */
  permissions?: string[];

  /**
   * Довільне поле користувача (深层 перевірка).
   * Ключ — шлях до поля з крапками (наприклад, "galyashop.active").
   * Значення — те, з чим порівнюється (string, number, boolean).
   */
  fieldMatch?: Record<string, string | number | boolean>;

  /**
   * Альтернативний блок, якщо умови НЕ виконуються.
   * Якщо не вказано — блок просто не рендериться.
   */
  fallback?: PageBlock;
}

// ---------------------------------------------------------------------------
// Користувач (розширений профіль для conditional rendering)
// ---------------------------------------------------------------------------

/**
 * Профіль користувача для системи conditional rendering.
 *
 * Містить всі поля, які використовуються у BlockConditions.
 * Передається в BlockContext.user.
 */
export interface UserProfile {
  id: number;
  firstName?: string;
  lastName?: string;
  username?: string;

  /** Роль користувача (наприклад: user, admin, moderator, vip). */
  role?: string;

  /** Тариф (наприклад: free, basic, pro, enterprise). */
  tariff?: string;

  /** Статус (наприклад: active, pending, suspended). */
  status?: string;

  /** Знижка у відсотках (0–100). */
  discount?: number;

  /** Дозволи (список ключів). */
  permissions?: string[];

  /** Мова користувача (uk, ru, en). */
  language?: string;

  /** Будь-які додаткові поля (galyashop, topics тощо). */
  [key: string]: unknown;
}

// ---------------------------------------------------------------------------
// Конфігурація сторінки (зберігається в D1 як JSON у колонці page_data)
// ---------------------------------------------------------------------------

/**
 * Повна конфігурація сторінки.
 *
 * Зберігається в колонці `page_data` таблиці `scenarios`.
 * Окрема від `rich_data`/`rich_message` (які для Telegram-бота).
 */
export interface PageConfig {
  /** Версія формату (для майбутніх міграцій). */
  version: number;

  /** Блоки по зонах. Кожна зона містить відсортований масив блоків. */
  zones: Record<BlockZone, PageBlock[]>;
}

// ---------------------------------------------------------------------------
// Контекст блоку
// ---------------------------------------------------------------------------

/**
 * Контекст, що передається в кожен блок при рендері.
 *
 * Містить інформацію про сторінку та користувача,
 * щоб блоки могли приймати рішення на основі даних.
 */
export interface BlockContext {
  /** Codeword поточної сторінки (slug для URL). */
  codeword: string;

  /** Назва сторінки. */
  title: string | null;

  /** URL фотографії сторінки (якщо є). */
  photoUrl: string | null;

  /**
   * Дані користувача (якщо доступні).
   * У web-admin може бути undefined (наприклад, при попередньому перегляді).
   */
  user?: UserProfile;

  /**
   * Додаткові дані, що передаються зі сторінки.
   * Наприклад, параметри URL, результати попередніх блоків.
   */
  extra?: Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// Визначення типу блоку (метадані для реєстру)
// ---------------------------------------------------------------------------

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
 *
 * Використовується для:
 * - Реєстрації блоків (який компонент рендерити)
 * - JSON-редактора у web-admin (яку форму генерувати)
 * - Валідації (JSON Schema)
 * - Галереї модулів (категоризація)
 */
export interface BlockDefinition {
  /** Унікальний ключ типу (відповідає PageBlock.type). */
  type: string;

  /** Людська назва для UI («Текст», «Зображення» тощо). */
  label: string;

  /** Короткий опис модуля. */
  description?: string;

  /** Іконка (назва іконки з реєстру icons.tsx). */
  icon?: string;

  /** Категорія для групування в галереї модулів. */
  category: BlockCategory;

  /**
   * Зони, в яких цей блок може використовуватись.
   * Порожній масив = блок доступний у всіх зонах.
   */
  compatibleZones: BlockZone[];

  /**
   * JSON Schema для валідації props блоку.
   * Використовується JSON-редактором для генерації форми.
   */
  schema: Record<string, unknown>;

  /** Дефолтні значення props (створюються при додаванні блоку). */
  defaultProps: Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// Block component props
// ---------------------------------------------------------------------------

/**
 * Пропси, що передаються в React-компонент блоку.
 *
 * Кожен компонент блоку отримує:
 * - `block` — дані блоку (type, props, children)
 * - `context` — контекст сторінки (codeword, user тощо)
 * - `zone` — зона, в якій знаходиться блок
 */
export interface BlockComponentProps {
  /** Дані блоку. */
  block: PageBlock;

  /** Контекст сторінки. */
  context: BlockContext;

  /** Зона, в якій рендериться блок. */
  zone: BlockZone;

  /**
   * Вкладені блоки (якщо є).
   * Рендеряться ZoneRenderer'ом автоматично.
   */
  children?: React.ReactNode;
}

// ---------------------------------------------------------------------------
// Допоміжні типи
// ---------------------------------------------------------------------------

/** Порожня конфігурація сторінки (дефолт при створенні нового сценарію). */
export function createEmptyPageConfig(): PageConfig {
  return {
    version: 1,
    zones: {
      sidebar: [],
      header: [],
      main: [],
      footer: [],
    },
  };
}

/**
 * Безпечний парсинг page_data з БД.
 * Підтримує два формати:
 * 1. Новий: { version: 1, zones: { sidebar, header, main, footer } }
 * 2. Старий: { v: 1, slots: { main: [...] } }
 * Повертає null при битих даних.
 */
export function parsePageConfig(raw: string | null): PageConfig | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return null;

    // Новий формат (Page Builder)
    if ('version' in parsed && 'zones' in parsed) {
      return parsed as PageConfig;
    }

    // Старий формат (web_config / slots) — конвертуємо
    if ('v' in parsed && 'slots' in parsed) {
      return convertOldFormat(parsed);
    }

    return null;
  } catch {
    return null;
  }
}

/**
 * Конвертує старий формат web_config у новий PageConfig.
 *
 * Старий: { v: 1, slots: { main: [{ component, props }] } }
 * Новий: { version: 1, zones: { sidebar: [], header: [], main: [...], footer: [] } }
 */
function convertOldFormat(old: Record<string, unknown>): PageConfig {
  const slots = (old.slots as Record<string, unknown[]>) ?? {};
  const mainItems = Array.isArray(slots.main) ? slots.main : [];

  const mainBlocks: PageBlock[] = mainItems.map((item, i) => {
    const entry = item as Record<string, unknown>;
    const component = String(entry.component ?? 'text');
    const props = (entry.props as Record<string, unknown>) ?? {};

    // Маппинг старих компонентів на нові типи блоків
    const typeMap: Record<string, string> = {
      Heading: 'text',
      Text: 'text',
      Button: 'buttons',
      Image: 'image',
      List: 'list',
      Divider: 'divider',
    };

    const type = typeMap[component] ?? 'text';

    // Конвертуємо props під формат нових блоків
    const convertedProps: Record<string, unknown> = {};
    if (component === 'Heading') {
      convertedProps.title = props.text ?? props.title ?? '';
      convertedProps.level = props.level ?? 'h2';
    } else if (component === 'Text') {
      convertedProps.content = props.text ?? props.content ?? '';
    } else if (component === 'Button') {
      convertedProps.items = [{
        text: String(props.label ?? props.text ?? ''),
        url: String(props.href ?? props.url ?? ''),
      }];
      convertedProps.layout = 'row';
    } else {
      // Інші компоненти — копіюємо props як є
      Object.assign(convertedProps, props);
    }

    return {
      id: generateBlockId(),
      type,
      order: i,
      props: convertedProps,
    };
  });

  return {
    version: 1,
    zones: {
      sidebar: [],
      header: [],
      main: mainBlocks,
      footer: [],
    },
  };
}

/**
 * Генерація UUID v4 (для id блоків).
 * Використовується при створенні нових блоків у конструкторі.
 */
export function generateBlockId(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

