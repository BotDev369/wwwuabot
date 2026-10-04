/**
 * Як співрозмовник підписаний — чисті функції, щоб правило перевірялося без DOM.
 *
 * **Порядок підписів — це пріоритет:** ім'я, яким людину назвав **той, хто
 * дивиться**, далі ім'я на платформі, і лише потім Telegram-юзернейм та ім'я з
 * Telegram (його ми не обирали, він може зникнути).
 *
 * **`@` — синтаксис Telegram:** клієнт робить із нього посилання на
 * телеграм-акаунт, тож ним позначається тільки справжній акаунт. Ім'я на платформі
 * у тексті для Telegram іде без позначки, на наших поверхнях — із `#`.
 * Розгорнуто — `docs/SURFACES.md`.
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
 * і другий; порожніх тут немає. `withContactName` вимикається там, де підпис
 * потрапляє в текст, який читають **обоє**: ім'я з довідника належить тому, хто
 * дивиться, тож у спільному рядку воно було б іменем однієї людини, показаним іншій.
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
 * Підпис людини **без** чужого довідника — там, де текст читають обоє (вітання
 * пари): ім'я з довідника показало б одній людині те, як її назвав інший.
 *
 * `surface` має значення тільки для імені на платформі: у Telegram воно йде без
 * позначки, тож складач тексту для бота мусить передати `"telegram"`.
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
