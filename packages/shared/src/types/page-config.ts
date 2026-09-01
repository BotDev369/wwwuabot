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
  user?: {
    id: number;
    firstName?: string;
    lastName?: string;
    username?: string;
    [key: string]: unknown;
  };

  /**
   * Додаткові дані, що передаються зі сторінки.
   * Наприклад, параметри URL, результати попередніх блоків.
   */
  extra?: Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// Визначення типу блоку (метадані для реєстру)
// ---------------------------------------------------------------------------

/**
 * Метадані одного типу блоку.
 *
 * Використовується для:
 * - Реєстрації блоків (який компонент рендерити)
 * - JSON-редактора у web-admin (яку форму генерувати)
 * - Валідації (JSON Schema)
 */
export interface BlockDefinition {
  /** Унікальний ключ типу (відповідає PageBlock.type). */
  type: string;

  /** Людська назва для UI («Текст», «Зображення» тощо). */
  label: string;

  /** Короткий опис модуля. */
  description?: string;

  /** Іконка (назва іконки або SVG-шлях). */
  icon?: string;

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

    // Конвертуємо props
    const convertedProps: Record<string, unknown> = { ...props };
    if (component === 'Heading' && props.text) {
      convertedProps.heading = props.text;
    }
    if (component === 'Text' && props.text) {
      convertedProps.text = props.text;
    }
    if (component === 'Button') {
      convertedProps.text = props.label ?? props.text ?? '';
      convertedProps.url = props.href ?? props.url ?? '';
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

