/**
 * Панель дialogу — inline-кнопки на самому повідомленні.
 *
 * **Чому панель, а не тільки клавіатура під чатом.** Реплай-клавіатура
 * малюється не в кожному клієнті й не завжди (буває, не з'являється зовсім —
 * ми на це наступили), а кнопка на повідомленні малюється завжди. Тому панель
 * — основний спосіб натиснути кнопку, а клавіатура лишається дублем під чатом.
 *
 * **Одне повідомлення, а не стос.** Номер панелі лежить у рядку користувача
 * (`admin_panel_id`), тож наступна дія редагує те саме повідомлення: у чаті
 * не накопичується «Відправити / Записано / Записано».
 *
 * @module bot-dev/src/modules/access/contact/panel
 */

import type { InlineKeyboardMarkup } from "grammy/types";
import type { AppContext } from "../../../shared/types/env";
import { CONTACT } from "../../../shared/config/texts";
import { log } from "../../../shared/utils/debug";
import { applyContactAction, type ContactOutcome } from "./flow";
import { buildPanel, readContactCallback, type ContactState } from "./state";

/** Кнопка «Написати адміну» для екрана відмови. */
export function buildWriteButton(): InlineKeyboardMarkup {
  return { inline_keyboard: [[{ text: CONTACT.write, callback_data: "contact:write" }]] };
}

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

/** Що показати на панелі після дії. */
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
 * Надіслати або відредагувати панель.
 *
 * Редагування — звичайний випадок, надсилання — коли повідомлення видалили або
 * його вже немає (номер живий, повідомлення мертве). Помилка редагування не
 *-critical: гірше за відсутність панелі нічого немає, а стан у базі вже є.
 */
async function showPanel(ctx: AppContext, outcome: ContactOutcome): Promise<void> {
  const view = panelView(outcome);
  if (!view || !ctx.chat?.id) return;

  const panelId = ctx.user?.admin_panel_id;
  if (typeof panelId === "number") {
    try {
      await ctx.api.editMessageText(ctx.chat.id, panelId, view.text, {
        reply_markup: view.reply_markup,
      });
      return;
    } catch (err) {
      log("ACCESS", "panel edit failed | sending a new one", { error: String(err) });
    }
  }

  try {
    const sent = await ctx.api.sendMessage(ctx.chat.id, view.text, {
      reply_markup: view.reply_markup,
    });
    if (ctx.user) {
      ctx.user.admin_panel_id = sent.message_id;
      ctx.userDirty = true;
    }
  } catch (err) {
    log("ACCESS", "panel send failed", { error: String(err) });
  }
}
