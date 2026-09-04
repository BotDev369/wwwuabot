/**
 * Page Builder — допоміжні функції для роботи з конфігурацією сторінки.
 *
 * @module packages/shared/src/types/page-config.utils
 */

import type { BlockZone, PageBlock, PageConfig } from './page-config.types';

// ── Константи ─────────────────────────────────────────────────────

/** Усі зони як масив (для ітерації). */
export const ALL_ZONES: readonly BlockZone[] = [
  'sidebar',
  'header',
  'main',
  'footer',
] as const;

// ── Функції ───────────────────────────────────────────────────────

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
    visibleZones: [],
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
 */
export function generateBlockId(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}
