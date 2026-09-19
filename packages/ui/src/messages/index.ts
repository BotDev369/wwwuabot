/**
 * @wwwuabot/ui/messages — «Повідомлення»: список розмов і поверхня розмови.
 *
 * Підключення в оболонці:
 *
 *   import { ConversationList, ThreadSheet } from "@wwwuabot/ui/messages";
 *
 * Куди саме писати й кого читати — знає оболонка (`createMessagesApi` зі своїм
 * транспортом). Тут лишається те, що однакове: як показати розмови, як
 * виглядає бульбашка й де стоїть поле вводу. Дії (`onSend`, `onOpen`) вирішує
 * оболонка — діалоги й навігація належать їй, а не картці.
 *
 * @module @wwwuabot/ui/messages
 */

export { ConversationList } from "./ConversationList";
export { MessageComposer } from "./MessageComposer";
export { ThreadSheet } from "./ThreadSheet";
export { NO_MESSAGES_LINE, conversationLine } from "./lines";
export { useStickToBottom } from "./useStickToBottom";
export type { ConversationListProps, ThreadSheetProps } from "./types";
