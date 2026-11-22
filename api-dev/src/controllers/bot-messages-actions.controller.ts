/**
 * Правка й видалення повідомлення — `/api/admin/users/:id/messages/:mid`.
 *
 * 48 годин перевіряються тут, до бота: Telegram відмовить і сам, але
 * англійською. API не пише в Telegram — кличе бота підписаним каналом.
 *
 * @module api-dev/src/controllers/bot-messages-actions.controller
 */

import { z } from "zod";
import {
  BOT_MESSAGE_EDIT_WINDOW_HOURS,
  BOT_MESSAGE_TEXT_MAX,
  botMessageExpired,
} from "@wwwuabot/shared/database/bot-messages";
import type { Env } from "../shared/types";
import { readBody } from "../shared/body";
import { callBotChannel, type BotChannelResult } from "../services/bot-channel.service";

const editBody = z.object({
  text: z.string().trim().min(1).max(BOT_MESSAGE_TEXT_MAX),
});

const NOT_FOUND = "Повідомлення не знайдено в цій переписці.";
const NOT_BOT = "Редагувати можна лише повідомлення бота.";
const ALREADY_DELETED = "Повідомлення вже видалене — змінювати чи видаляти нічого.";
const EDIT_TOO_OLD = `Повідомлення старше ${BOT_MESSAGE_EDIT_WINDOW_HOURS} годин — Telegram уже не дає його змінити.`;
const DELETE_TOO_OLD = `Повідомлення старше ${BOT_MESSAGE_EDIT_WINDOW_HOURS} годин — Telegram уже не дає його видалити.`;
const CHANNEL_MISSING = "Канал до бота не налаштований — дію не виконано.";

interface HistoryRow {
  id: number;
  direction: string;
  message_id: number | null;
  kind: string;
  text: string;
  created_at: string | null;
  deleted_at: string | null;
}

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

async function findRow(
  db: D1Database,
  userId: number,
  messageId: number,
): Promise<HistoryRow | null> {
  const row = await db
    .prepare(
      `SELECT id, direction, message_id, kind, text, created_at, deleted_at
       FROM bot_messages WHERE user_id = ? AND message_id = ? ORDER BY id DESC LIMIT 1`,
    )
    .bind(userId, messageId)
    .first<HistoryRow>();
  return row ?? null;
}

/** Відповідь на відмову бота — людським реченням, а не кодом. */
function failure(result: BotChannelResult, action: "edit" | "delete"): Response {
  const verb = action === "edit" ? "змінити" : "видалити";
  if (result.error === "too_old") {
    return json({ error: action === "edit" ? EDIT_TOO_OLD : DELETE_TOO_OLD, code: "too_old" }, 409);
  }
  if (result.error === "already_deleted") {
    return json({ error: ALREADY_DELETED, code: "already_deleted" }, 409);
  }
  if (result.error === "not_found") return json({ error: NOT_FOUND, code: "not_found" }, 404);
  if (result.error === "not_bot_message") return json({ error: NOT_BOT, code: "not_bot" }, 400);
  if (result.error === "channel_missing") {
    return json({ error: CHANNEL_MISSING, code: "channel_missing" }, 503);
  }
  if (result.error === "telegram_refused") {
    return json(
      {
        error: `Telegram відмовив: ${result.description ?? "без пояснення"}`,
        code: "telegram_refused",
      },
      409,
    );
  }
  if (result.status === 401) {
    return json({ error: "Бот не прийняв підпис каналу.", code: "channel_rejected" }, 502);
  }
  return json(
    {
      error: `Не вдалося ${verb} повідомлення: ${result.description ?? result.error ?? "невідома помилка"}`,
      code: "bot_error",
    },
    502,
  );
}

/** PATCH `/api/admin/users/:id/messages/:mid` — новий текст. */
export async function handleEditUserMessage(
  request: Request,
  env: Env,
  userId: number,
  messageId: number,
): Promise<Response> {
  const parsed = await readBody(request, editBody);
  if (!parsed.ok) return parsed.response;

  try {
    const row = await findRow(env.DB, userId, messageId);
    if (!row) return json({ error: NOT_FOUND }, 404);
    if (row.deleted_at) return json({ error: ALREADY_DELETED }, 409);
    if (row.direction !== "out") return json({ error: NOT_BOT }, 400);
    if (botMessageExpired(row.created_at)) return json({ error: EDIT_TOO_OLD }, 409);

    const result = await callBotChannel(env, {
      action: "edit",
      chatId: userId,
      messageId,
      text: parsed.body.text,
      format: row.kind === "rich" ? "rich" : "plain",
    });
    if (!result.ok) return failure(result, "edit");
    return json({ ok: true, message: result.message });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    if (message.includes("no such table")) return json({ error: NOT_FOUND }, 404);
    return json({ error: message }, 500);
  }
}

/** DELETE `/api/admin/users/:id/messages/:mid` — прибрати до 48 годин. */
export async function handleDeleteUserMessage(
  request: Request,
  env: Env,
  userId: number,
  messageId: number,
): Promise<Response> {
  try {
    const row = await findRow(env.DB, userId, messageId);
    if (!row) return json({ error: NOT_FOUND }, 404);
    if (row.deleted_at) return json({ error: ALREADY_DELETED }, 409);
    if (botMessageExpired(row.created_at)) return json({ error: DELETE_TOO_OLD }, 409);

    const result = await callBotChannel(env, { action: "delete", chatId: userId, messageId });
    if (!result.ok) return failure(result, "delete");
    return json({ ok: true, message: result.message });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    if (message.includes("no such table")) return json({ error: NOT_FOUND }, 404);
    return json({ error: message }, 500);
  }
}
