/**
 * Трекери: стандартний набір при першому вході, власні трекери й записи днів.
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
  icon: string;
  is_builtin: number;
}

const TRACKER_COLUMNS = "id, key, title, unit, step, goal, min_value, max_value, icon, is_builtin";

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
    icon: (row.icon || "bar-chart") as Tracker["icon"],
    isBuiltin: Number(row.is_builtin) === 1,
  };
}

/**
 * Стандартні трекери створюються при **першому** вході.
 *
 * `INSERT OR IGNORE` + `UNIQUE (owner_id, key)` робить це ідемпотентним, а
 * прибраний трекер не воскресає: його ключ лишається зайнятим.
 */
async function seedTrackers(env: Env, userId: number): Promise<void> {
  const now = formatSqliteDatetime();
  const statements = TRACKER_CATALOG.map((tracker) =>
    env.DB.prepare(
      `INSERT OR IGNORE INTO trackers
         (owner_id, key, title, unit, step, goal, min_value, max_value, icon, is_builtin, is_active, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, 1, ?)`,
    ).bind(
      String(userId),
      tracker.key,
      tracker.title,
      tracker.unit,
      tracker.step,
      tracker.goal,
      tracker.min,
      tracker.max,
      tracker.icon,
      now,
    ),
  );
  await env.DB.batch(statements);
}

export async function listTrackers(env: Env, userId: number): Promise<Tracker[]> {
  await ensureTables(env.DB, ["trackers"]);
  const count = await env.DB.prepare("SELECT COUNT(*) AS total FROM trackers WHERE owner_id = ?")
    .bind(String(userId))
    .first<{ total: number }>();
  if (Number(count?.total ?? 0) === 0) await seedTrackers(env, userId);

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
    `SELECT tracker_id, day, value, note FROM tracker_entries
     WHERE owner_id = ? AND day >= ? ORDER BY day`,
  )
    .bind(String(userId), since)
    .all<{ tracker_id: number; day: string; value: number; note: string | null }>();
  return (rows.results ?? []).map((row) => ({
    trackerId: Number(row.tracker_id),
    day: row.day,
    value: Number(row.value),
    note: row.note ?? "",
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
    `SELECT day, value, note FROM tracker_entries
     WHERE owner_id = ? AND tracker_id = ? AND day >= ? ORDER BY day`,
  )
    .bind(String(userId), trackerId, since)
    .all<{ day: string; value: number; note: string | null }>();
  return (rows.results ?? []).map((row) => ({
    day: row.day,
    value: Number(row.value),
    note: row.note ?? "",
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
       (owner_id, key, title, unit, step, goal, min_value, max_value, icon, is_builtin, is_active, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'bar-chart', 0, 1, ?)`,
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

/** Один день — один запис: повторне збереження правит той самий рядок. */
export async function saveTrackerEntry(
  env: Env,
  userId: number,
  trackerId: number,
  day: string,
  value: number,
  note: string,
): Promise<boolean> {
  if (!(await readTracker(env, userId, trackerId))) return false;
  await env.DB.prepare(
    `INSERT INTO tracker_entries (tracker_id, owner_id, day, value, note, updated_at)
     VALUES (?, ?, ?, ?, ?, ?)
     ON CONFLICT(tracker_id, day) DO UPDATE SET
       value = excluded.value, note = excluded.note, updated_at = excluded.updated_at`,
  )
    .bind(trackerId, String(userId), day, value, note, formatSqliteDatetime())
    .run();
  return true;
}

export async function removeTrackerEntry(
  env: Env,
  userId: number,
  trackerId: number,
  day: string,
): Promise<boolean> {
  const result = await env.DB.prepare(
    "DELETE FROM tracker_entries WHERE owner_id = ? AND tracker_id = ? AND day = ?",
  )
    .bind(String(userId), trackerId, day)
    .run();
  return Number(result.meta.changes) > 0;
}
