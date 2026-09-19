/**
 * Як співрозмовник підписаний — чисті функції.
 *
 * **Порядок підписів — це пріоритет, а не оформлення.** Спершу стоїть ім'я, яким
 * людину назвав **той, хто дивиться** (зі свого довідника контактів): саме воно
 * є її іменем у продукті для нього. Далі — ім'я на платформі, яке людина обрала
 * сама. І лише потім Telegram-хендл та ім'я з Telegram: хендл може зникнути, а
 * ім'я з Telegram ми не обираємо й воно може не збігатися з тим, як людину
 * знають у продукті (AGENTS.md §2).
 *
 * Чому це не в компоненті: правило «звідки береться ім'я» треба перевіряти без
 * DOM — воно однакове для списку розмов, шапки розмови й аватара.
 *
 * @module @wwwuabot/shared/messages
 */

import type { MessagePeer } from "./types";

/** Підпис людини, про яку невідомо взагалі нічого. */
const NOBODY = "Невідомий";

/**
 * Усі підписи людини **в порядку пріоритету** — звідси береться і перший рядок,
 * і другий.
 *
 * Порожніх тут немає: усе, чого людина не має, у список не потрапляє, тож
 * `undefined` на місці підпису стояти не може.
 */
function labels(peer: MessagePeer | null | undefined): string[] {
  if (!peer) return [];

  const fullName = [peer.firstName, peer.lastName].filter(Boolean).join(" ").trim();
  const candidates = [
    peer.contactName,
    peer.platformUsername ? `@${peer.platformUsername}` : null,
    peer.username ? `@${peer.username}` : null,
    fullName,
  ];

  return candidates.filter((label): label is string => Boolean(label?.trim()));
}

/** Головний підпис: наше ім'я → ім'я на платформі → Telegram-хендл → ім'я з Telegram. */
export function peerLabel(peer: MessagePeer | null | undefined): string {
  return labels(peer)[0] ?? NOBODY;
}

/**
 * Другий рядок — наступний підпис, який **не** повторює перший.
 *
 * `null` — другого рядка немає: показувати той самий підпис двічі (коли, скажімо,
 * імені на платформі ще немає, а є лише Telegram) означало б два однакові рядки
 * підряд.
 */
export function peerSecondary(peer: MessagePeer | null | undefined): string | null {
  const all = labels(peer);
  return all.find((label) => label !== all[0]) ?? null;
}

/**
 * Літера замість фото — так само, як у решті продукту.
 *
 * Береться вона **з того самого підпису**, який видно поруч: літера, що не
 * збігається з іменем у рядку, читалась би як чужий аватар.
 */
export function peerInitial(peer: MessagePeer | null | undefined): string {
  const source = labels(peer)[0]?.replace(/^@/u, "") ?? "";
  return source.charAt(0).toUpperCase() || "?";
}
