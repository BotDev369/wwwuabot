/**
 * «Стіл»: як дані сервера стають тим, що видно на екрані (чисті маппінги).
 * Слів для людини немає — одиниці виміру приходять із `desk-labels.json`.
 *
 * @module web-admin-dev/src/pages/desk/desk-view
 */

import type { DeskEntry, DeskFile, DeskThread } from "@wwwuabot/shared/desk/model";
import { deskFileUrl } from "./desk.api";

export interface DeskFileView {
  id: number;
  name: string;
  size: string;
  url: string;
}

export interface DeskEntryView {
  id: number;
  author: string;
  kind: string;
  body: string;
  when: string;
  edited: boolean;
  files: DeskFileView[];
}

export interface DeskThreadView {
  id: number;
  group: string;
  subgroup: string;
  title: string;
  status: string;
  turn: string;
  tags: string[];
  due_at: string | null;
  priority: number;
  updated: string;
  entries: number;
  unread: number;
  archived: boolean;
}

export interface DeskRoomView {
  thread: DeskThreadView;
  entries: DeskEntryView[];
  /** Файли теми без запису — те, що прикріпили до самої теми. */
  files: DeskFileView[];
}

export interface DeskUnits {
  b: string;
  kb: string;
  mb: string;
}

/** Статус → клас бейджа: тон задає статус, а не місце в списку. */
export function statusTone(status: string): string {
  if (status === "done") return "wb-badge-green";
  if (status === "doing") return "wb-badge-accent";
  return "wb-badge-neutral";
}

/** Хід теми окремим бейджем: `turn` — не статус, його не змішують із ним. */
export function turnTone(turn: string): string {
  if (turn === "buffy" || turn === "serhii") return "wb-badge-yellow";
  return "wb-badge-neutral";
}

/** `2026-11-15 10:40:00` → `15.11 10:40`; невідомий формат лишається як є. */
export function formatWhen(value: string): string {
  if (!/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}/.test(value)) return value;
  return `${value.slice(8, 10)}.${value.slice(5, 7)} ${value.slice(11, 16)}`;
}

/** Розмір файлу людською мірою: до 1024 — байти, далі кіло, далі мега. */
export function formatBytes(bytes: number, units: DeskUnits): string {
  if (!Number.isFinite(bytes) || bytes < 0) return `0 ${units.b}`;
  if (bytes < 1024) return `${bytes} ${units.b}`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} ${units.kb}`;
  return `${(bytes / 1024 / 1024).toFixed(1).replace(".", ",")} ${units.mb}`;
}

export function toFileView(file: DeskFile, units: DeskUnits): DeskFileView {
  return {
    id: file.id,
    name: file.name,
    size: formatBytes(file.bytes, units),
    url: deskFileUrl(file.id),
  };
}

export function toThreadView(thread: DeskThread): DeskThreadView {
  return {
    id: thread.id,
    group: thread.group,
    subgroup: thread.subgroup,
    title: thread.title,
    status: thread.status,
    turn: thread.turn,
    tags: thread.tags,
    due_at: thread.due_at,
    priority: thread.priority,
    updated: formatWhen(thread.last_entry_at || thread.updated_at),
    entries: thread.entries,
    unread: thread.unread,
    archived: thread.archived,
  };
}

/** Стрічка + файли, розкладені по записах; «сирітські» файли — окремо. */
export function toRoomView(
  view: { thread: DeskThread; entries: DeskEntry[]; files: DeskFile[] },
  units: DeskUnits,
): DeskRoomView {
  const byEntry = new Map<number, DeskFileView[]>();
  const loose: DeskFileView[] = [];
  for (const file of view.files) {
    const mapped = toFileView(file, units);
    if (file.entry_id === null) {
      loose.push(mapped);
      continue;
    }
    const list = byEntry.get(file.entry_id) ?? [];
    list.push(mapped);
    byEntry.set(file.entry_id, list);
  }

  return {
    thread: toThreadView(view.thread),
    entries: view.entries.map((entry) => ({
      id: entry.id,
      author: entry.author,
      kind: entry.kind,
      body: entry.body,
      when: formatWhen(entry.created_at),
      edited: Boolean(entry.edited_at),
      files: byEntry.get(entry.id) ?? [],
    })),
    files: loose,
  };
}

/** Скільки тем у групі — число біля назви; `all` рахує суму. */
export function countByGroup(counts: Record<string, number>): number {
  return Object.values(counts).reduce((sum, value) => sum + value, 0);
}

/** Останній запис теми — до нього й позначаємо вичитане. */
export function lastEntryId(entries: DeskEntry[]): number {
  return entries.reduce((max, entry) => Math.max(max, entry.id), 0);
}
