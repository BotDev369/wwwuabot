/**
 * Переписка людини з ботом в адмінці — `/api/admin/users/:id/messages`.
 *
 * Тільки читання: 6 останніх, далі — старші за курсором `before` (номер
 * рядка; `id` монотонний, тож між порціями нічого не проскочить). Таблиця
 * належить `bot-dev`: немає її — порожня переписка, а не помилка.
 * @module api-dev/src/controllers/bot-messages.controller
 */

import type { Env } from "../shared/types";

/** Порція за замовчуванням — та сама, що обіцяє кнопка «Показати ще 6». */
export const USER_MESSAGES_PAGE_SIZE = 6;

/** Стеля на один запит: більше — це вже вивантаження всієї переписки. */
const MAX_LIMIT = 50;

export interface BotMessageRow {
  id: number;
  direction: string;
  message_id: number | null;
  kind: string;
  text: string;
  meta: string | null;
  created_at: string | null;
  edited_at: string | null;
  deleted_at: string | null;
}

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

/** `limit` кривий — беремо типову порцію; надто великий — обрізаємо стелею. */
function readLimit(raw: string | null): number {
  const value = Number(raw);
  if (!Number.isInteger(value) || value <= 0) return USER_MESSAGES_PAGE_SIZE;
  return Math.min(value, MAX_LIMIT);
}

/** `null` — курсора немає (перша порція); `NaN` — курсор зіпсований. */
function readCursor(raw: string | null): number | null {
  if (raw === null) return null;
  const value = Number(raw);
  return Number.isInteger(value) && value > 0 ? value : Number.NaN;
}

/**
 * Сторінка переписки: `limit + 1` рядок — це спосіб дізнатись, чи є старші,
 * не роблячи другого запиту `COUNT`.
 */
async function readPage(
  db: D1Database,
  userId: number,
  before: number | null,
  limit: number,
): Promise<BotMessageRow[]> {
  const columns = "id, direction, message_id, kind, text, meta, created_at, edited_at, deleted_at";
  const statement =
    before === null
      ? db
          .prepare(`SELECT ${columns} FROM bot_messages WHERE user_id = ? ORDER BY id DESC LIMIT ?`)
          .bind(userId, limit + 1)
      : db
          .prepare(
            `SELECT ${columns} FROM bot_messages WHERE user_id = ? AND id < ? ORDER BY id DESC LIMIT ?`,
          )
          .bind(userId, before, limit + 1);

  const result = await statement.all<BotMessageRow>();
  return result.results ?? [];
}

/**
 * GET `/api/admin/users/:id/messages?before=<id>&limit=6`.
 *
 * Відповідь: `messages` у хронологічному порядку (найстаріше — перше, щоб
 * стрічка читалась згори вниз), `hasMore` — чи є ще старші, `nextBefore` —
 * курсор для наступної порції.
 */
export async function handleUserMessages(
  request: Request,
  env: Env,
  userId: number,
): Promise<Response> {
  if (!Number.isInteger(userId) || userId <= 0) {
    return json({ error: "bad user id" }, 400);
  }

  const url = new URL(request.url);
  const cursor = readCursor(url.searchParams.get("before"));
  if (Number.isNaN(cursor)) {
    return json({ error: "bad cursor" }, 400);
  }

  const limit = readLimit(url.searchParams.get("limit"));

  try {
    const rows = await readPage(env.DB, userId, cursor, limit);
    const hasMore = rows.length > limit;
    const messages = rows.slice(0, limit).reverse();
    return json({
      ok: true,
      messages,
      hasMore,
      nextBefore: hasMore ? messages[0].id : null,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    if (message.includes("no such table")) {
      return json({ ok: true, messages: [], hasMore: false, nextBefore: null });
    }
    return json({ error: message }, 500);
  }
}
