/**
 * Constants for MyDatesTable block — re-exports from shared + block-specific extensions.
 */

import {
  TAG_COLORS as SHARED_TAG_COLORS,
  getTagColor as getTagColorBase,
  BASE_TYPE_CONFIG,
  BUILTIN_TYPES,
  formatDate as sharedFormatDate,
  type SortField,
} from "@wwwuabot/shared/utils/mydate-helpers";

// Re-export shared
export { BUILTIN_TYPES, sharedFormatDate as formatDate };
export type { SortField };

export const TAG_COLORS = SHARED_TAG_COLORS;

// ── Block-specific type config (додає label для UI) ──

export const TYPE_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  person: { label: "Людина", ...BASE_TYPE_CONFIG.person },
  event: { label: "Подія", ...BASE_TYPE_CONFIG.event },
  other: { label: "Інше", ...BASE_TYPE_CONFIG.other },
};

export function getTagColor(tag: string): { color: string; bg: string } {
  return getTagColorBase(tag);
}

export function getTypeConfig(type: string): { label: string; color: string; bg: string } {
  return TYPE_CONFIG[type] ?? TYPE_CONFIG.other;
}
