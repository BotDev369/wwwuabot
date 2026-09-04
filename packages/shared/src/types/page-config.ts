/**
 * Page Builder — типи та утиліти для блочної системи сторінок.
 *
 * Це головний файл, який ре-експортує все з page-config.types.ts
 * та page-config.utils.ts для зворотної сумісності.
 *
 * @module packages/shared/src/types/page-config
 */

// ── Re-export types ───────────────────────────────────────────────
export type {
  BlockZone,
  PageBlock,
  BlockConditions,
  UserProfile,
  PageConfig,
  BlockContext,
  BlockCategory,
  BlockDefinition,
  BlockComponentProps,
} from './page-config.types';

// ── Re-export utils ───────────────────────────────────────────────
export {
  ALL_ZONES,
  createEmptyPageConfig,
  parsePageConfig,
  generateBlockId,
} from './page-config.utils';
