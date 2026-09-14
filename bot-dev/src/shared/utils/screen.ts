import type { AppContext } from "../types/env";
import type { ScenarioButton } from "../types/scenario";
import { getPhoto } from "./photo";
import { log } from "./debug";
import type { InputRichMessage, InlineKeyboardButton } from "grammy/types";

export interface CaptionBlocks {
  top?: string;
  mid?: string;
  bot?: string;
}

export function buildCaption(blocks: CaptionBlocks): string {
  const parts = [blocks.top, blocks.mid, blocks.bot].filter((b) => b && b.trim() !== "");
  return parts.join("\n───────\n");
}

/** Будує абсолютну адресу Mini App для поточного маршруту. */
export function buildWebAppUrl(
  baseUrl: string | undefined,
  webPath: string | undefined,
): string | null {
  if (!baseUrl || !webPath) return null;
  try {
    return new URL(webPath, baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`).toString();
  } catch {
    return null;
  }
}

/**
 * Додає системну кнопку відкриття вебсторінки, не змінюючи збережені кнопки.
 * Якщо URL не налаштований, бот працює зі звичайною клавіатурою сценарію.
 */
export function buildScreenButtons(
  screen: { buttons: readonly (readonly ScenarioButton[])[]; web_path?: string },
  platformUrl?: string,
): ScenarioButton[][] {
  const buttons = screen.buttons.map((row) => row.map((button) => ({ ...button })));
  const webAppUrl = buildWebAppUrl(platformUrl, screen.web_path);
  if (!webAppUrl) return buttons;

  const alreadyPresent = buttons.some((row) =>
    row.some((button) => button.web_app?.url === webAppUrl),
  );
  if (!alreadyPresent) {
    buttons.push([{ text: "Відкрити сторінку", web_app: { url: webAppUrl } }]);
  }
  return buttons;
}

/**
 * Відправляє нове повідомлення та видаляє старі (вхідне + попереднє від бота).
 * НІКОЛИ не редагує — тільки send + delete.
 */
export async function sendOrEditLiveMessage(ctx: AppContext): Promise<boolean> {
  if (!ctx.screen) return false;
  const { slug, photo_url, caption } = ctx.screen;
  const chatId = ctx.chat!.id;
  const buttons = buildScreenButtons(ctx.screen, ctx.env.WEB_PLATFORM_URL);

  log("SCREEN", "rendering", { slug, chat_id: chatId });

  const photoUrl = await getPhoto(slug, photo_url, ctx.env);
  const captionText = buildCaption(caption);

  // ── RICH MESSAGE ──────────────────────────────────────────────
  if (
    ctx.screen.rich_message === true &&
    ctx.screen.rich_data &&
    Array.isArray(ctx.screen.rich_data)
  ) {
    log("SCREEN:rich", "rendering rich message", { slug, chat_id: chatId });
    const richMessage: InputRichMessage = {
      blocks: ctx.screen.rich_data as unknown as InputRichMessage["blocks"],
    };

    try {
      const sent = await ctx.api.sendRichMessage(chatId, richMessage, {
        reply_markup: { inline_keyboard: buttons as unknown as InlineKeyboardButton[][] },
      });
      log("SCREEN:rich", "send success", { new_message_id: sent.message_id });

      await deleteOldMessages(ctx, chatId, sent.message_id);

      ctx.user!.message_id = sent.message_id;
      ctx.userDirty = true;
      ctx.liveMessageSent = true;
      return true;
    } catch (err) {
      log("SCREEN:rich", "send failed", { error: String(err) });
      return false;
    }
  }

  if (ctx.screen.rich_message === true) {
    log("SCREEN:rich", "rich_message is true but rich_data is invalid or empty, skipping");
    return false;
  }

  // ── ЗВИЧАЙНЕ ПОВІДОМЛЕННЯ (photo) ──────────────────────────────
  try {
    const sent = await ctx.api.sendPhoto(chatId, photoUrl, {
      caption: captionText,
      reply_markup: { inline_keyboard: buttons as unknown as InlineKeyboardButton[][] },
      parse_mode: "HTML",
    });
    log("SCREEN", "send success", { new_message_id: sent.message_id });

    await deleteOldMessages(ctx, chatId, sent.message_id);

    ctx.user!.message_id = sent.message_id;
    ctx.userDirty = true;
    ctx.liveMessageSent = true;
    return true;
  } catch (err) {
    log("SCREEN", "send failed", { error: String(err) });
    return false;
  }
}

/** Видаляє старі повідомлення: вхідне від юзера + попереднє від бота. */
async function deleteOldMessages(
  ctx: AppContext,
  chatId: number,
  newMessageId: number,
): Promise<void> {
  const idsToDelete: number[] = [];

  const oldBotMessageId = ctx.user?.message_id;
  if (typeof oldBotMessageId === "number" && oldBotMessageId !== newMessageId) {
    idsToDelete.push(oldBotMessageId);
  }

  if (ctx.message?.message_id) {
    idsToDelete.push(ctx.message.message_id);
  }

  if (idsToDelete.length === 0) return;

  try {
    await (
      ctx.api as unknown as {
        raw: {
          deleteMessages: (params: { chat_id: number; message_ids: number[] }) => Promise<unknown>;
        };
      }
    ).raw.deleteMessages({
      chat_id: chatId,
      message_ids: idsToDelete,
    });
    log("SCREEN", "deleted old messages", { ids: idsToDelete });
  } catch (err) {
    log("SCREEN", "failed to delete old messages (non-critical)", {
      error: String(err),
      ids: idsToDelete,
    });
  }
}
