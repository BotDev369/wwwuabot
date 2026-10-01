/**
 * Діалог з адміном через реплай-клавіатуру.
 *
 * **Другий спосіб натиснути кнопку, а не єдиний.** Клавіатура під чатом лишається
 * зручною (кнопка не треба шукати в історії), але її малює не кожен клієнт —
 * тому поряд з нею завжди є панель на повідомленні (`panel.ts`), і рішення
 * приймає потік (`flow.ts`), а не цей файл.
 *
 * **Сюди потрапляє і нетекстове.** Фото, файл чи стікер у відкритому діалозі —
 * це не помилка, а «я не це читаю»: мовчки ігнорувати означало б, що повідомлення
 * загубилося.
 *
 * @module bot-dev/src/modules/access/contact/reply
 */

import type { AppContext } from "../../../shared/types/env";
import { CONTACT } from "../../../shared/config/texts";
import { log } from "../../../shared/utils/debug";
import { deleteIncomingMessage } from "../../../shared/utils/message";
import { applyContactAction, type ContactOutcome } from "./flow";
import { buildAccessKeyboard, readContactAction, readContactState } from "./state";

/**
 * Крокнути діалогом за повідомленням у чаті; `false` — це не наш текст, хай
 * далі розбирає роутер.
 */
export async function handleContactFlow(ctx: AppContext): Promise<boolean> {
  if (!ctx.user) return false;

  const text = ctx.message?.text;
  const state = readContactState(ctx.user);

  // Діалог закритий: реагуємо лише на «Написати адміну».
  if (!state.open) return text ? startOnWrite(ctx, text) : false;

  // Команда — не чернетка: `/start` лишається тим, чим є, а написане не зникає.
  if (text?.startsWith("/")) return false;

  await deleteIncomingMessage(ctx);

  const outcome = await applyContactAction(ctx, readContactAction(text ?? ""), text);
  await present(ctx, outcome);
  return true;
}

/** Кнопка відмови натиснута: відкриваємо діалог і відповідаємо. */
async function startOnWrite(ctx: AppContext, text: string): Promise<boolean> {
  if (readContactAction(text) !== "write") return false;

  await deleteIncomingMessage(ctx);
  await present(ctx, await applyContactAction(ctx, "write"));
  return true;
}

/** Показати людині наслідок дії клавіатурою під чатом. */
async function present(ctx: AppContext, outcome: ContactOutcome): Promise<void> {
  const message = messageFor(outcome);
  if (!message || !ctx.chat?.id) return;

  try {
    await ctx.api.sendMessage(ctx.chat.id, message, {
      reply_markup: buildAccessKeyboard(outcome.state),
    });
  } catch (err) {
    log("ACCESS", "contact message failed", { error: String(err) });
  }
}

function messageFor(outcome: ContactOutcome): string | null {
  switch (outcome.kind) {
    case "opened":
      return CONTACT.started;
    case "draft":
      return outcome.truncated ? CONTACT.limit : CONTACT.appended(outcome.state.draft.length);
    case "sent":
      return CONTACT.sent;
    case "closed":
      return CONTACT.closed(outcome.kept);
    case "failed":
      return CONTACT.failed;
    case "text-only":
      return CONTACT.textOnly;
    default:
      return null;
  }
}
