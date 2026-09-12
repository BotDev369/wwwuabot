/**
 * @wwwuabot/ui — спільний React-пакет для Page Builder.
 *
 * Використовується і `web/`, і `web-admin/`.
 * Містить реєстр блоків, рендерери, контроль доступу, діалоги та store.
 * Кількість блоків тут не дублюємо: джерело правди — `BLOCK_DEFINITIONS`
 * (`packages/shared/src/constants/block-definitions/`).
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
  BlockCategory,
} from "@wwwuabot/shared/types/page-config";
export {
  ALL_ZONES,
  createEmptyPageConfig,
  parsePageConfig,
  generateBlockId,
} from "@wwwuabot/shared/types/page-config";
export {
  BLOCK_DEFINITIONS,
  getBlockDefinition,
  getBlocksForZone,
  getBlocksByCategory,
  getAllCategories,
  getDefaultProps,
} from "@wwwuabot/shared/constants/block-definitions";

// --- Реєстр ---
export {
  registerBlock,
  getBlockComponent,
  getRegisteredTypes,
  isBlockRegistered,
} from "./registry";
export type { BlockComponent } from "./registry";

// --- Store ---
export { createPageStore } from "./store";
export type { PageStore } from "./store";

// --- Рендерери та захист ---
export { PageRenderer } from "./PageRenderer";
export { ZoneRenderer } from "./ZoneRenderer";
export { PermissionGate } from "./PermissionGate";
export type { PermissionGateProps } from "./PermissionGate";

// --- Блоки (окремий імпорт через @wwwuabot/ui/blocks) ---
// Для реєстрації: import { registerAllBlocks } from '@wwwuabot/ui/blocks';
