/**
 * Чернетки в списку — **чисті функції**, без стану.
 *
 * Тут лишається те, що знає про чернетку: **хто її адресат** і як цей адресат
 * називається в рядку. Підпис береться тим самим правилом, що в листуванні
 * (`peerLabel`): інакше та сама людина в списку чернеток і в розмові звалася б
 * по-різному, і людина знайомилася б із нею двічі.
 *
 * @module @wwwuabot/ui/messages
 */

import type { MessageDraft, MessagePeer } from "@wwwuabot/shared/messages";
import { peerLabel } from "@wwwuabot/shared/messages";

/**
 * Підпис листа, у якого адресата ще не обрали.
 *
 * Це не помилка й не порожня клітинка: чернетку заводять **до** рішення про
 * адресата, і в списку мусить бути видно, що місце йому ще не вибране.
 */
export const NO_RECIPIENT_LABEL = "Без отримувача";

/** Назва блока чернеток у списку. */
export const DRAFTS_GROUP_LABEL = "Чернетки";

/**
 * Співрозмовник чернетки; `null` — адресата немає.
 *
 * Перелік `peers` — той самий, що дає сервер формі (зв'язані через контакти,
 * разом із прибраними розмовами), а чернетку заводять лише з нього: тож адресат
 * у ньому є, поки зв'язок існує.
 */
export function draftPeer(draft: MessageDraft, peers: readonly MessagePeer[]): MessagePeer | null {
  if (draft.peerId === null) return null;
  return peers.find((peer) => peer.id === draft.peerId) ?? null;
}

/**
 * Підпис рядка чернетки — адресат або чесне «Без отримувача».
 *
 * Другий випадок не помилка: лист без «кому» — це стан чернетки, і саме тому
 * його можна зберегти.
 */
export function draftRecipientLabel(draft: MessageDraft, peers: readonly MessagePeer[]): string {
  const peer = draftPeer(draft, peers);
  return peer ? peerLabel(peer) : NO_RECIPIENT_LABEL;
}
