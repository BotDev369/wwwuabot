/**
 * Ознаки рядка трекера, які людина міняє з картки: назва, пріоритет,
 * публічність. Кожна — один `UPDATE` під `owner_id` і `is_active = 1`, тож
 * чужий або архівний номер не змінює нічого.
 *
 * @module api-dev/src/services/trackers-fields
 */

import type { Env } from "../shared/types";

/**
 * Нова назва мірки — рядок міняється лише в людини, якій він належить, і
 * лише живий (`is_active = 1`): архівний трекер у формі не з'являється.
 */
export async function renameTracker(
  env: Env,
  userId: number,
  id: number,
  title: string,
): Promise<boolean> {
  const result = await env.DB.prepare(
    `UPDATE trackers SET title = ? WHERE id = ? AND owner_id = ? AND is_active = 1`,
  )
    .bind(title, id, String(userId))
    .run();
  return Number(result.meta.changes) > 0;
}

/** Пріоритет — ранг мірки; `null` прибирає його (той самий стан, що в наявних рядків). */
export async function setTrackerPriority(
  env: Env,
  userId: number,
  id: number,
  priority: number | null,
): Promise<boolean> {
  const result = await env.DB.prepare(
    `UPDATE trackers SET priority = ? WHERE id = ? AND owner_id = ? AND is_active = 1`,
  )
    .bind(priority, id, String(userId))
    .run();
  return Number(result.meta.changes) > 0;
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
