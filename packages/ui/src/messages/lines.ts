/**
 * Один рядок про останнє повідомлення — чиста функція.
 *
 * Логіка тут, а не в компоненті: це **правило** («що саме видно в рядку
 * розмови»), і його треба перевіряти без DOM. Компонент лише рендерить те, що
 * повернула ця функція.
 *
 * @module @wwwuabot/ui/messages
 */

import type { Conversation } from "@wwwuabot/shared/messages";
import { messagePreview } from "@wwwuabot/shared/messages";

/** Що видно в розмові, у якій ще немає жодного повідомлення. */
export const NO_MESSAGES_LINE = "Почніть розмову";

/**
 * Позначка ненадісланого тексту в рядку.
 *
 * Слово тут обов'язкове: без нього текст чернетки читався б як **уже надіслане**
 * повідомлення, і людина чекала б на відповідь на лист, який нікуди не пішов.
 */
export const DRAFT_LINE_PREFIX = "Чернетка: ";

/**
 * Рядок останнього повідомлення.
 *
 * Своє позначається словом **«Ви:»** — так само, як у будь-якому листуванні:
 * без цього «так» і «ні» в чужій розмові читались би як чужі. Саме тому список
 * знає, хто я (`meId`), а не лише текст.
 *
 * **Чернетка стоїть попереду останнього повідомлення** — це те, що людина
 * почала й не закінчила, тож рядок мусить вести саме туди. Якби вона лишалась
 * невидимою (у рядку було б старе «привіт»), ненадісланий текст не було б де
 * побачити, крім як відкривши форму навмання.
 */
export function conversationLine(conversation: Conversation, meId: number): string {
  const draft = conversation.draft?.body;
  if (draft) return `${DRAFT_LINE_PREFIX}${messagePreview(draft)}`;

  const text = conversation.lastMessageText;
  if (!text) return NO_MESSAGES_LINE;

  const preview = messagePreview(text);
  return conversation.lastSenderId === meId ? `Ви: ${preview}` : preview;
}
