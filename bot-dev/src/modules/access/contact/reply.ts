/**
 * Діалог з адміном за текстовими повідомленнями в чаті.
 *
 * **Оновлюємо панель, а не надсилаємо нове повідомлення.** Кнопки «Відправити»,
 * «Відправити і завершити» і «Закрити без відправки» живуть на панелі
 * (`panel.ts`), тож після кожного написаного повідомлення ми редагуємо її — і
 * людина бачить кнопки там, де вони малюються завжди. Раніше ми надсилали
 * повідомлення з реплай-клавіатурою: у клієнтах, де вона не малюється, кнопки
 * не з'являлися взагалі, а людина лишалася без «Відправити».
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
 * Крокнути дialogом за повідомленням у чаті; `false` — це не наш текст, хай
 * далі розбирає роутер.
 */
export async function handleContactFlow(ctx: AppContext): Promise<boolean> {
  if (!ctx.user) return false;

  const text = ctx.message?.text;
  const state = readContactState(ctx.user);

  // Команда — не чернетка: `/start` лишається тим, чим є, а написане не зникає.
  if (text?.startsWith("/")) return false;

  // Діалог закритий: реагуємо лише на «Написати адміну» (текстом кнопки).
  if (!state.open && readContactAction(text ?? "") !== "write") return false;

  await deleteIncomingMessage(ctx);
  await showPanel(ctx, await applyContactAction(ctx, readContactAction(text ?? ""), text));
  return true;
}
