/**
 * Адмінська сторона журналу дій: зведення, список людей і подій, прибирання
 * (`docs/EVENTS.md`). Запис живе окремо — це інша сторона тієї самої таблиці,
 * і тримати їх в одному файлі означало б міняти одне, читаючи інше.
 *
 * @module api-dev/src/services/user-events-admin.service
 */

import {
  resolveEventRange,
  type EventList,
  type EventRange,
  type EventSurface,
  type EventSummary,
  type EventUserSummary,
  type UserEvent,
} from "@wwwuabot/shared/events";
import { ensureTables } from "@wwwuabot/shared/database/ensure-tables";
import type { Env } from "../shared/types";

/** Скільки людей показує зведення: більше — вже не «огляд», а список. */
const SUMMARY_USERS_LIMIT = 200;

/** Що прибрати: кожна задана ознака звужує вибір, незадані не беруть участі. */
export interface EventCleanupFilter {
  userId?: number | null;
  from?: string | null;
  to?: string | null;
  surface?: EventSurface | null;
  kind?: UserEvent["kind"] | null;
}

/**
 * `WHERE` із заданих ознак; порожній — це «всі рядки», і його дозволяє
 * лише явне `all` у контролері, а не забутий фільтр.
 */
function cleanupWhere(filter: EventCleanupFilter): {
  sql: string;
  values: (string | number)[];
} {
  const clauses: string[] = [];
  const values: (string | number)[] = [];

  if (filter.userId) {
    clauses.push("user_id = ?");
    values.push(filter.userId);
  }
  if (filter.surface) {
    clauses.push("surface = ?");
    values.push(filter.surface);
  }
  if (filter.kind) {
    clauses.push("kind = ?");
    values.push(filter.kind);
  }
  if (filter.from || filter.to) {
    const range = resolveEventRange({ from: filter.from, to: filter.to });
    clauses.push("created_at BETWEEN ? AND ?");
    values.push(range.from, range.to);
  }

  return { sql: clauses.length > 0 ? `WHERE ${clauses.join(" AND ")}` : "", values };
}

/**
 * Прибирання журналу: `dryRun` лише рахує, що підпадає під ознаки — людина
 * бачить кількість до того, як щось зникне.
 */
export async function cleanupEvents(
  env: Env,
  filter: EventCleanupFilter,
  dryRun: boolean,
): Promise<number> {
  await ensureTables(env.DB, ["user_events"]);
  const where = cleanupWhere(filter);
  const from = where.sql ? `FROM user_events ${where.sql}` : "FROM user_events";

  if (dryRun) {
    const row = await env.DB.prepare(`SELECT COUNT(*) AS total ${from}`)
      .bind(...where.values)
      .first<{ total: number }>();
    return row?.total ?? 0;
  }

  const result = await env.DB.prepare(`DELETE ${from}`)
    .bind(...where.values)
    .run();
  return result.meta?.changes ?? 0;
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

/**
 * Люди, які вже є в журналі — для вибору в адмінці: номер ніхто не тримає в
 * голові, а список мусить бути з того самого журналу, а не з усіх `users`.
 *
 * `search` шукає за іменем, хендлом і номером: людина може знати будь-що з них.
 */
export async function readEventUsers(
  env: Env,
  search: string,
  limit = 50,
): Promise<EventUserSummary[]> {
  await ensureTables(env.DB, ["user_events"]);

  const term = search.trim();
  const like = `%${term}%`;
  const where = term
    ? `WHERE CAST(e.user_id AS TEXT) LIKE ? OR u.first_name LIKE ? OR u.last_name LIKE ? OR u.username LIKE ?`
    : "";
  const values = term ? [like, like, like, like] : [];

  const rows = await env.DB.prepare(
    `SELECT e.user_id AS user_id, COUNT(*) AS count, MAX(e.created_at) AS last_at,
            u.first_name AS first_name, u.last_name AS last_name, u.username AS username
       FROM user_events e
       LEFT JOIN users u ON u.user_id = e.user_id
       ${where}
      GROUP BY e.user_id
      ORDER BY last_at DESC
      LIMIT ?`,
  )
    .bind(...values, limit)
    .all<SummaryRow>();

  return (rows.results ?? []).map((row) => ({
    userId: row.user_id,
    firstName: row.first_name,
    lastName: row.last_name,
    username: row.username,
    count: row.count,
    lastAt: row.last_at,
  }));
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
