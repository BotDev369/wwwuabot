/**
 * Page Builder — реєстр React-компонентів блоків.
 *
 * Карта type → React-компонент.
 * Рендерер шукає компонент за типом блоку і рендерить його.
 *
 * @module packages/ui/src/registry
 */

import type { ComponentType } from 'react';
import type { BlockComponentProps } from '@wwwuabot/shared/types/page-config';

// Тип компонента блоку
export type BlockComponent = ComponentType<BlockComponentProps>;

// Реєстр: type → компонент
const registry = new Map<string, BlockComponent>();

/**
 * Зареєструвати компонент блоку.
 * Викликається при ініціалізації (або lazy при завантаженні).
 */
export function registerBlock(type: string, component: BlockComponent): void {
  registry.set(type, component);
}

/**
 * Отримати компонент блоку за типом.
 * Повертає undefined якщо тип не зареєстровано.
 */
export function getBlockComponent(type: string): BlockComponent | undefined {
  return registry.get(type);
}

/**
 * Отримати всі зареєстровані типи блоків.
 */
export function getRegisteredTypes(): string[] {
  return Array.from(registry.keys());
}

/**
 * Перевірити, чи зареєстрований блок з таким типом.
 */
export function isBlockRegistered(type: string): boolean {
  return registry.has(type);
}
