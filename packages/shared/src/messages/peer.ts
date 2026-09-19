/**
 * Як співрозмовник підписаний — чисті функції.
 *
 * **Ім'я на платформі йде першим** навмисно: саме воно є іменем людини в
 * продукті, і саме його вона обрала сама. Telegram-хендл лишається **другим
 * рядком**, а не заміною: він може зникнути, і тоді підпис у списку розмов
 * поїхав би на порожнє місце (AGENTS.md §2).
 *
 * Чому це не в компоненті: правило «звідки береться ім'я» треба перевіряти без
 * DOM — воно однакове для списку розмов, шапки розмови й бейджа.
 *
 * @module @wwwuabot/shared/messages
 */

import type { MessagePeer } from "./types";

/** Підпис людини без `@` і без імені взагалі — на випадок, коли невідомо все. */
const NOBODY = "Невідомий";

/** Головний підпис: ім'я на платформі → ім'я з Telegram → Telegram-хендл → номер. */
export function peerLabel(peer: MessagePeer | null | undefined): string {
  if (!peer) return NOBODY;
  if (peer.platformUsername) return `@${peer.platformUsername}`;

  const full = [peer.firstName, peer.lastName].filter(Boolean).join(" ").trim();
  if (full) return full;

  return peer.username ? `@${peer.username}` : NOBODY;
}

/**
 * Другий рядок підпису — Telegram-хендл, якщо він **не** вже в першому рядку.
 *
 * `null` — другого рядка немає: показувати той самий хендл двічі (коли імені на
 * платформі ще немає, а є лише Telegram) означало б два однакові рядки підряд.
 */
export function peerSecondary(peer: MessagePeer | null | undefined): string | null {
  if (!peer?.username) return null;
  const handle = `@${peer.username}`;
  return handle === peerLabel(peer) ? null : handle;
}

/** Літера замість фото — так само, як у решті продукту. */
export function peerInitial(peer: MessagePeer | null | undefined): string {
  const source = peer?.firstName ?? peer?.platformUsername ?? "";
  return source.trim().charAt(0).toUpperCase() || "?";
}
