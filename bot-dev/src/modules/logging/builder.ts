/**
 * Подія з оновлення Telegram — у тих словах, у яких її видно в журналі.
 *
 * Описуємо дію, а не переказ оновлення: сирий `update` лишається в логах
 * Cloudflare. Файли — видом, а не `file_id`. Деталі — `docs/EVENTS.md`.
 *
 * @module bot-dev/src/modules/logging/builder
 */

import { truncateEventText, type UserEventInput } from "@wwwuabot/shared/events";
import type { AppContext } from "../../shared/types/env";

/** Види вкладень, які Telegram кладе в повідомлення окремим ключем. */
const ATTACHMENTS = [
  "photo",
  "document",
  "video",
  "audio",
  "voice",
  "video_note",
  "animation",
  "sticker",
] as const;

function attachmentOf(message: unknown): string | null {
  if (!message || typeof message !== "object") return null;
  const record = message as Record<string, unknown>;
  for (const key of ATTACHMENTS) {
    if (record[key]) return key;
  }
  return null;
}

/** Подія або `null`, якщо це оновлення не про людину (напр. службове). */
export function buildUserEvent(ctx: AppContext, status: "ok" | "error"): UserEventInput | null {
  const userId = ctx.from?.id;
  if (!userId) return null;

  const message = ctx.message ?? ctx.editedMessage;
  let kind: UserEventInput["kind"] = "message";
  let action = "";
  let details: string | null = null;

  if (message) {
    const text = "text" in message ? message.text : undefined;
    const caption = "caption" in message ? message.caption : undefined;

    if (text) {
      kind = text.startsWith("/") ? "command" : "message";
      action = text.startsWith("/") ? (text.split(" ")[0] ?? text).split("@")[0] : text;
    } else if (caption) {
      action = caption;
      details = attachmentOf(message);
    } else {
      const attachment = attachmentOf(message);
      action = attachment ? `[${attachment}]` : "[без тексту]";
      details = attachment;
    }
    if (ctx.editedMessage) kind = "edited_message";
  } else if (ctx.callbackQuery) {
    kind = "callback";
    action = ctx.callbackQuery.data ?? "без даних";
  } else if (ctx.inlineQuery) {
    kind = "inline_query";
    action = ctx.inlineQuery.query || "порожній запит";
  } else {
    return null;
  }

  return {
    userId,
    surface: "bot",
    kind,
    action: truncateEventText(action),
    details,
    status,
  };
}
