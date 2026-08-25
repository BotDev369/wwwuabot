import type { AppContext } from "../types/env";
import { getPhoto } from "./photo";
import { getErrorMessage, isMessageNotFound, isMessageNotModified } from "../../core/errors";
import { log } from "./debug";
import { replaceQtyInButtons, replaceCartInfo } from "./placeholders";
import { getFamilyBox } from "./family-box";
import type { InputRichMessage } from "grammy/types";

export interface CaptionBlocks {
  top?: string;
  mid?: string;
  bot?: string;
}

export function buildCaption(blocks: CaptionBlocks): string {
  const parts = [blocks.top, blocks.mid, blocks.bot].filter(b => b && b.trim() !== "");
  return parts.join("\n───────\n");
}

function buildPickKeyboard(ctx: AppContext): any[][] {
  if (!ctx.pickTarget || !ctx.screen) return ctx.screen?.buttons || [];
  const target = ctx.pickTarget;
  const qtyOptionsStr = ctx.screen.qty_options;
  const options: string[] = qtyOptionsStr
    ? qtyOptionsStr.split(",").map((s: string) => s.trim()).filter((s: string) => s)
    : ["1"];

  const keyboard: any[][] = [];
  const ROW_SIZE = 3;
  for (let i = 0; i < options.length; i += ROW_SIZE) {
    const row = options.slice(i, i + ROW_SIZE).map((opt: string) => ({
      text: opt,
      callback_data: `@set:${target}:${opt}`
    }));
    keyboard.push(row);
  }

  keyboard.push([{
    text: "◀ Назад",
    callback_data: ctx.screen.codeword
  }]);

  return keyboard;
}

export async function sendOrEditLiveMessage(ctx: AppContext): Promise<boolean> {
  if (!ctx.screen) return false;
  const { codeword, photo_url, caption, buttons: originalButtons } = ctx.screen;
  const chatId = ctx.chat!.id;
  const keyboard = ctx.pickTarget ? buildPickKeyboard(ctx) : originalButtons;

  let messageId = ctx.user?.message_id as number | null | undefined;
  const oldLiveId = typeof messageId === "number" ? messageId : null;

  log("SCREEN", "rendering", { codeword, chat_id: chatId, existing_message_id: messageId ?? null, is_pick: !!ctx.pickTarget });

  const photoUrl = await getPhoto(codeword, photo_url, ctx.env);

  const family = ctx.screen.codeword.includes("_")
    ? ctx.screen.codeword.split("_")[0]
    : ctx.screen.codeword;
  const shortKey = ctx.screen.codeword.includes("_")
    ? ctx.screen.codeword.substring(family.length + 1)
    : ctx.screen.codeword;

  const box = getFamilyBox(ctx.user, family);
  const cart = box.cart || {};
  const item = cart[shortKey];

  let botCaption = "";
  if (item) {
    const qty = Number(item.qty) || 0;
    const price = Number(item.price) || 0;
    const sum = price * qty;
    botCaption = `✅ Додано у кошик -> ${qty} шт = ${sum}₴`;
  }

  const processedCaption = {
    top: replaceCartInfo(caption?.top, family, ctx),
    mid: replaceCartInfo(caption?.mid, family, ctx),
    bot: botCaption,
  };

  const captionText = buildCaption(processedCaption);
  const finalKeyboard = replaceQtyInButtons(keyboard, ctx);

  // ── ГІЛКА ДЛЯ RICH MESSAGE ──────────────────────────────────
  if (ctx.screen.rich_message === true && ctx.screen.rich_data && Array.isArray(ctx.screen.rich_data)) {
    log("SCREEN:rich", "rendering rich message", { codeword, chat_id: chatId });
    const richMessage: InputRichMessage = {
      blocks: ctx.screen.rich_data as any,
    };

    // 1. Спроба EDIT через editMessageText + параметр rich_message
    if (messageId) {
      log("SCREEN:rich", "attempting edit", { message_id: messageId });
      try {
        await ctx.api.editMessageText(chatId, messageId, richMessage, {
          reply_markup: { inline_keyboard: finalKeyboard },
        });
        log("SCREEN:rich", "edit success", { message_id: messageId });
        ctx.liveMessageSent = true;
        return true;
      } catch (err) {
        const errMsg = getErrorMessage(err);
        if (isMessageNotModified(err)) {
          log("SCREEN:rich", "edit skipped — content identical, will resend", { message_id: messageId });
          messageId = null;
        }
        if (isMessageNotFound(err)) {
          log("SCREEN:rich", "edit failed — message gone, will send new", { reason: errMsg });
          messageId = null;
        } else {
          log("SCREEN:rich", "edit failed — falling back to send", { reason: errMsg });
          messageId = null;
        }
      }
    }

    // 2. SEND нового повідомлення
    try {
      const sent = await ctx.api.sendRichMessage(chatId, richMessage, {
        reply_markup: { inline_keyboard: finalKeyboard },
      });
      log("SCREEN:rich", "send success", { new_message_id: sent.message_id });

      const idsToDelete: number[] = [];
      if (ctx.user?.message_id) idsToDelete.push(ctx.user.message_id as number);
      if (ctx.message?.message_id) idsToDelete.push(ctx.message.message_id);

      if (idsToDelete.length > 0) {
        try {
          await (ctx.api as any).raw.deleteMessages({
            chat_id: chatId,
            message_ids: idsToDelete,
          });
          log("SCREEN:rich", "deleted old messages", { ids: idsToDelete });
        } catch (err) {
          log("SCREEN:rich", "failed to delete old messages (non-critical)", {
            error: getErrorMessage(err),
            ids: idsToDelete
          });
        }
      }

      ctx.user!.message_id = sent.message_id;
      ctx.userDirty = true;
      ctx.liveMessageSent = true;
      return true;
    } catch (err) {
      log("SCREEN:rich", "send failed", { error: getErrorMessage(err) });
      console.error(`[Screen:Rich] Send error: ${getErrorMessage(err)}`);
      return false;
    }
  }

  // Якщо rich_message === true, але rich_data невалідний
  if (ctx.screen.rich_message === true) {
    log("SCREEN:rich", "rich_message is true but rich_data is invalid or empty, skipping");
    return false;
  }

  // ── ЗВИЧАЙНА ГІЛКА (photo) ──────────────────────────────────
  if (messageId) {
    log("SCREEN", "attempting edit", { message_id: messageId });
    try {
      await ctx.api.editMessageMedia(chatId, messageId, {
        type: "photo",
        media: photoUrl,
        caption: captionText,
        parse_mode: "HTML",
      }, { reply_markup: { inline_keyboard: finalKeyboard } });
      log("SCREEN", "edit success", { message_id: messageId });
      ctx.liveMessageSent = true;
      return true;
    } catch (err) {
      const errMsg = getErrorMessage(err);
      if (isMessageNotModified(err)) {
        log("SCREEN", "edit skipped — content identical, will resend", { message_id: messageId });
        messageId = null;
      }
      if (isMessageNotFound(err)) {
        log("SCREEN", "edit failed — message deleted, will send new", { reason: errMsg });
        messageId = null;
      } else {
        log("SCREEN", "edit failed — unhandled error", { reason: errMsg });
        console.error(`[Screen] Unhandled edit error: ${errMsg}`);
        messageId = null;
      }
    }
  }

  log("SCREEN", "sending new message");
  try {
    const sent = await ctx.api.sendPhoto(chatId, photoUrl, {
      caption: captionText,
      reply_markup: { inline_keyboard: finalKeyboard },
      parse_mode: "HTML",
    });
    log("SCREEN", "send success", { new_message_id: sent.message_id });
    if (oldLiveId && oldLiveId !== sent.message_id) {
      try {
        await (ctx.api as any).raw.deleteMessages({
          chat_id: chatId,
          message_ids: [oldLiveId],
        });
        log("SCREEN", "deleted old live message", { id: oldLiveId });
      } catch (err) {
        log("SCREEN", "failed to delete old live message (non-critical)", { error: getErrorMessage(err), id: oldLiveId });
      }
    }
    ctx.user!.message_id = sent.message_id;
    ctx.userDirty = true;
    ctx.liveMessageSent = true;
    return true;
  } catch (err) {
    log("SCREEN", "send failed", { reason: getErrorMessage(err) });
    console.error(`[Screen] Send error: ${getErrorMessage(err)}`);
    return false;
  }
}