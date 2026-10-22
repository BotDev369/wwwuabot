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
  TRACKER_OWN_GROUP_KEY,
  todayTrackerDay,
  type Tracker,
  type TrackerEntry,
  type TrackerEntryRow,
  type TrackerFields,
  type TrackerGroup,
} from "@wwwuabot/shared/trackers";
import type { Env } from "../shared/types";
import {
  TRACKER_COLUMNS,
  seedGroups,
  seedTrackers,
  toTracker,
  type TrackerRow,
} from "./trackers-seed";

export async function listTrackers(env: Env, userId: number): Promise<Tracker[]> {
  await ensureTables(env.DB, ["trackers", "tracker_groups"]);
  const groups = await seedGroups(env, userId);
  await seedTrackers(env, userId, groups);

  const rows = await env.DB.prepare(
    `SELECT ${TRACKER_COLUMNS} FROM trackers WHERE owner_id = ? AND is_active = 1 ORDER BY id`,
  )
    .bind(String(userId))
    .all<TrackerRow>();
  return (rows.results ?? []).map(toTracker);
}

/** Дерево груп людини: верхній рівень першим (типові тематики сіються раніше). */
export async function listGroups(env: Env, userId: number): Promise<TrackerGroup[]> {
  await ensureTables(env.DB, ["tracker_groups"]);
  await seedGroups(env, userId);
  const rows = await env.DB.prepare(
    `SELECT id, parent_id, title, key FROM tracker_groups WHERE owner_id = ?
     ORDER BY COALESCE(position, 0), id`,
  )
    .bind(String(userId))
    .all<{ id: number; parent_id: number | null; title: string; key: string | null }>();
  return (rows.results ?? []).map((row) => ({
    id: Number(row.id),
    parentId: row.parent_id === null ? null : Number(row.parent_id),
    title: row.title,
    key: row.key,
  }));
}

/** Нова група: ключа вона не має — він ознака типової тематики каталогу. */
export async function createGroup(
  env: Env,
  userId: number,
  fields: { title: string; parentId: number | null },
): Promise<TrackerGroup | null> {
  const result = await env.DB.prepare(
    `INSERT INTO tracker_groups (owner_id, key, parent_id, title, position, created_at)
     VALUES (?, NULL, ?, ?,
       (SELECT COALESCE(MAX(position), 0) + 10 FROM tracker_groups
        WHERE owner_id = ? AND parent_id IS ?), ?)`,
  )
    .bind(
      String(userId),
      fields.parentId,
      fields.title,
      String(userId),
      fields.parentId,
      formatSqliteDatetime(),
    )
    .run();
  const id = Number(result.meta.last_row_id ?? 0);
  return id > 0 ? { id, parentId: fields.parentId, title: fields.title, key: null } : null;
}

/**
 * Група цієї людини; `null` — чужа або неіснуюча. Один запит за номером і
 * власником, тож чужий номер не існує й тут.
 */
async function readGroup(env: Env, userId: number, id: number): Promise<TrackerGroup | null> {
  const row = await env.DB.prepare(
    `SELECT id, parent_id, title, key FROM tracker_groups WHERE id = ? AND owner_id = ?`,
  )
    .bind(id, String(userId))
    .first<{ id: number; parent_id: number | null; title: string; key: string | null }>();
  return row
    ? {
        id: Number(row.id),
        parentId: row.parent_id === null ? null : Number(row.parent_id),
        title: row.title,
        key: row.key,
      }
    : null;
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

/**
 * Назва й батько групи. Батька перевіряємо **до** запису: цикл (група під
 * власним нащадком) замкнув би дерево, і стрічка перестала б рендеритись.
 */
export async function updateGroup(
  env: Env,
  userId: number,
  id: number,
  fields: { title?: string; parentId?: number | null },
): Promise<{ ok: true; group: TrackerGroup } | { ok: false; reason: "not_found" | "cycle" }> {
  const group = await readGroup(env, userId, id);
  if (!group) return { ok: false, reason: "not_found" };

  const parentId: number | null =
    "parentId" in fields && fields.parentId !== undefined ? fields.parentId : group.parentId;
  if (parentId !== null) {
    if (parentId === id) return { ok: false, reason: "cycle" };
    // Піднятись батьками нового батька: якщо дійшли до самої групи — це цикл.
    let cursor = await readGroup(env, userId, parentId);
    if (!cursor) return { ok: false, reason: "not_found" };
    const seen = new Set<number>();
    while (cursor.parentId !== null && !seen.has(cursor.id)) {
      if (cursor.id === id) return { ok: false, reason: "cycle" };
      seen.add(cursor.id);
      const next = await readGroup(env, userId, cursor.parentId);
      if (!next) break; // батька видалили — дерево сироти виправить стрічка
      cursor = next;
    }
    if (cursor.id === id) return { ok: false, reason: "cycle" };
  }

  const title = fields.title ?? group.title;
  await env.DB.prepare(
    `UPDATE tracker_groups SET title = ?, parent_id = ? WHERE id = ? AND owner_id = ?`,
  )
    .bind(title, parentId, id, String(userId))
    .run();
  return { ok: true, group: { ...group, title, parentId } };
}

/**
 * Прибрання групи не прибирає нічого з трекерів: діти підіймаються на місце
 * батька, а трекери — у групу «Свої» (системний корінь, його не можна
 * видалити). Історія вимірів не чіпається взагалі.
 */
export async function deleteGroup(
  env: Env,
  userId: number,
  id: number,
): Promise<"ok" | "not_found" | "builtin"> {
  const group = await readGroup(env, userId, id);
  if (!group) return "not_found";
  // Типова тематика: ключ — це контракт каталогу, його рядок сіється знову.
  if (group.key !== null) return "builtin";

  const own = await env.DB.prepare(`SELECT id FROM tracker_groups WHERE owner_id = ? AND key = ?`)
    .bind(String(userId), TRACKER_OWN_GROUP_KEY)
    .first<{ id: number }>();
  const moveTo = group.parentId ?? (own ? Number(own.id) : null);

  await env.DB.batch([
    env.DB.prepare(
      `UPDATE tracker_groups SET parent_id = ? WHERE parent_id = ? AND owner_id = ?`,
    ).bind(moveTo, id, String(userId)),
    env.DB.prepare(`UPDATE trackers SET group_id = ? WHERE group_id = ? AND owner_id = ?`).bind(
      moveTo,
      id,
      String(userId),
    ),
    env.DB.prepare(`DELETE FROM tracker_groups WHERE id = ? AND owner_id = ?`).bind(
      id,
      String(userId),
    ),
  ]);
  return "ok";
}

/**
 * Рух групи вгору/вниз у межах свого батька — порядок між сусідами, бо
 * дерево групує по `parent_id`. Позиції всіх сусідів матеріалізуються при
 * кожній перестановці (`(індекс+1)*10`): наявні рядки приїхали з `DEFAULT
 * NULL`, і свіжий рядок без позиції інакше стрибав би на перше місце.
 * Межа — без змін, а не помилка: перший і останній нікуди не рухаються.
 */
export async function moveGroup(
  env: Env,
  userId: number,
  id: number,
  direction: -1 | 1,
): Promise<{ ok: true } | { ok: false }> {
  const group = await readGroup(env, userId, id);
  if (!group) return { ok: false };

  const siblings = await env.DB.prepare(
    `SELECT id FROM tracker_groups WHERE owner_id = ? AND parent_id IS ?
     ORDER BY COALESCE(position, 0), id`,
  )
    .bind(String(userId), group.parentId)
    .all<{ id: number }>();
  const ids = (siblings.results ?? []).map((row) => Number(row.id));
  const from = ids.indexOf(id);
  const to = from + direction;
  if (from < 0 || to < 0 || to >= ids.length) return { ok: true };

  [ids[from], ids[to]] = [ids[to], ids[from]];
  await env.DB.batch(
    ids.map((siblingId, index) =>
      env.DB.prepare(`UPDATE tracker_groups SET position = ? WHERE id = ? AND owner_id = ?`).bind(
        (index + 1) * 10,
        siblingId,
        String(userId),
      ),
    ),
  );
  return { ok: true };
}

/** Пересунути трекер в іншу групу; група має бути цієї ж людини. */
export async function moveTracker(
  env: Env,
  userId: number,
  trackerId: number,
  groupId: number | null,
): Promise<boolean> {
  if (groupId !== null && !(await readGroup(env, userId, groupId))) return false;
  const result = await env.DB.prepare(
    `UPDATE trackers SET group_id = ? WHERE id = ? AND owner_id = ? AND is_active = 1`,
  )
    .bind(groupId, trackerId, String(userId))
    .run();
  return Number(result.meta.changes) > 0;
}

/** Власний трекер: ключ внутрішній, людина його не бачить і не задає. */
export async function createTracker(
  env: Env,
  userId: number,
  fields: TrackerFields,
  groupId: number | null = null,
): Promise<Tracker | null> {
  if (groupId !== null && !(await readGroup(env, userId, groupId))) return null;
  const key = `own-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  await env.DB.prepare(
    `INSERT INTO trackers
       (owner_id, key, title, unit, step, goal, min_value, max_value, mode, value_type, icon, group_id, is_builtin, is_active, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'bar-chart', ?, 0, 1, ?)`,
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
      fields.valueType,
      groupId,
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
