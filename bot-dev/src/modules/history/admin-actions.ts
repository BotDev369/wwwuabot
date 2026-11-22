/**
 * Правка й видалення живих повідомлень бота: Telegram, потім `bot_messages`.
 *
 * Telegram викликає бот (він надіслав), і лише після його «ok» ставиться
 * `edited_at` чи `deleted_at` — два факти пишуться в одному місці.
 *
 * @module bot-dev/src/modules/history/admin-actions
 */

import { ensureTables } from "@wwwuabot/shared/database/ensure-tables";
import { botMessageExpired } from "@wwwuabot/shared/database/bot-messages";
import { plainTextToRichHtml, type BotChannelPayload } from "@wwwuabot/shared/security/bot-channel";
import type { Env } from "../../shared/types/env";

export interface HistoryRow {
  id: number;
  user_id: number;
  direction: string;
  message_id: number | null;
  kind: string;
  text: string;
  meta: string | null;
  created_at: string | null;
  edited_at: string | null;
  deleted_at: string | null;
}

export type AdminActionResult =
  | { ok: true; message: HistoryRow }
  | { ok: false; status: number; error: string; description?: string };

const COLUMNS =
  "id, user_id, direction, message_id, kind, text, meta, created_at, edited_at, deleted_at";

async function readRow(
  db: D1Database,
  userId: number,
  messageId: number,
): Promise<HistoryRow | null> {
  const row = await db
    .prepare(
      `SELECT ${COLUMNS} FROM bot_messages WHERE user_id = ? AND message_id = ? ORDER BY id DESC LIMIT 1`,
    )
    .bind(userId, messageId)
    .first<HistoryRow>();
  return row ?? null;
}

interface TelegramAnswer {
  ok: boolean;
  description?: string;
  error_code?: number;
}

async function telegram(token: string, method: string, body: unknown): Promise<TelegramAnswer> {
  try {
    const response = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    return (await response.json()) as TelegramAnswer;
  } catch (error: unknown) {
    return { ok: false, description: String(error) };
  }
}

/**
 * Виконати дію. Перевірки стоять **до** Telegram: після 48 годин API вже
 * нічого не дасть, і краще сказати це словами, ніж показати відмову Telegram.
 */
export async function applyAdminAction(
  env: Env,
  input: BotChannelPayload,
): Promise<AdminActionResult> {
  await ensureTables(env.DB, ["bot_messages"]);

  const row = await readRow(env.DB, input.chatId, input.messageId);
  if (!row) return { ok: false, status: 404, error: "not_found" };
  if (row.deleted_at) return { ok: false, status: 409, error: "already_deleted" };
  if (botMessageExpired(row.created_at)) return { ok: false, status: 409, error: "too_old" };
  if (input.action === "edit" && row.direction !== "out") {
    return { ok: false, status: 409, error: "not_bot_message" };
  }

  const text = (input.text ?? "").trim();
  if (input.action === "edit" && !text) {
    return { ok: false, status: 400, error: "empty_text" };
  }

  if (input.action === "edit") {
    const stored = input.format === "rich" ? plainTextToRichHtml(text) : text;
    const answer = await telegram(env.BOT_TOKEN, "editMessageText", {
      chat_id: input.chatId,
      message_id: input.messageId,
      ...(input.format === "rich" ? { rich_message: { html: stored } } : { text }),
    });
    if (!answer.ok) {
      return {
        ok: false,
        status: answer.error_code === 400 ? 409 : 502,
        error: "telegram_refused",
        description: answer.description,
      };
    }

    const result = await env.DB.prepare(
      `UPDATE bot_messages SET text = ?, edited_at = datetime('now')
       WHERE user_id = ? AND message_id = ? AND direction = 'out' AND deleted_at IS NULL`,
    )
      .bind(stored, input.chatId, input.messageId)
      .run();
    if (!result.meta.changes) return { ok: false, status: 409, error: "already_deleted" };
  } else {
    const answer = await telegram(env.BOT_TOKEN, "deleteMessage", {
      chat_id: input.chatId,
      message_id: input.messageId,
    });
    if (!answer.ok) {
      return {
        ok: false,
        status: answer.error_code === 400 ? 409 : 502,
        error: "telegram_refused",
        description: answer.description,
      };
    }

    const result = await env.DB.prepare(
      `UPDATE bot_messages SET deleted_at = datetime('now')
       WHERE user_id = ? AND message_id = ? AND deleted_at IS NULL`,
    )
      .bind(input.chatId, input.messageId)
      .run();
    if (!result.meta.changes) return { ok: false, status: 409, error: "already_deleted" };
  }

  const updated = await readRow(env.DB, input.chatId, input.messageId);
  if (!updated) return { ok: false, status: 404, error: "not_found" };
  return { ok: true, message: updated };
}
