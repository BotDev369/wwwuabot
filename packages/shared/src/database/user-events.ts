/**
 * Запис події в журнал `user_events` — спільний для обох воркерів: друга копія
 * `INSERT` розійшлася б із першою при першій же зміні схеми (AGENTS.md §3).
 * Таблицю створює той, хто пише першим: `ensureTables` ідемпотентний.
 *
 * @module @wwwuabot/shared/database/user-events
 */

import type { UserEventInput } from "../events";
import { formatSqliteDatetimeMs } from "../utils/datetime";
import { ensureTables } from "./ensure-tables";

/**
 * `at` — коли дію **зробили**, а не коли встигли записати: запис іде після
 * відповіді, тож інакше порядок історії задавав би той, хто швидше записав.
 */
export async function recordUserEvent(
  db: D1Database,
  event: UserEventInput,
  at?: number,
): Promise<void> {
  await ensureTables(db, ["user_events"]);
  await db
    .prepare(
      "INSERT INTO user_events (user_id, surface, kind, action, details, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
    )
    .bind(
      event.userId,
      event.surface,
      event.kind,
      event.action,
      event.details ?? null,
      event.status ?? "ok",
      formatSqliteDatetimeMs(at === undefined ? undefined : new Date(at)),
    )
    .run();
}
