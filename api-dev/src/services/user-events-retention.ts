/**
 * Межа життя журналу дій: `user_events` росте на рядок за кожну дію, і без неї
 * адмінка з часом читає всю історію проєкту, щоб показати одну добу. Термін
 * ухвалений, а не «колись»: аналітика питає добу, тиждень і місяць, тож півроку
 * лишає запас, а старше прибирає крон.
 *
 * @module api-dev/src/services/user-events-retention
 */

import { ensureTables } from "@wwwuabot/shared/database/ensure-tables";
import { formatSqliteDatetimeMs } from "@wwwuabot/shared/utils/datetime";
import type { Env } from "../shared/types";

/** Скільки днів журнал живе повністю; старше прибирає крон. */
export const EVENT_RETENTION_DAYS = 180;

/** Розклад прибирання — окремий від зрізу й Є-data: інша частота й бюджет. */
export const EVENTS_CRON = "23 3 * * *";

const DAY_MS = 86_400_000;

/**
 * `DELETE` іде індексом `idx_user_events_time`, тож коштує стільки, скільки
 * рядків справді старі, а не скільки їх у таблиці. Повертає число прибраних:
 * крон пише його в лог, і нуль тоді видно як нуль.
 */
export async function pruneOldEvents(env: Env, now = Date.now()): Promise<number> {
  await ensureTables(env.DB, ["user_events"]);

  const cutoff = formatSqliteDatetimeMs(new Date(now - EVENT_RETENTION_DAYS * DAY_MS));
  const result = await env.DB.prepare("DELETE FROM user_events WHERE created_at < ?")
    .bind(cutoff)
    .run();

  return result.meta?.changes ?? 0;
}
