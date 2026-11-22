/**
 * Службовий вхід api-dev → bot для правки й видалення в Telegram.
 *
 * Кожен запит мусить мати свіжий HMAC-підпис
 * (`@wwwuabot/shared/security/bot-channel`), а відмова — `401` без подробиць.
 *
 * @module bot-dev/src/api/controllers/bot-channel.controller
 */

import {
  BOT_CHANNEL_HEADER,
  BOT_CHANNEL_PATH,
  verifyBotChannel,
  type BotChannelPayload,
} from "@wwwuabot/shared/security/bot-channel";
import type { Env } from "../../shared/types/env";
import { applyAdminAction } from "../../modules/history/admin-actions";

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function positiveInt(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value > 0;
}

/** Тіло перевіряється вручну: у боті немає zod, а полів рівно чотири. */
function parsePayload(raw: unknown): BotChannelPayload | null {
  if (!raw || typeof raw !== "object") return null;
  const payload = raw as Record<string, unknown>;
  if (payload.action !== "edit" && payload.action !== "delete") return null;
  if (!positiveInt(payload.chatId) || !positiveInt(payload.messageId)) return null;
  if (payload.text !== undefined && typeof payload.text !== "string") return null;
  if (payload.format !== undefined && payload.format !== "rich" && payload.format !== "plain") {
    return null;
  }
  return {
    action: payload.action,
    chatId: payload.chatId,
    messageId: payload.messageId,
    text: payload.text as string | undefined,
    format: payload.format as "rich" | "plain" | undefined,
  };
}

export async function handleBotChannel(request: Request, env: Env): Promise<Response> {
  const body = await request.text();
  const verdict = await verifyBotChannel(env.BOT_TOKEN, {
    method: request.method,
    path: BOT_CHANNEL_PATH,
    body,
    header: request.headers.get(BOT_CHANNEL_HEADER),
  });
  if (!verdict.ok) return json({ ok: false, error: "unauthorized" }, 401);

  let raw: unknown;
  try {
    raw = JSON.parse(body);
  } catch {
    return json({ ok: false, error: "bad_json" }, 400);
  }

  const payload = parsePayload(raw);
  if (!payload) return json({ ok: false, error: "bad_request" }, 400);

  const result = await applyAdminAction(env, payload);
  if (!result.ok) {
    return json({ ok: false, error: result.error, description: result.description }, result.status);
  }
  return json({ ok: true, message: result.message });
}
