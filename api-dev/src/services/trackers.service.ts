/**
 * Трекери: стандартний набір при першому вході, власні трекери й дотики днів.
 *
 * Власника всюди дає підписаний `initData` (контролер), а не тіло запиту —
 * тому кожен запит звужений `owner_id = ?`, і чужий номер не бачить нічого.
 *
 * @module api-dev/src/services/trackers.service
 */

import { ensureTables } from "@wwwuabot/shared/database/ensure-tables";
import { formatSqliteDatetime } from "@wwwuabot/shared/utils/datetime";
import {
  TRACKER_CATALOG,
  todayTrackerDay,
  trackerMode,
  type Tracker,
  type TrackerEntry,
  type TrackerEntryRow,
  type TrackerFields,
} from "@wwwuabot/shared/trackers";
import type { Env } from "../shared/types";

interface TrackerRow {
  id: number;
  key: string;
  title: string;
  unit: string;
  step: number;
  goal: number | null;
  min_value: number;
  max_value: number | null;
  mode: string | null;
  icon: string;
  is_builtin: number;
}

/**
 * `COALESCE` — не перестраховка: колонку `mode` добрав `ensureTables`, тож у
 * рядків, старших за неї, там `NULL` (див. `docs/D1_OPS.md`, «М'яка схема»).
 */
const TRACKER_COLUMNS =
  "id, key, title, unit, step, goal, min_value, max_value, " +
  "COALESCE(mode, CASE WHEN goal IS NULL THEN 'read' ELSE 'sum' END) AS mode, icon, is_builtin";

function toTracker(row: TrackerRow): Tracker {
  return {
    id: Number(row.id),
    key: row.key,
    title: row.title,
    unit: row.unit,
    step: Number(row.step),
    goal: row.goal === null ? null : Number(row.goal),
    min: Number(row.min_value),
    max: row.max_value === null ? null : Number(row.max_value),
    mode: trackerMode({ key: row.key, goal: row.goal, mode: row.mode }),
    icon: (row.icon || "bar-chart") as Tracker["icon"],
    isBuiltin: Number(row.is_builtin) === 1,
  };
}

/**
 * Стандартні трекери сіються при **кожному** вході в стрічку.
 *
 * `INSERT OR IGNORE` + `UNIQUE (owner_id, key)` робить це ідемпотентним, а
 * прибраний трекер не воскресає: його ключ лишається зайнятим. Саме так
 * нові мірки каталогу доїжджають до наявних людей, а не лише до порожніх.
 */
async function seedTrackers(env: Env, userId: number): Promise<void> {
  const now = formatSqliteDatetime();
  const statements = TRACKER_CATALOG.map((tracker) =>
    env.DB.prepare(
      `INSERT OR IGNORE INTO trackers
         (owner_id, key, title, unit, step, goal, min_value, max_value, mode, icon, is_builtin, is_active, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, 1, ?)`,
    ).bind(
      String(userId),
      tracker.key,
      tracker.title,
      tracker.unit,
      tracker.step,
      tracker.goal,
      tracker.min,
      tracker.max,
      tracker.mode,
      tracker.icon,
      now,
    ),
  );
  await env.DB.batch(statements);
}

export async function listTrackers(env: Env, userId: number): Promise<Tracker[]> {
  await ensureTables(env.DB, ["trackers"]);
  await seedTrackers(env, userId);

  const rows = await env.DB.prepare(
    `SELECT ${TRACKER_COLUMNS} FROM trackers WHERE owner_id = ? AND is_active = 1 ORDER BY id`,
  )
    .bind(String(userId))
    .all<TrackerRow>();
  return (rows.results ?? []).map(toTracker);
}

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

export async function readTracker(env: Env, userId: number, id: number): Promise<Tracker | null> {
  const row = await env.DB.prepare(
    `SELECT ${TRACKER_COLUMNS} FROM trackers WHERE id = ? AND owner_id = ? AND is_active = 1`,
  )
    .bind(id, String(userId))
    .first<TrackerRow>();
  return row ? toTracker(row) : null;
}

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

/** Власний трекер: ключ внутрішній, людина його не бачить і не задає. */
export async function createTracker(
  env: Env,
  userId: number,
  fields: TrackerFields,
): Promise<Tracker | null> {
  const key = `own-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  await env.DB.prepare(
    `INSERT INTO trackers
       (owner_id, key, title, unit, step, goal, min_value, max_value, mode, icon, is_builtin, is_active, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'bar-chart', 0, 1, ?)`,
  )
    .bind(
      String(userId),
      key,
      fields.title,
      fields.unit,
      fields.step,
      fields.goal,
      fields.min,
      fields.max,
      fields.mode,
      formatSqliteDatetime(),
    )
    .run();
  const row = await env.DB.prepare(
    `SELECT ${TRACKER_COLUMNS} FROM trackers WHERE owner_id = ? AND key = ?`,
  )
    .bind(String(userId), key)
    .first<TrackerRow>();
  return row ? toTracker(row) : null;
}

/** Прибраний трекер лишається в базі разом з історією — лише зникає зі стрічки. */
export async function archiveTracker(env: Env, userId: number, id: number): Promise<boolean> {
  const result = await env.DB.prepare(
    "UPDATE trackers SET is_active = 0 WHERE id = ? AND owner_id = ? AND is_active = 1",
  )
    .bind(id, String(userId))
    .run();
  return Number(result.meta.changes) > 0;
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
