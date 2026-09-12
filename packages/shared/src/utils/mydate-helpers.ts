/**
 * Спільні допоміжні функції та константи для "Моїх дат".
 *
 * Використовуються в web-platform-dev та packages/ui (MyDatesTableBlock).
 * Кожен споживач може розширити TYPE_CONFIG додатковими полями (icon, label тощо).
 *
 * @module packages/shared/src/utils/mydate-helpers
 */

import type { MyDate } from "../types/mydate";

// ── Tag Colors ──────────────────────────────────────────────────────

export const TAG_COLORS = [
  { color: "#b45309", bg: "#fef3c7" },
  { color: "#0e7490", bg: "#ecfeff" },
  { color: "#be185d", bg: "#fdf2f8" },
  { color: "#4338ca", bg: "#eef2ff" },
  { color: "#047857", bg: "#ecfdf5" },
  { color: "#c2410c", bg: "#fff7ed" },
  { color: "#7c3aed", bg: "#f5f3ff" },
  { color: "#0369a1", bg: "#f0f9ff" },
] as const;

/** Отримати колір тегу за хешем назви. */
export function getTagColor(tag: string): { color: string; bg: string } {
  let hash = 0;
  for (let i = 0; i < tag.length; i++) hash = tag.charCodeAt(i) + ((hash << 5) - hash);
  return TAG_COLORS[Math.abs(hash) % TAG_COLORS.length];
}

// ── Type Config (base — без icon/label, кожен споживач розширює) ────

interface TypeConfigBase {
  color: string;
  bg: string;
}

export const BASE_TYPE_CONFIG: Record<string, TypeConfigBase> = {
  person: { color: "#2563eb", bg: "#eff6ff" },
  event: { color: "#059669", bg: "#ecfdf5" },
  other: { color: "#7c3aed", bg: "#f5f3ff" },
};

export const BUILTIN_TYPES = ["person", "event", "other"];

export function getBaseTypeConfig(type: string): TypeConfigBase {
  return BASE_TYPE_CONFIG[type] ?? BASE_TYPE_CONFIG.other;
}

// ── Date Formatting ─────────────────────────────────────────────────

/** Форматувати дату з YYYY-MM-DD в DD.MM.YYYY. */
export function formatDate(raw: string): string {
  const parts = raw.split("-");
  if (parts.length !== 3) return raw;
  return `${parts[2]}.${parts[1]}.${parts[0]}`;
}

// ── Type Helpers ────────────────────────────────────────────────────

/** Отримати кастомні типи (не person/event/other). */
export function getCustomTypes(dates: MyDate[]): string[] {
  const custom = dates.map((d) => d.type).filter((t) => t && !BUILTIN_TYPES.includes(t));
  return [...new Set(custom)];
}

/** Отримати всі типи (built-in + кастомні). */
export function getAllTypes(dates: MyDate[]): string[] {
  return [...BUILTIN_TYPES, ...getCustomTypes(dates)];
}

// ── Field Labels ────────────────────────────────────────────────────

export type SortField = "date" | "type" | "name" | "tags" | "notes" | "created_at";

export function getFieldLabel(field: SortField): string {
  switch (field) {
    case "name":
      return "Назва";
    case "date":
      return "Дата";
    case "tags":
      return "Теги";
    case "type":
      return "Тип";
    case "notes":
      return "Примітки";
    case "created_at":
      return "Створено";
    default:
      return field;
  }
}
