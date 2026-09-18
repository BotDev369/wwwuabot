/**
 * Підсумки схеми залучених — чисті числа з контактів.
 *
 * **Навіщо окремо.** «Скільки запрошено» і «скільки прийшло» — різні факти, і
 * рахувати їх у розмітці означає мати формулу в JSX, де її неможливо
 * перевірити без DOM. Тут — лійка з трьох чисел і одне правило: **лінк є —
 * запрошено; id є — прийшло**.
 *
 * Різниця між «запрошено» і «прийшло» не зводиться до `total - joined`:
 * контакт може жити **без лінка** (власник просто знає цю людину), і тоді він
 * не «очікує» — чекати нічого, бо нічого не надіслано. Тому `waiting` рахує
 * саме ті контакти, які мають код, але ще без людини.
 *
 * @module @wwwuabot/ui/contacts
 */

import type { Contact } from "@wwwuabot/shared/contacts";

export interface ContactStats {
  /** Усього контактів у довіднику. */
  total: number;
  /** Скільком уже склали особистий лінк. */
  linked: number;
  /** Скільком лінк складено, але людина ще не прийшла. */
  waiting: number;
  /** Скільки людей справді прийшло (мають Telegram-id). */
  joined: number;
  /** Скільки контактів закріпили **самі контакти** — глибина схеми. */
  nested: number;
}

export function contactStats(contacts: readonly Contact[]): ContactStats {
  let linked = 0;
  let waiting = 0;
  let joined = 0;
  let nested = 0;

  for (const contact of contacts) {
    const hasLink = contact.code !== null;
    const hasPerson = contact.telegramUserId !== null;

    if (hasLink) linked += 1;
    if (hasLink && !hasPerson) waiting += 1;
    if (hasPerson) {
      joined += 1;
      nested += contact.invitedCount;
    }
  }

  return { total: contacts.length, linked, waiting, joined, nested };
}
