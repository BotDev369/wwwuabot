/**
 * Один рядок про останнє повідомлення — чиста функція.
 *
 * Логіка тут, а не в компоненті: це **правило** («що саме видно в рядку
 * розмови»), і його треба перевіряти без DOM. Компонент лише рендерить те, що
 * повернула ця функція.
 *
 * @module @wwwuabot/ui/messages
 */

import type { Conversation, MessageDraft } from "@wwwuabot/shared/messages";
import { messagePreview } from "@wwwuabot/shared/messages";

/** Що видно в розмові, у якій ще немає жодного повідомлення. */
export const NO_MESSAGES_LINE = "Почніть розмову";

/**
 * Рядок чернетки — **її власний текст**, без слова «Чернетка».
 *
 * Слово тут зайве не тому, що воно погане, а тому, що його вже каже **блок**, у
 * якому рядок стоїть: у списку він один і підписаний (`Чернетки`). Повторювати
 * його в кожному рядку — це той самий факт у двох місцях.
 */
export function draftLine(draft: MessageDraft): string {
  return messagePreview(draft.body);
}

/**
 * Рядок останнього повідомлення.
 *
 * Своє позначається словом **«Ви:»** — так само, як у будь-якому листуванні:
 * без цього «так» і «ні» в чужій розмові читались би як чужі. Саме тому список
 * знає, хто я (`meId`), а не лише текст.
 */
export function conversationLine(conversation: Conversation, meId: number): string {
  const text = conversation.lastMessageText;
  if (!text) return NO_MESSAGES_LINE;

  const preview = messagePreview(text);
  return conversation.lastSenderId === meId ? `Ви: ${preview}` : preview;
}
