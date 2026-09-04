/**
 * Page Builder — визначення всіх блоків (модулів) галереї.
 *
 * Це головний файл, який об'єднує всі категорії блоків та
 * експортує той самий API, що й оригінальний block-definitions.ts.
 *
 * Кожен запис описує один тип блоку:
 * - метадані (назва, іконка, категорія, сумісні зони)
 * - JSON Schema для валідації props
 * - дефолтні значення props
 *
 * Ці дані використовуються:
 * 1. Галереєю модулів у web-admin (категоризований вибір)
 * 2. JSON-редактором у web-admin для генерації форми
 * 3. Валідацією при збереженні page_data
 * 4. UI для вибору типу блоку при додаванні
 *
 * @module packages/shared/src/constants/block-definitions
 */

import type { BlockDefinition } from '../../types/page-config';

// ── Категорії блоків ──────────────────────────────────────────────
import { contentBlocks } from './content';
import { layoutBlocks } from './layout';
import { navigationBlocks } from './navigation';
import { dataBlocks } from './data';
import { commerceBlocks } from './commerce';
import { formsBlocks } from './forms';
import { botDomainBlocks } from './bot-domain';
import { analyticsBlocks } from './analytics';
import { rawBlocks } from './raw';

// ── Повний реєстр блоків — 29 типів, 9 категорій ──────────────────
export const BLOCK_DEFINITIONS: BlockDefinition[] = [
  ...contentBlocks,
  ...layoutBlocks,
  ...navigationBlocks,
  ...dataBlocks,
  ...commerceBlocks,
  ...formsBlocks,
  ...botDomainBlocks,
  ...analyticsBlocks,
  ...rawBlocks,
];

// ── Допоміжні функції ─────────────────────────────────────────────

/**
 * Отримати визначення блоку за типом.
 * Повертає undefined якщо тип не знайдено.
 */
export function getBlockDefinition(
  type: string,
): BlockDefinition | undefined {
  return BLOCK_DEFINITIONS.find((def) => def.type === type);
}

/**
 * Отримати всі блоки, сумісні з певною зоною.
 */
export function getBlocksForZone(
  zone: string,
): BlockDefinition[] {
  return BLOCK_DEFINITIONS.filter(
    (def) =>
      def.compatibleZones.length === 0 ||
      def.compatibleZones.includes(zone as never),
  );
}

/**
 * Отримати блоки за категорією.
 */
export function getBlocksByCategory(
  category: string,
): BlockDefinition[] {
  return BLOCK_DEFINITIONS.filter((def) => def.category === category);
}

/**
 * Отримати всі унікальні категорії.
 */
export function getAllCategories(): string[] {
  const cats = new Set(BLOCK_DEFINITIONS.map((def) => def.category));
  return Array.from(cats);
}

/**
 * Отримати дефолтні props для типу блоку.
 * Повертає глибоку копію, щоб зміни не впливали на оригінал.
 */
export function getDefaultProps(type: string): Record<string, unknown> {
  const def = getBlockDefinition(type);
  return def ? JSON.parse(JSON.stringify(def.defaultProps)) : {};
}
