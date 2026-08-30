/**
 * @wwwuabot/ui — спільний React-пакет для Page Builder.
 *
 * Використовується і `web/`, і `web-admin/`.
 * Містить реєстр блоків, рендерери та store.
 *
 * @module @wwwuabot/ui
 */

// --- Типи (ре-експорт з shared) ---
export type {
  BlockZone,
  PageBlock,
  PageConfig,
  BlockContext,
  BlockDefinition,
  BlockComponentProps,
} from '@wwwuabot/shared/types/page-config';

export { ALL_ZONES, createEmptyPageConfig, parsePageConfig, generateBlockId } from '@wwwuabot/shared/types/page-config';

export { BLOCK_DEFINITIONS, getBlockDefinition, getBlocksForZone, getDefaultProps } from '@wwwuabot/shared/constants/block-definitions';

// --- Реєстр ---
export {
  registerBlock,
  getBlockComponent,
  getRegisteredTypes,
  isBlockRegistered,
} from './registry';
export type { BlockComponent } from './registry';

// --- Store ---
export { createPageStore } from './store';
export type { PageStore } from './store';

// --- Рендерери ---
export { PageRenderer } from './PageRenderer';
export { ZoneRenderer } from './ZoneRenderer';

// --- Блоки (окремий імпорт через @wwwuabot/ui/blocks) ---
// Для реєстрації: import { registerAllBlocks } from '@wwwuabot/ui/blocks';
