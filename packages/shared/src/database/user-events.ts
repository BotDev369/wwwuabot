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
 * `at` — коли дію **зробили**, а не коли встигли записати; `windowMs` —
 * згортання повторів тієї самої дії в одну подію (перевірка в самому
 * `INSERT`, бо читання перед записом програє гонку паралельним запитам).
 */
export async function recordUserEvent(
  db: D1Database,
  event: UserEventInput,
  at?: number,
  windowMs?: number,
): Promise<void> {
  await ensureTables(db, ["user_events"]);

  const moment = at === undefined ? Date.now() : at;
  const stamp = formatSqliteDatetimeMs(new Date(moment));

  if (windowMs === undefined) {
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
        stamp,
      )
      .run();
    return;
  }

  await db
    .prepare(
      `INSERT INTO user_events (user_id, surface, kind, action, details, status, created_at)
       SELECT ?, ?, ?, ?, ?, ?, ?
        WHERE NOT EXISTS (
          SELECT 1 FROM user_events
           WHERE user_id = ? AND kind = ? AND action = ? AND created_at > ?
        )`,
    )
    .bind(
      event.userId,
      event.surface,
      event.kind,
      event.action,
      event.details ?? null,
      event.status ?? "ok",
      stamp,
      event.userId,
      event.kind,
      event.action,
      formatSqliteDatetimeMs(new Date(moment - windowMs)),
    )
    .run();
}
