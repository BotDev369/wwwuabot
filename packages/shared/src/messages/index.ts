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
 * - `greeting.ts` — одноразове вітання пари: що саме написано в стрічці;
 * - `route.ts` — адреса розмови, спільна для кнопки в боті й екрана;
 * - `time.ts` — час у списку розмов і в бульбашці;
 * - `unread.ts` — сигнал «непрочитане могло змінитись»: за ним бейдж футера
 *   перечитує число зразу, а не на наступному кроці таймера;
 * - `api.ts` — форма запиту, спільна для всіх оболонок.
 *
 * **Кому можна писати — не тут.** Правило «зв'язані через контакти» читає
 * таблицю `contacts`, тож живе на сервері (`api-dev/src/services/messages/`) і
 * в спільний модуль не переїжджає: у клієнта немає й не мусить бути доступу до
 * чужого довідника, а два описи одного правила розійшлися б.
 *
 * Сховище — таблиці `conversations`, `messages` і `message_drafts`
 * (`@wwwuabot/shared/database/tables`). Чернетка тут окрема сутність: вона
 * належить тому, хто пише, має **свій номер** і необов'язкового адресата —
 * лист буває й без «кому», і саме тому вона не слот на пару.
 *
 * @module @wwwuabot/shared/messages
 */

export { createMessagesApi } from "./api";
export type { MessagesApi, MessagesTransport } from "./api";
export {
  MAX_MESSAGE_BODY,
  MESSAGE_PREVIEW_LENGTH,
  SYSTEM_SENDER_ID,
  conversationPair,
  isSendableBody,
  messagePreview,
  peerOf,
  sanitizeMessageBody,
} from "./fields";
export { conversationGreeting, greetingNotes } from "./greeting";
export type { ConversationGreeting } from "./greeting";
export { peerInitial, peerLabel, peerPublicLabel, peerSecondary } from "./peer";
export { MESSAGES_PATH, MESSAGES_PEER_PARAM, messagesPeerPath, readMessagesPeer } from "./route";
export { messageClock, messageTime } from "./time";
export { notifyUnreadChanged, onUnreadChanged } from "./unread";
export type {
  Conversation,
  ConversationListResponse,
  Message,
  MessageBadgeResponse,
  MessageComposeResponse,
  MessageDraft,
  MessageDraftInput,
  MessageDraftResponse,
  MessagePeer,
  MessageReadResponse,
  MessageSendResponse,
  MessageThread,
  MessageThreadResponse,
} from "./types";
