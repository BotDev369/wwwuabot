/**
 * Панель дialogу — inline-кнопки на останньому повідомленні бота.
 *
 * **Кнопки живуть під останнім повідомленням, і тільки під ним.** Натиснули
 * «Написати адміну» — стара кнопка зникає; написали повідомлення — зникають
 * кнопки попереднього екрана, а нові з'являються під останнім. Тому кнопки
 * треба **знімати** з минулих повідомлень (`editMessageReplyMarkup` з порожньою
 * клавіатурою), а не просто переносити: інакше в чаті накопичувалося б
 * «Відправити» під кожним написеним — і жодна не зрозуміла, яка з них тепер.
 *
 * **Відповідь на конкретне повідомлення.** Після кожного написаного бот
 * відповідає саме на нього (`reply_parameters`), а не просто надсилає в чат:
 * людині видно, до чого належить лічильник, і вона нічого не втрачає — її
 * повідомлення лишається видимим.
 *
 * **Одне повідомлення, а не стос.** Номер панелі лежить у рядку користувача
 * (`admin_panel_id`), тож наступна дія знає, з якого екрана зняти кнопки.
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
 * Показати панель: зняти кнопки з минулих екранів і надіслати нову.
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

  await detachButtons(ctx);

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
 * Зняти кнопки з усіх екранів дialogу, які вже є в чаті.
 *
 * Їх може бути два: панель із минулого кроку (`admin_panel_id`) і екран відмови,
 * з якого відкрили дialog (`users.message_id`). Номера можуть збігтися — тоді
 * це один виклик, а не два платні.
 *
 * Помилка не критична: гірше за зайву кнопку в старому повідомленні нічого
 * немає, а стан дialogу вже в базі.
 */
async function detachButtons(ctx: AppContext): Promise<void> {
  const chatId = ctx.chat?.id;
  if (!chatId) return;

  const ids = new Set<number>();
  if (typeof ctx.user?.admin_panel_id === "number") ids.add(ctx.user.admin_panel_id);
  if (typeof ctx.user?.message_id === "number") ids.add(ctx.user.message_id);

  // grammY приймає `editMessageReplyMarkup` для одного повідомлення за раз, тож
  // два екрани — це два виклики; зведення в Set прибирає дубль, коли це той
  // самий номер.
  for (const id of ids) {
    try {
      await ctx.api.editMessageReplyMarkup(chatId, id, {
        reply_markup: { inline_keyboard: [] },
      });
    } catch (err) {
      log("ACCESS", "detach buttons failed", { message_id: id, error: String(err) });
    }
  }
}
