/**
 * Page Builder — Zustand store для керування конфігурацією сторінки.
 *
 * Цей store є page-level: один store на сторінку.
 * Всі блоки отримують стан через цей store.
 *
 * @module packages/ui/src/store
 */

import { create } from 'zustand';
import type {
  BlockZone,
  PageBlock,
  PageConfig,
} from '@wwwuabot/shared/types/page-config';
import { createEmptyPageConfig, generateBlockId } from '@wwwuabot/shared/types/page-config';
import { getDefaultProps } from '@wwwuabot/shared/constants/block-definitions';

// ---------------------------------------------------------------------------
// Стан store
// ---------------------------------------------------------------------------

interface PageStoreState {
  /** Поточна конфігурація сторінки. */
  config: PageConfig;

  /** Чи були зміни (для індикатора "є незбережені зміни"). */
  isDirty: boolean;

  /** Codeword поточної сторінки. */
  codeword: string | null;
}

// ---------------------------------------------------------------------------
// Дії store
// ---------------------------------------------------------------------------

interface PageStoreActions {
  /** Завантажити конфігурацію з БД. */
  loadConfig: (codeword: string, config: PageConfig) => void;

  /** Скинути store до порожнього стану. */
  reset: () => void;

  // --- Маніпуляції з блоками ---

  /** Додати новий блок у зону. */
  addBlock: (zone: BlockZone, type: string, afterIndex?: number) => string;

  /** Видалити блок за ID. */
  removeBlock: (zone: BlockZone, blockId: string) => void;

  /** Перемістити блок між зонами. */
  moveBlock: (
    fromZone: BlockZone,
    toZone: BlockZone,
    blockId: string,
    toIndex?: number,
  ) => void;

  /** Оновити props блоку. */
  updateBlockProps: (
    zone: BlockZone,
    blockId: string,
    props: Record<string, unknown>,
  ) => void;

  /** Змінити порядок блоків у зоні. */
  reorderBlocks: (zone: BlockZone, fromIndex: number, toIndex: number) => void;

  // --- Маніпуляції з дочірніми блоками ---

  /** Додати вкладений блок (дочірній). */
  addChildBlock: (
    parentZone: BlockZone,
    parentId: string,
    type: string,
    afterIndex?: number,
  ) => string;

  /** Видалити вкладений блок. */
  removeChildBlock: (
    parentZone: BlockZone,
    parentId: string,
    childId: string,
  ) => void;

  /** Оновити props вкладеного блоку. */
  updateChildBlockProps: (
    parentZone: BlockZone,
    parentId: string,
    childId: string,
    props: Record<string, unknown>,
  ) => void;

  // --- Стрімлайн ---

  /** Серіалізувати поточний стан у JSON (для збереження в D1). */
  serialize: () => string;

  /** Завантажити конфігурацію з JSON-рядка. */
  loadFromJson: (codeword: string, json: string) => void;
}

// ---------------------------------------------------------------------------
// Допоміжні: пошук блоку в рекурсивній структурі
// ---------------------------------------------------------------------------

/** Знайти блок та його батьківський масив у зоні. */
function findBlockInZone(
  blocks: PageBlock[],
  blockId: string,
): { block: PageBlock; parent: PageBlock[]; index: number } | null {
  for (let i = 0; i < blocks.length; i++) {
    if (blocks[i].id === blockId) {
      return { block: blocks[i], parent: blocks, index: i };
    }
    if (blocks[i].children) {
      const found = findBlockInZone(blocks[i].children!, blockId);
      if (found) return found;
    }
  }
  return null;
}

/** Знайти батьківський блок (щоб працювати з його children). */
function findParentBlock(
  blocks: PageBlock[],
  parentId: string,
): PageBlock | null {
  for (const block of blocks) {
    if (block.id === parentId) return block;
    if (block.children) {
      const found = findParentBlock(block.children, parentId);
      if (found) return found;
    }
  }
  return null;
}

// ---------------------------------------------------------------------------
// Глибоке клонування зони (імутабельність)
// ---------------------------------------------------------------------------

function cloneZones(
  zones: Record<BlockZone, PageBlock[]>,
): Record<BlockZone, PageBlock[]> {
  return {
    sidebar: JSON.parse(JSON.stringify(zones.sidebar)),
    header: JSON.parse(JSON.stringify(zones.header)),
    main: JSON.parse(JSON.stringify(zones.main)),
    footer: JSON.parse(JSON.stringify(zones.footer)),
  };
}

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

export type PageStore = PageStoreState & PageStoreActions;

export const createPageStore = create<PageStore>((set, get) => ({
  // --- Стан ---
  config: createEmptyPageConfig(),
  isDirty: false,
  codeword: null,

  // --- Завантаження ---
  loadConfig: (codeword, config) => {
    set({
      codeword,
      config: cloneZones(config.zones)
        ? { version: config.version, zones: cloneZones(config.zones) }
        : createEmptyPageConfig(),
      isDirty: false,
    });
  },

  reset: () => {
    set({
      config: createEmptyPageConfig(),
      isDirty: false,
      codeword: null,
    });
  },

  // --- Додати блок ---
  addBlock: (zone, type, afterIndex) => {
    const newId = generateBlockId();
    const newBlock: PageBlock = {
      id: newId,
      type,
      order: 0,
      props: getDefaultProps(type),
    };

    set((state) => {
      const zones = cloneZones(state.config.zones);
      const zoneBlocks = zones[zone];

      if (afterIndex !== undefined && afterIndex >= 0) {
        zoneBlocks.splice(afterIndex + 1, 0, newBlock);
      } else {
        zoneBlocks.push(newBlock);
      }

      // Перерахувати order
      zoneBlocks.forEach((b, i) => {
        b.order = i;
      });

      return {
        config: { ...state.config, zones },
        isDirty: true,
      };
    });

    return newId;
  },

  // --- Видалити блок ---
  removeBlock: (zone, blockId) => {
    set((state) => {
      const zones = cloneZones(state.config.zones);
      zones[zone] = zones[zone].filter((b) => b.id !== blockId);
      zones[zone].forEach((b, i) => {
        b.order = i;
      });
      return { config: { ...state.config, zones }, isDirty: true };
    });
  },

  // --- Перемістити блок між зонами ---
  moveBlock: (fromZone, toZone, blockId, toIndex) => {
    set((state) => {
      const zones = cloneZones(state.config.zones);

      // Знайти та видалити з оригінальної зони
      const blockIndex = zones[fromZone].findIndex((b) => b.id === blockId);
      if (blockIndex === -1) return state;

      const [block] = zones[fromZone].splice(blockIndex, 1);

      // Вставити в цільову зону
      if (toIndex !== undefined && toIndex >= 0) {
        zones[toZone].splice(toIndex, 0, block);
      } else {
        zones[toZone].push(block);
      }

      // Перерахувати order у обох зонах
      zones[fromZone].forEach((b, i) => {
        b.order = i;
      });
      zones[toZone].forEach((b, i) => {
        b.order = i;
      });

      return { config: { ...state.config, zones }, isDirty: true };
    });
  },

  // --- Оновити props блоку ---
  updateBlockProps: (zone, blockId, props) => {
    set((state) => {
      const zones = cloneZones(state.config.zones);
      const found = findBlockInZone(zones[zone], blockId);
      if (found) {
        found.block.props = { ...found.block.props, ...props };
      }
      return { config: { ...state.config, zones }, isDirty: true };
    });
  },

  // --- Пересортувати блоки ---
  reorderBlocks: (zone, fromIndex, toIndex) => {
    set((state) => {
      const zones = cloneZones(state.config.zones);
      const zoneBlocks = zones[zone];

      if (
        fromIndex < 0 ||
        fromIndex >= zoneBlocks.length ||
        toIndex < 0 ||
        toIndex >= zoneBlocks.length
      ) {
        return state;
      }

      const [moved] = zoneBlocks.splice(fromIndex, 1);
      zoneBlocks.splice(toIndex, 0, moved);
      zoneBlocks.forEach((b, i) => {
        b.order = i;
      });

      return { config: { ...state.config, zones }, isDirty: true };
    });
  },

  // --- Додати дочірній блок ---
  addChildBlock: (parentZone, parentId, type, afterIndex) => {
    const newId = generateBlockId();
    const newBlock: PageBlock = {
      id: newId,
      type,
      order: 0,
      props: getDefaultProps(type),
    };

    set((state) => {
      const zones = cloneZones(state.config.zones);
      const parent = findParentBlock(zones[parentZone], parentId);
      if (!parent) return state;

      if (!parent.children) parent.children = [];

      if (afterIndex !== undefined && afterIndex >= 0) {
        parent.children.splice(afterIndex + 1, 0, newBlock);
      } else {
        parent.children.push(newBlock);
      }

      parent.children.forEach((b, i) => {
        b.order = i;
      });

      return { config: { ...state.config, zones }, isDirty: true };
    });

    return newId;
  },

  // --- Видалити дочірній блок ---
  removeChildBlock: (parentZone, parentId, childId) => {
    set((state) => {
      const zones = cloneZones(state.config.zones);
      const parent = findParentBlock(zones[parentZone], parentId);
      if (!parent || !parent.children) return state;

      parent.children = parent.children.filter((b) => b.id !== childId);
      parent.children.forEach((b, i) => {
        b.order = i;
      });

      return { config: { ...state.config, zones }, isDirty: true };
    });
  },

  // --- Оновити props дочірнього блоку ---
  updateChildBlockProps: (parentZone, parentId, childId, props) => {
    set((state) => {
      const zones = cloneZones(state.config.zones);
      const parent = findParentBlock(zones[parentZone], parentId);
      if (!parent || !parent.children) return state;

      const child = parent.children.find((b) => b.id === childId);
      if (child) {
        child.props = { ...child.props, ...props };
      }

      return { config: { ...state.config, zones }, isDirty: true };
    });
  },

  // --- Серіалізація ---
  serialize: () => {
    const { config } = get();
    return JSON.stringify(config);
  },

  loadFromJson: (codeword, json) => {
    try {
      const parsed = JSON.parse(json) as PageConfig;
      set({
        codeword,
        config: cloneZones(parsed.zones)
          ? { version: parsed.version, zones: cloneZones(parsed.zones) }
          : createEmptyPageConfig(),
        isDirty: false,
      });
    } catch {
      set({
        codeword,
        config: createEmptyPageConfig(),
        isDirty: false,
      });
    }
  },
}));
