/**
 * Журнал дій: запис дій платформи й читання для адмінки (`docs/EVENTS.md`).
 *
 * Запис іде в `waitUntil`: дія вже сталася, і її слід не входить у відповідь —
 * помилка журналу не робить запит помилковим. Сесію перевіряє `router.ts`.
 *
 * @module api-dev/src/services/user-events.service
 */

import {
  platformAction,
  shouldRecordPlatformRequest,
  type EventList,
  type EventRange,
  type EventSurface,
  type EventSummary,
  type UserEvent,
} from "@wwwuabot/shared/events";
import { ensureTables } from "@wwwuabot/shared/database/ensure-tables";
import { recordUserEvent } from "@wwwuabot/shared/database/user-events";
import type { Env } from "../shared/types";
import { tryResolveUserId } from "../shared/identity";
import { apiLog } from "../shared/logger";

/** Скільки людей показує зведення: більше — вже не «огляд», а список. */
const SUMMARY_USERS_LIMIT = 200;

/**
 * Дія платформи — у журнал, якщо запит має підписану людину; `at` — момент
 * приходу запиту, бо запис іде в `waitUntil`, а не до відповіді.
 *
 * Query не пишеться: у ньому буває пошук людини, а поведінку описує екран.
 * Адмінські, ботові й порталові шляхи пропускаються — це дії панелі.
 */
export async function recordPlatformRequest(
  request: Request,
  env: Env,
  status: number,
  at?: number,
): Promise<void> {
  try {
    const { pathname } = new URL(request.url);
    if (!shouldRecordPlatformRequest(pathname)) return;

    const userId = await tryResolveUserId(request, env);
    if (userId === null) return;

    await recordUserEvent(
      env.DB,
      {
        userId,
        surface: "platform",
        kind: "request",
        action: platformAction(request.method, pathname),
        status: status < 400 ? "ok" : "error",
      },
      at,
    );
  } catch (error) {
    apiLog.error("events: запис дії платформи", error);
  }
}

interface SummaryRow {
  user_id: number;
  count: number;
  last_at: string;
  first_name: string | null;
  last_name: string | null;
  username: string | null;
}

/** Зведення за діапазон: скільки всього, звідки й хто найактивніший. */
export async function readEventSummary(env: Env, range: EventRange): Promise<EventSummary> {
  await ensureTables(env.DB, ["user_events"]);

  const totalRow = await env.DB.prepare(
    "SELECT COUNT(*) AS total FROM user_events WHERE created_at BETWEEN ? AND ?",
  )
    .bind(range.from, range.to)
    .first<{ total: number }>();

  const surfaceRows = await env.DB.prepare(
    "SELECT surface, COUNT(*) AS count FROM user_events WHERE created_at BETWEEN ? AND ? GROUP BY surface",
  )
    .bind(range.from, range.to)
    .all<{ surface: EventSurface; count: number }>();

  const userRows = await env.DB.prepare(
    `SELECT e.user_id AS user_id, COUNT(*) AS count, MAX(e.created_at) AS last_at,
            u.first_name AS first_name, u.last_name AS last_name, u.username AS username
       FROM user_events e
       LEFT JOIN users u ON u.user_id = e.user_id
      WHERE e.created_at BETWEEN ? AND ?
      GROUP BY e.user_id
      ORDER BY count DESC, last_at DESC
      LIMIT ?`,
  )
    .bind(range.from, range.to, SUMMARY_USERS_LIMIT)
    .all<SummaryRow>();

  const bySurface: Record<EventSurface, number> = { bot: 0, platform: 0 };
  for (const row of surfaceRows.results ?? []) {
    if (row.surface === "bot" || row.surface === "platform") bySurface[row.surface] = row.count;
  }

  return {
    ...range,
    total: totalRow?.total ?? 0,
    bySurface,
    users: (userRows.results ?? []).map((row) => ({
      userId: row.user_id,
      firstName: row.first_name,
      lastName: row.last_name,
      username: row.username,
      count: row.count,
      lastAt: row.last_at,
    })),
  };
}

interface EventRow {
  id: number;
  user_id: number;
  surface: EventSurface;
  kind: UserEvent["kind"];
  action: string;
  details: string | null;
  status: UserEvent["status"];
  created_at: string;
  first_name: string | null;
  last_name: string | null;
  username: string | null;
}

/** Список подій — усіх або однієї людини, найновіші першими. */
export async function readEvents(
  env: Env,
  range: EventRange,
  options: { userId?: number | null; limit: number; offset: number },
): Promise<EventList> {
  await ensureTables(env.DB, ["user_events"]);

  const byUser = options.userId !== undefined && options.userId !== null;
  const where = `WHERE e.created_at BETWEEN ? AND ?${byUser ? " AND e.user_id = ?" : ""}`;
  const values: (string | number)[] = byUser
    ? [range.from, range.to, options.userId as number]
    : [range.from, range.to];

  const countWhere = `WHERE created_at BETWEEN ? AND ?${byUser ? " AND user_id = ?" : ""}`;
  const totalRow = await env.DB.prepare(`SELECT COUNT(*) AS total FROM user_events ${countWhere}`)
    .bind(...values)
    .first<{ total: number }>();

  const rows = await env.DB.prepare(
    `SELECT e.id AS id, e.user_id AS user_id, e.surface AS surface, e.kind AS kind,
            e.action AS action, e.details AS details, e.status AS status,
            e.created_at AS created_at,
            u.first_name AS first_name, u.last_name AS last_name, u.username AS username
       FROM user_events e
       LEFT JOIN users u ON u.user_id = e.user_id
       ${where}
      ORDER BY e.created_at DESC, e.id DESC
      LIMIT ? OFFSET ?`,
  )
    .bind(...values, options.limit, options.offset)
    .all<EventRow>();

  return {
    ...range,
    total: totalRow?.total ?? 0,
    items: (rows.results ?? []).map((row) => ({
      id: row.id,
      userId: row.user_id,
      surface: row.surface,
      kind: row.kind,
      action: row.action,
      details: row.details,
      status: row.status,
      createdAt: row.created_at,
      firstName: row.first_name,
      lastName: row.last_name,
      username: row.username,
    })),
  };
}
