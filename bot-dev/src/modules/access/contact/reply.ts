/**
 * Діалог з адміном за текстовими повідомленнями в чаті.
 *
 * **Написане не видаляється.** Раніше кожне повідомлення людини зносилося, а
 * бот показував лічильник символів на екрані. Тепер бот **відповідає на саме
 * те повідомлення** (`reply_parameters`), тож воно мусить лишатися в чаті:
 * інакше відповідь повисла б у порожнечі, а людина не бачила б, що її
 * прочитали. Видаляється лише те, що не є зверненням: натискання кнопки
 * реплай-клавіатури й фото/файл/стікер.
 *
 * **Сюди потрапляє і нетекстове.** Фото, файл чи стікер у відкритому діалозі —
 * це не помилка, а «я не це читаю»: мовчки ігнорувати означало б, що повідомлення
 * загубилося.
 *
 * @module bot-dev/src/modules/access/contact/reply
 */

import type { AppContext } from "../../../shared/types/env";
import { deleteIncomingMessage } from "../../../shared/utils/message";
import { applyContactAction } from "./flow";
import { showPanel } from "./panel";
import { readContactAction, readContactState } from "./state";

/**
 * Крокнути діалогом за повідомленням у чаті; `false` — це не наш текст, хай
 * далі розбирає роутер.
 */
export async function handleContactFlow(ctx: AppContext): Promise<boolean> {
  if (!ctx.user) return false;

  const text = ctx.message?.text;
  const state = readContactState(ctx.user);

  // Команда — не чернетка: `/start` лишається тим, чим є, а написане не зникає.
  if (text?.startsWith("/")) return false;

  const action = readContactAction(text ?? "");
  // Діалог закритий: реагуємо лише на «Написати адміну» (текстом кнопки).
  if (!state.open && action !== "write") return false;

  // Натискання кнопки — це не звернення, тож повідомлення-кнопка зникає;
  // нетекст теж (його ми не читаємо, а сміття в чаті не потрібне).
  if (action !== null || text === undefined) await deleteIncomingMessage(ctx);

  const messageId = ctx.message?.message_id;
  await showPanel(
    ctx,
    await applyContactAction(ctx, action, text),
    typeof messageId === "number" ? messageId : undefined,
  );
  return true;
}
