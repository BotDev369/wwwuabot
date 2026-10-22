/**
 * Дотики днів: читання вікна й новий вимір. Окремо від трекерів, бо це інша
 * річ — рядок трекера описує мірку, а рядок `tracker_entries` — саму подію;
 * день і момент ставить сервер (`docs/TRACKERS.md`).
 *
 * @module api-dev/src/services/trackers-entries
 */

import { formatSqliteDatetime } from "@wwwuabot/shared/utils/datetime";
import {
  todayTrackerDay,
  type TrackerEntry,
  type TrackerEntryRow,
} from "@wwwuabot/shared/trackers";
import type { Env } from "../shared/types";
import { readTracker } from "./trackers.service";

/** Записи вікна для стрічки: одна вибірка на всі трекери людини. */
export async function listEntries(
  env: Env,
  userId: number,
  since: string,
): Promise<TrackerEntryRow[]> {
  const rows = await env.DB.prepare(
    `SELECT id, tracker_id, day, value, note, COALESCE(logged_at, updated_at) AS logged_at
     FROM tracker_entries
     WHERE owner_id = ? AND day >= ? ORDER BY day, logged_at, id`,
  )
    .bind(String(userId), since)
    .all<{
      id: number;
      tracker_id: number;
      day: string;
      value: number;
      note: string | null;
      logged_at: string | null;
    }>();
  return (rows.results ?? []).map((row) => ({
    id: Number(row.id),
    trackerId: Number(row.tracker_id),
    day: row.day,
    value: Number(row.value),
    note: row.note ?? "",
    loggedAt: row.logged_at,
  }));
}

/** Історія одного трекера за вікно — те саме зведення, що й на картці. */
export async function readTrackerEntries(
  env: Env,
  userId: number,
  trackerId: number,
  since: string,
): Promise<TrackerEntry[]> {
  const rows = await env.DB.prepare(
    `SELECT id, day, value, note, COALESCE(logged_at, updated_at) AS logged_at
     FROM tracker_entries
     WHERE owner_id = ? AND tracker_id = ? AND day >= ? ORDER BY day, logged_at, id`,
  )
    .bind(String(userId), trackerId, since)
    .all<{
      id: number;
      day: string;
      value: number;
      note: string | null;
      logged_at: string | null;
    }>();
  return (rows.results ?? []).map((row) => ({
    id: Number(row.id),
    day: row.day,
    value: Number(row.value),
    note: row.note ?? "",
    loggedAt: row.logged_at,
  }));
}

/**
 * Новий запис — **новий рядок**, не правка: міра стається зараз, і двоє
 * зважувань за день — два виміри. Ні день, ні момент не приходить від клієнта:
 * клієнтський годинник не є джерелом істини, а день — лише кошик для денних
 * сум (вода, кроки).
 */
export async function insertTrackerEntry(
  env: Env,
  userId: number,
  trackerId: number,
  value: number,
  note: string,
): Promise<TrackerEntry | null> {
  if (!(await readTracker(env, userId, trackerId))) return null;
  const now = formatSqliteDatetime();
  const day = todayTrackerDay();
  const result = await env.DB.prepare(
    `INSERT INTO tracker_entries (tracker_id, owner_id, day, value, note, logged_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
  )
    .bind(trackerId, String(userId), day, value, note, now, now)
    .run();
  const id = Number(result.meta.last_row_id ?? 0);
  return id > 0 ? { id, day, value, note, loggedAt: now } : null;
}

/** Один дотик — один рядок; чужий номер запису не існує (власник у WHERE). */
export async function removeTrackerEntry(
  env: Env,
  userId: number,
  entryId: number,
): Promise<boolean> {
  const result = await env.DB.prepare("DELETE FROM tracker_entries WHERE owner_id = ? AND id = ?")
    .bind(String(userId), entryId)
    .run();
  return Number(result.meta.changes) > 0;
}
