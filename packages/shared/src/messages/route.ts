/**
 * Адреса розмови — одна на бота й на платформу: розмову відкривають із двох боків
 * (бот дає кнопку, платформа цю адресу читає), тож два літерали в двох воркерах
 * розійшлися б тихо — кнопка вела б у порожній список.
 *
 * **Адреса є лише входом:** стан екрана вона не тримає. **Кому можна відкрити —
 * вирішує сервер:** номер у параметрі нікого не авторизує, тож чужий дістає ту
 * саму відмову, що й неіснуючий. Розгорнуто — `docs/SURFACES.md`.
 *
 * @module @wwwuabot/shared/messages
 */

/** Маршрут екрана повідомлень у платформі. */
export const MESSAGES_PATH = "/messages";

/** Параметр адреси: з ким саме відкрити розмову. */
export const MESSAGES_PEER_PARAM = "peer";

/**
 * Шлях до розмови з конкретною людиною.
 *
 * `peerId` тут — **Telegram-id** (той самий, що в `users.user_id`), бо саме ним
 * адресується співрозмовник у кожному запиті переписки.
 */
export function messagesPeerPath(peerId: number): string {
  return `${MESSAGES_PATH}?${MESSAGES_PEER_PARAM}=${peerId}`;
}

/**
 * Номер співрозмовника з адреси; `null` — адреса його не називає.
 *
 * Додатне ціле — не формальність: Telegram-id завжди додатний, тож нуль,
 * від'ємне й «12abc» — це не «невідомий співрозмовник», а відсутність адреси.
 */
export function readMessagesPeer(value: string | null | undefined): number | null {
  if (typeof value !== "string" || value.trim() === "") return null;
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
}
