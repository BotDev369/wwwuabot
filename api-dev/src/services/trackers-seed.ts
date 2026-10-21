/**
 * Сів стандартного набору трекерів і мапінг рядка бази в доменну мірку.
 * Окремо від сервісу, бо це **завдання на вхід**, а не поведінка: сів іде
 * при кожному вході в стрічку, його не місце серед читань і записів.
 *
 * @module api-dev/src/services/trackers-seed
 */

import { formatSqliteDatetime } from "@wwwuabot/shared/utils/datetime";
import {
  TRACKER_CATALOG,
  TRACKER_CATALOG_GROUPS,
  trackerMode,
  trackerValueType,
  type Tracker,
} from "@wwwuabot/shared/trackers";
import type { Env } from "../shared/types";

export interface TrackerRow {
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
  group_id: number | null;
  value_type: string | null;
  is_builtin: number;
}

/**
 * `COALESCE` — не перестраховка: колонку `mode` добрав `ensureTables`, тож у
 * рядків, старших за неї, там `NULL` (див. `docs/D1_OPS.md`, «М'яка схема»).
 * `value_type` — та сама історія: старі рядки й сів без явного значення
 * читаються як «число». `group_id` іде без `COALESCE` навмисно: `NULL` — це
 * осмислений стан «ще не віднесено», а не старий рядок.
 */
export const TRACKER_COLUMNS =
  "id, key, title, unit, step, goal, min_value, max_value, " +
  "COALESCE(mode, CASE WHEN goal IS NULL THEN 'read' ELSE 'sum' END) AS mode, " +
  "COALESCE(value_type, 'number') AS value_type, icon, group_id, is_builtin";

export function toTracker(row: TrackerRow): Tracker {
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
    valueType: trackerValueType({ valueType: row.value_type }),
    icon: (row.icon || "bar-chart") as Tracker["icon"],
    groupId: row.group_id === null ? null : Number(row.group_id),
    isBuiltin: Number(row.is_builtin) === 1,
  };
}

/**
 * Тематики каталогу сіються при кожному вході так само, як і трекери:
 * `INSERT OR IGNORE` + `UNIQUE (owner_id, key)` — ідемпотентно, перейменована
 * людиною група не повертається, прибрана — не воскресає. Повертає карту
 * «ключ → id рядка» — вона й прив'язує трекери до своїх тематик.
 */
export async function seedGroups(env: Env, userId: number): Promise<Map<string, number>> {
  const now = formatSqliteDatetime();
  await env.DB.batch(
    TRACKER_CATALOG_GROUPS.map((group) =>
      env.DB.prepare(
        `INSERT OR IGNORE INTO tracker_groups (owner_id, key, parent_id, title, created_at)
         VALUES (?, ?, NULL, ?, ?)`,
      ).bind(String(userId), group.key, group.title, now),
    ),
  );
  const rows = await env.DB.prepare(
    `SELECT id, key FROM tracker_groups WHERE owner_id = ? AND key IS NOT NULL ORDER BY id`,
  )
    .bind(String(userId))
    .all<{ id: number; key: string }>();
  return new Map((rows.results ?? []).map((row) => [row.key, Number(row.id)]));
}

/**
 * Стандартні трекери сіються при **кожному** вході — `INSERT OR IGNORE` за
 * `UNIQUE (owner_id, key)`: ідемпотентно, а прибраний не воскресає (ключ
 * лишається зайнятим) — так нові мірки каталогу доїжджають до наявних людей.
 * Прив'язка до тематики — `UPDATE … WHERE group_id IS NULL`: тільки рядки,
 * які людина ще не поклала в групу сама, — пересунутий трекер свій вибір
 * зберігає (див. `docs/TRACKERS.md`).
 */
export async function seedTrackers(
  env: Env,
  userId: number,
  groups: Map<string, number>,
): Promise<void> {
  const now = formatSqliteDatetime();
  const statements = TRACKER_CATALOG.map((tracker) =>
    env.DB.prepare(
      `INSERT OR IGNORE INTO trackers
         (owner_id, key, title, unit, step, goal, min_value, max_value, mode, icon, group_id, is_builtin, is_active, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, 1, ?)`,
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
      groups.get(tracker.groupKey) ?? null,
      now,
    ),
  );
  for (const groupKey of new Set(TRACKER_CATALOG.map((tracker) => tracker.groupKey))) {
    const groupId = groups.get(groupKey);
    if (groupId === undefined) continue;
    const keys = TRACKER_CATALOG.filter((tracker) => tracker.groupKey === groupKey).map(
      (tracker) => tracker.key,
    );
    statements.push(
      env.DB.prepare(
        `UPDATE trackers SET group_id = ?
         WHERE owner_id = ? AND group_id IS NULL AND key IN (${keys.map(() => "?").join(", ")})`,
      ).bind(groupId, String(userId), ...keys),
    );
  }
  await env.DB.batch(statements);
}
