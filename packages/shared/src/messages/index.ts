/**
 * @wwwuabot/shared/messages — повідомлення між людьми платформи: правила,
 * типи й клієнт.
 *
 * Один домен на сервер і на оболонку:
 *
 * - `types.ts` — форми повідомлення, розмови й відповідей;
 * - `fields.ts` — тіло повідомлення (`sanitizeMessageBody`) і пара розмови
 *   (`conversationPair`): **єдине** місце, де задано, що розмова одна на двох;
 * - `peer.ts` — як підписаний співрозмовник (ім'я на платформі → Telegram);
 * - `time.ts` — час у списку розмов і в бульбашці;
 * - `api.ts` — форма запиту, спільна для всіх оболонок.
 *
 * **Кому можна писати — не тут.** Правило «зв'язані через контакти» читає
 * таблицю `contacts`, тож живе на сервері (`api-dev/src/services/messages/`) і
 * в спільний модуль не переїжджає: у клієнта немає й не мусить бути доступу до
 * чужого довідника, а два описи одного правила розійшлися б.
 *
 * Сховище — таблиці `conversations` і `messages`
 * (`@wwwuabot/shared/database/tables`).
 *
 * @module @wwwuabot/shared/messages
 */

export { createMessagesApi } from "./api";
export type { MessagesApi, MessagesTransport } from "./api";
export {
  MAX_MESSAGE_BODY,
  MESSAGE_PREVIEW_LENGTH,
  conversationPair,
  isSendableBody,
  messagePreview,
  peerOf,
  sanitizeMessageBody,
} from "./fields";
export { peerInitial, peerLabel, peerSecondary } from "./peer";
export { messageClock, messageTime } from "./time";
export type {
  Conversation,
  ConversationListResponse,
  Message,
  MessageBadgeResponse,
  MessagePeer,
  MessageReadResponse,
  MessageSendResponse,
  MessageThread,
  MessageThreadResponse,
} from "./types";
