/**
 * Як співрозмовник підписаний — чисті функції.
 *
 * **Порядок підписів — це пріоритет, а не оформлення.** Спершу стоїть ім'я, яким
 * людину назвав **той, хто дивиться** (зі свого довідника контактів): саме воно
 * є її іменем у продукті для нього. Далі — ім'я на платформі, яке людина обрала
 * сама. І лише потім Telegram-юзернейм та ім'я з Telegram: він може зникнути, а
 * ім'я з Telegram ми не обираємо й воно може не збігатися з тим, як людину
 * знають у продукті (AGENTS.md §2).
 *
 * Чому це не в компоненті: правило «звідки береться ім'я» треба перевіряти без
 * DOM — воно однакове для списку розмов, шапки розмови й аватара.
 *
 * **`@` — синтаксис Telegram.** Клієнт Telegram перетворює `@слово` на
 * **посилання на телеграм-акаунт**, тож усе, що ним позначено, мусить справді
 * бути телеграм-акаунтом. Ім'я на платформі — не воно, тому в тексті, який
 * Telegram показує, воно йде **без позначки** (інакше «@karas» вело б людину в
 * чужий профіль, а якби такого акаунта не існувало — у нікуди), а на наших
 * поверхнях — із власною, `#` (див. `LabelSurface`). Telegram-юзернейм `@`
 * зберігає завжди: він і є телеграм-акаунт.
 *
 * @module @wwwuabot/shared/messages
 */

import type { MessagePeer } from "./types";

/** Підпис людини, про яку невідомо взагалі нічого. */
const NOBODY = "Невідомий";

/**
 * Куди піде текст підпису.
 *
 * - `app` — наша поверхня (Mini App, адмінка): ім'я на платформі позначене `#`,
 *   і це видно в рядку поруч із `@`;
 * - `telegram` — текст показує Telegram: позначки немає взагалі, бо `@` стає
 *   посиланням, а `#` — хештегом (див. `LabelSurface`).
 */
export type LabelSurface = "app" | "telegram";

/**
 * Усі підписи людини **в порядку пріоритету** — звідси береться і перший рядок,
 * і другий.
 *
 * Порожніх тут немає: усе, чого людина не має, у список не потрапляє, тож
 * `undefined` на місці підпису стояти не може.
 *
 * `withContactName` вимикається там, де підпис потрапляє в текст, який читають
 * **обоє** — ім'я з довідника належить тому, хто дивиться, тож у спільному
 * рядку воно було б іменем однієї людини, показаним іншій.
 */
function labels(
  peer: MessagePeer | null | undefined,
  withContactName: boolean,
  surface: LabelSurface,
): string[] {
  if (!peer) return [];

  // Позначка імені на платформі — тільки там, де вона нікуди не веде: `#` у
  // Telegram став би хештегом, а `@` — посиланням на чужого.
  const platformAt = surface === "app" ? "#" : "";
  const fullName = [peer.firstName, peer.lastName].filter(Boolean).join(" ").trim();
  const candidates = [
    withContactName ? peer.contactName : null,
    peer.platformUsername ? `${platformAt}${peer.platformUsername}` : null,
    peer.username ? `@${peer.username}` : null,
    fullName,
  ];

  return candidates.filter((label): label is string => Boolean(label?.trim()));
}

/** Головний підпис: наше ім'я → ім'я на платформі → Telegram-юзернейм → ім'я з Telegram. */
export function peerLabel(peer: MessagePeer | null | undefined): string {
  return labels(peer, true, "app")[0] ?? NOBODY;
}

/**
 * Підпис людини **без** чужого довідника: як її знає продукт, а не як її назвав
 * хтось.
 *
 * Потрібен там, де текст лягає в спільний рядок і його читають обоє — вітання
 * пари (див. `greeting.ts`): ім'я з довідника тут показало б одній людині те,
 * як її назвав інший.
 *
 * `surface` має значення тільки для імені на платформі: у Telegram воно йде без
 * позначки (див. `LabelSurface`) — інакше `@` повів би людину до чужого
 * телеграм-профілю, а `#` став би хештегом. Тому той, хто складає текст для
 * бота, мусить передати `"telegram"`.
 */
export function peerPublicLabel(
  peer: MessagePeer | null | undefined,
  surface: LabelSurface = "app",
): string {
  return labels(peer, false, surface)[0] ?? NOBODY;
}

/**
 * Другий рядок — наступний підпис, який **не** повторює перший.
 *
 * `null` — другого рядка немає: показувати той самий підпис двічі (коли, скажімо,
 * імені на платформі ще немає, а є лише Telegram) означало б два однакові рядки
 * підряд.
 */
export function peerSecondary(peer: MessagePeer | null | undefined): string | null {
  const all = labels(peer, true, "app");
  return all.find((label) => label !== all[0]) ?? null;
}

/**
 * Літера замість фото — так само, як у решті продукту.
 *
 * Береться вона **з того самого підпису**, який видно поруч: літера, що не
 * збігається з іменем у рядку, читалась би як чужий аватар.
 */
export function peerInitial(peer: MessagePeer | null | undefined): string {
  const source = labels(peer, true, "app")[0]?.replace(/^[@#]/u, "") ?? "";
  return source.charAt(0).toUpperCase() || "?";
}
