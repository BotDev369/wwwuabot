/**
 * MyDate — спільні типи, константи та допоміжні функції.
 */

import type { IconName } from '@wwwuabot/shared';
import type { MyDate } from '@/shared/api/mydate.api';

// ── Types ─────────────────────────────────────────────────────────

export type SortField = 'date' | 'type' | 'name' | 'tags' | 'notes' | 'created_at';
export type SortOrder = 'asc' | 'desc';
export type ModalMode = 'create' | 'edit' | 'view';

// ── Constants ─────────────────────────────────────────────────────

export const TYPE_CONFIG: Record<string, { icon: IconName; color: string; bg: string }> = {
  person: { icon: 'users', color: '#2563eb', bg: '#eff6ff' },
  event: { icon: 'my-dates', color: '#059669', bg: '#ecfdf5' },
  other: { icon: 'info', color: '#7c3aed', bg: '#f5f3ff' },
};

const TAG_COLORS = [
  { color: '#b45309', bg: '#fef3c7' },
  { color: '#0e7490', bg: '#ecfeff' },
  { color: '#be185d', bg: '#fdf2f8' },
  { color: '#4338ca', bg: '#eef2ff' },
  { color: '#047857', bg: '#ecfdf5' },
  { color: '#c2410c', bg: '#fff7ed' },
  { color: '#7c3aed', bg: '#f5f3ff' },
  { color: '#0369a1', bg: '#f0f9ff' },
];

const BUILTIN_TYPES = ['person', 'event', 'other'];

// ── Helpers ───────────────────────────────────────────────────────

export function getTagColor(tag: string) {
  let hash = 0;
  for (let i = 0; i < tag.length; i++) hash = tag.charCodeAt(i) + ((hash << 5) - hash);
  return TAG_COLORS[Math.abs(hash) % TAG_COLORS.length];
}

export function getTypeConfig(type: string) {
  return TYPE_CONFIG[type] || TYPE_CONFIG.other;
}

export function formatDate(raw: string): string {
  const parts = raw.split('-');
  if (parts.length !== 3) return raw;
  return `${parts[2]}.${parts[1]}.${parts[0]}`;
}

export function getCustomTypes(dates: MyDate[]): string[] {
  const custom = dates.map((d) => d.type).filter((t) => t && !BUILTIN_TYPES.includes(t));
  return [...new Set(custom)];
}

export function getAllTypes(dates: MyDate[]): string[] {
  return [...BUILTIN_TYPES, ...getCustomTypes(dates)];
}

export function getFieldLabel(field: SortField): string {
  switch (field) {
    case 'name': return 'Назва';
    case 'date': return 'Дата';
    case 'tags': return 'Теги';
    case 'type': return 'Тип';
    case 'notes': return 'Примітки';
    case 'created_at': return 'Створено';
    default: return field;
  }
}
