/**
 * MyDate — типи та константи для "Моїх дат".
 * Базові хелпери імпортуються з packages/shared.
 */

import type { IconName } from '@wwwuabot/shared';
import type { MyDate } from '@wwwuabot/shared/types/mydate';
import {
  getTagColor as getTagColorBase,
  BASE_TYPE_CONFIG,
  formatDate as sharedFormatDate,
  getCustomTypes,
  getAllTypes as sharedGetAllTypes,
  getFieldLabel as sharedGetFieldLabel,
  type SortField,
} from '@wwwuabot/shared/utils/mydate-helpers';

// Re-export shared types
export type { SortField };
export type ModalMode = 'create' | 'edit' | 'view';
export type SortOrder = 'asc' | 'desc';

// Re-export shared helpers
export const formatDate = sharedFormatDate;
export const getTagColor = getTagColorBase;
export const getFieldLabel = sharedGetFieldLabel;
export { getCustomTypes };

// ── Web-platform specific: TYPE_CONFIG with icon ──

export const TYPE_CONFIG: Record<string, { icon: IconName; color: string; bg: string }> = {
  person: { icon: 'users', ...BASE_TYPE_CONFIG.person },
  event: { icon: 'my-dates', ...BASE_TYPE_CONFIG.event },
  other: { icon: 'info', ...BASE_TYPE_CONFIG.other },
};

export function getTypeConfig(type: string) {
  return TYPE_CONFIG[type] || TYPE_CONFIG.other;
}

export function getAllTypes(dates: MyDate[]): string[] {
  return sharedGetAllTypes(dates);
}
