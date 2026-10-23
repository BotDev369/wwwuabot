/**
 * «Мої»: власні трекери, їхній порядок і групи; каталог і чужі визначення — у
 * `trackers-library`. Власника дає підписаний `initData`, тож кожен запит
 * звужений `owner_id = ?`, і чужий номер не бачить нічого.
 *
 * @module api-dev/src/services/trackers.service
 */

import { ensureTables } from "@wwwuabot/shared/database/ensure-tables";
import { formatSqliteDatetime } from "@wwwuabot/shared/utils/datetime";
import {
  TRACKER_OWN_GROUP_KEY,
  type Tracker,
  type TrackerFields,
  type TrackerGroup,
} from "@wwwuabot/shared/trackers";
import type { Env } from "../shared/types";
import { nextTrackerPosition } from "./trackers-library";
import { TRACKER_COLUMNS, seedGroups, toTracker, type TrackerRow } from "./trackers-seed";

/**
 * «Мої» — лише те, що людина додала (або мала доти). Каталог більше не
 * сіється: він живе вкладкой «Шаблони», і копія в «Мої» — завжди явний крок
 * людини (`docs/TRACKERS.md`, «Три поверхні»).
 */
export async function listTrackers(env: Env, userId: number): Promise<Tracker[]> {
  await ensureTables(env.DB, ["trackers", "tracker_groups"]);
  const rows = await env.DB.prepare(
    `SELECT ${TRACKER_COLUMNS} FROM trackers WHERE owner_id = ? AND is_active = 1
     ORDER BY COALESCE(position, 0), id`,
  )
    .bind(String(userId))
    .all<TrackerRow>();
  return (rows.results ?? []).map(toTracker);
}

/**
 * Дерево груп людини: верхній рівень першим (типові тематики сіються раніше).
 */
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

export async function readTracker(env: Env, userId: number, id: number): Promise<Tracker | null> {
  const row = await env.DB.prepare(
    `SELECT ${TRACKER_COLUMNS} FROM trackers WHERE id = ? AND owner_id = ? AND is_active = 1`,
  )
    .bind(id, String(userId))
    .first<TrackerRow>();
  return row ? toTracker(row) : null;
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
 * Очищення групи: прибирає всі мірки її піддерева (`is_active = 0`), саму
 * групу лишає. Це єдина дія для типової тематики каталогу — її рядок не
 * видаляється, а «порожня полиця» тоді й зникає зі стрічки.
 * Історія вимірів не чіпається: прибране повертається разом із нею.
 */
export async function clearGroupTrackers(
  env: Env,
  userId: number,
  id: number,
): Promise<number | null> {
  const group = await readGroup(env, userId, id);
  if (!group) return null;
  const row = await env.DB.prepare(
    `WITH RECURSIVE subtree(id) AS (
       SELECT id FROM tracker_groups WHERE id = ? AND owner_id = ?
       UNION ALL
       SELECT g.id FROM tracker_groups g JOIN subtree s ON g.parent_id = s.id
       WHERE g.owner_id = ?
     )
     UPDATE trackers SET is_active = 0
     WHERE owner_id = ? AND is_active = 1 AND group_id IN (SELECT id FROM subtree)`,
  )
    .bind(id, String(userId), String(userId), String(userId))
    .run();
  return Number(row.meta?.changes ?? 0);
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

/**
 * Рух трекера вгору/вниз серед **сусідів своєї групи** — та сама механіка, що
 * в груп: позиції матеріалізуються при кожній перестановці, бо в наявних
 * рядків там `NULL`, і без цього рух міняв би не тих сусідів. Межа списку —
 * без змін, а не помилка: перший і останній нікуди не рухаються.
 */
export async function moveTrackerOrder(
  env: Env,
  userId: number,
  id: number,
  direction: -1 | 1,
): Promise<boolean> {
  const tracker = await readTracker(env, userId, id);
  if (!tracker) return false;

  const siblings = await env.DB.prepare(
    `SELECT id FROM trackers WHERE owner_id = ? AND group_id IS ? AND is_active = 1
     ORDER BY COALESCE(position, 0), id`,
  )
    .bind(String(userId), tracker.groupId)
    .all<{ id: number }>();
  const ids = (siblings.results ?? []).map((row) => Number(row.id));
  const from = ids.indexOf(id);
  const to = from + direction;
  if (from < 0 || to < 0 || to >= ids.length) return true;

  [ids[from], ids[to]] = [ids[to], ids[from]];
  await env.DB.batch(
    ids.map((siblingId, index) =>
      env.DB.prepare(`UPDATE trackers SET position = ? WHERE id = ? AND owner_id = ?`).bind(
        (index + 1) * 10,
        siblingId,
        String(userId),
      ),
    ),
  );
  return true;
}

/** Публічність визначення — прапорець рядка; виміри не публікуються ніколи. */
export async function setTrackerPublic(
  env: Env,
  userId: number,
  id: number,
  isPublic: boolean,
): Promise<boolean> {
  const result = await env.DB.prepare(
    "UPDATE trackers SET is_public = ? WHERE id = ? AND owner_id = ? AND is_active = 1",
  )
    .bind(isPublic ? 1 : 0, id, String(userId))
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
       (owner_id, key, title, unit, step, goal, min_value, max_value, mode, value_type,
        icon, group_id, is_builtin, is_active, position, source, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'bar-chart', ?, 0, 1, ?, NULL, ?)`,
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
      await nextTrackerPosition(env, userId, groupId),
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
