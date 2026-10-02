/**
 * Панель діалогу — один технічний екран, який замінює попередній.
 *
 * **Статусний екран у чаті один.** Кожен натиск або написане повідомлення
 * перезаписує стан: старий екран зникає, новий стає на його місце. Раніше ми
 * лише знімали кнопки з минулого екрана й лишали текст — у чаті накопичувалося
 * три копії «Напишіть, що вас цікавить», а між ними «Діалог закрито», і людина
 * не могла зрозуміти, де вона зараз.
 *
 * **Виняток — написане.** Його не чіпаємо: людина бачить свої повідомлення, а
 * бот відповідає на них (`reply_parameters`), тож це зміст розмови, а не
 * технічний шум. Зникає тільки те, що ми надіслали самі й що не несе жодної
 * цінності: статусні екрани.
 *
 * **Один стан — одне повідомлення.** Натискання «Написати адміну» в уже відкритому
 * діалозі нічого не змінює, тож бот не відповідає взагалі: інакше кожне
 * повторне натискання народжувало б ще один екран із тим самим текстом.
 *
 * @module bot-dev/src/modules/access/contact/panel
 */

import type { InlineKeyboardMarkup } from "grammy/types";
import type { AppContext } from "../../../shared/types/env";
import { CONTACT } from "../../../shared/config/texts";
import { log } from "../../../shared/utils/debug";
import { applyContactAction, type ContactOutcome } from "./flow";
import { buildPanel, buildWriteButton, readContactCallback, type ContactState } from "./state";

/**
 * Натискання кнопки на панелі або на екрані відмови.
 *
 * `false` — це не наша кнопка: тоді далі розбере роутер (він, наприклад,
 * відкриє сторінку за звичайним `slug`).
 */
export async function handleContactCallback(ctx: AppContext): Promise<boolean> {
  const action = readContactCallback(ctx.callbackQuery?.data ?? "");
  if (!action) return false;

  await showPanel(ctx, await applyContactAction(ctx, action));
  return true;
}

/** Що показати на панелі після дії; `null` — нічого не показуємо. */
function panelView(
  outcome: ContactOutcome,
): { text: string; reply_markup: InlineKeyboardMarkup } | null {
  const state: ContactState = outcome.state;

  switch (outcome.kind) {
    case "opened":
    case "draft":
      return buildPanel(state);
    case "sent":
      return { text: CONTACT.sent, reply_markup: buildWriteButton() };
    case "closed":
      return { text: CONTACT.closed(outcome.kept), reply_markup: buildWriteButton() };
    case "failed":
      return { text: CONTACT.failed, reply_markup: buildPanel(state).reply_markup };
    case "text-only":
      return { text: CONTACT.textOnly, reply_markup: buildPanel(state).reply_markup };
    default:
      return null;
  }
}

/**
 * Надіслати панель: прибрати попередній статус і показати новий.
 *
 * `replyToMessageId` — повідомлення людини, на яке відповідаємо. Без нього
 * панель просто з'являється в чаті: так і відкривається дialog.
 */
export async function showPanel(
  ctx: AppContext,
  outcome: ContactOutcome,
  replyToMessageId?: number,
): Promise<void> {
  const view = panelView(outcome);
  if (!view || !ctx.chat?.id) return;

  await clearPreviousScreen(ctx);

  try {
    const sent = await ctx.api.sendMessage(ctx.chat.id, view.text, {
      reply_markup: view.reply_markup,
      ...(replyToMessageId ? { reply_parameters: { message_id: replyToMessageId } } : {}),
    });
    if (ctx.user) {
      ctx.user.admin_panel_id = sent.message_id;
      ctx.userDirty = true;
    }
  } catch (err) {
    log("ACCESS", "panel send failed", { error: String(err) });
  }
}

/**
 * Прибрати попередній екран дialogу: видалити статусний, зняти з нього кнопки
 * й закрити кнопку «Написати адміну» на екрані відмови.
 *
 * **Видалення — звичайний випадок, зняття кнопок — запасний.** Telegram не
 * дозволяє видаляти повідомлення старші за 48 годин: тоді ми хоча б прибираємо
 * кнопки, щоб «Відправити» не світилася там, де воно вже не діє. Гірше за зайвий
 * текст у чаті нічого немає, а стан дialogу вже в базі.
 *
 * **Екран відмови лишається** — у ньому пояснення, чому продукт закритий, і воно
 * ще потрібне: людина може закрити дialog, нічого не написавши, і пізніше
 * натиснути «Написати адміну» знову. Тому з нього тільки знімаються кнопки.
 */
async function clearPreviousScreen(ctx: AppContext): Promise<void> {
  const chatId = ctx.chat?.id;
  if (!chatId) return;

  const panelId = ctx.user?.admin_panel_id;
  if (typeof panelId === "number") {
    try {
      await ctx.api.deleteMessage(chatId, panelId);
    } catch (err) {
      log("ACCESS", "previous screen delete failed | detaching buttons", {
        message_id: panelId,
        error: String(err),
      });
      await detachButtons(ctx, panelId);
    }
  }

  // Екран відмови зберігається, тож з нього кнопка «Написати адміну» знімається.
  // Коли це той самий номер, що вже зняли, другий виклик не потрібен.
  const screenId = ctx.user?.message_id;
  if (screenId !== panelId) await detachButtons(ctx, screenId);
}

/** Зняти кнопки з повідомлення, лишивши його текст. */
async function detachButtons(ctx: AppContext, messageId?: number | null): Promise<void> {
  const chatId = ctx.chat?.id;
  if (!chatId || typeof messageId !== "number") return;

  try {
    await ctx.api.editMessageReplyMarkup(chatId, messageId, {
      reply_markup: { inline_keyboard: [] },
    });
  } catch (err) {
    log("ACCESS", "detach buttons failed", { message_id: messageId, error: String(err) });
  }
}
