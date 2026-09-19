/**
 * @wwwuabot/ui/messages — «Повідомлення»: список розмов і поверхня розмови.
 *
 * Підключення в оболонці:
 *
 *   import { ConversationList, MessagesToolbar, ThreadSheet } from "@wwwuabot/ui/messages";
 *
 * Куди саме писати й кого читати — знає оболонка (`createMessagesApi` зі своїм
 * транспортом). Тут лишається те, що однакове: як показати розмови, як
 * виглядає бульбашка й де стоїть поле вводу. Дії (`onSend`, `onOpen`) вирішує
 * оболонка — діалоги й навігація належать їй, а не картці.
 *
 * Список влаштований **як контакти**: смуга керування (пошук, фільтр, порядок,
 * групи, вигляд) із спільного `@wwwuabot/ui/collection` — повідомлення його
 * третій користувач, а не третя копія. Що саме там буває, знає `view.ts`.
 *
 * @module @wwwuabot/ui/messages
 */

export { ConversationList } from "./ConversationList";
export { MessageComposer } from "./MessageComposer";
export { MessagesToolbar } from "./MessagesToolbar";
export { NewMessagePicker } from "./NewMessagePicker";
export { ThreadSheet } from "./ThreadSheet";
export { NO_MESSAGES_LINE, conversationLine } from "./lines";
export { useStickToBottom } from "./useStickToBottom";
export { DEFAULT_MESSAGES_VIEW } from "./types";
export type {
  ConversationListProps,
  MessagesChip,
  NewMessagePickerProps,
  MessagesFilter,
  MessagesGroup,
  MessagesGroupBy,
  MessagesSort,
  MessagesToolbarProps,
  MessagesView,
  ThreadSheetProps,
} from "./types";
export {
  EMPTY_THREADS_LABEL,
  MESSAGE_FILTER_OPTIONS,
  MESSAGE_GROUP_OPTIONS,
  MESSAGE_SORT_OPTIONS,
  buildConversationGroups,
  conversationViewChips,
  filterConversations,
  sortConversations,
} from "./view";
