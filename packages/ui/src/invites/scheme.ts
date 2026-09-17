/**
 * Підсумки схеми залучених — чисті числа з лінків.
 *
 * **Навіщо окремо.** «Скільки людей прийшло» і «скільки лінків чекає» — це
 * різні факти, і рахувати їх у розмітці означає мати формулу в JSX, де її
 * неможливо перевірити без DOM. Тут — три числа й одне правило: контакт є —
 * лінк закріплений, контакту немає — чекає.
 *
 * Другий рівень (`nested`) — сума того, що закріпили **самі контакти**: саме
 * він перетворює список запрошених у схему залучених, показуючи, що гілка
 * продовжується не тобою.
 *
 * @module @wwwuabot/ui/invites
 */

import type { InviteLink } from "@wwwuabot/shared/invites";

export interface InviteStats {
  /** Скільки лінків сформовано. */
  links: number;
  /** Скільки контактів уже закріплено за власником. */
  joined: number;
  /** Скільки лінків ще чекає на людину. */
  waiting: number;
  /** Скільки контактів закріпили контакти — глибина схеми. */
  nested: number;
}

export function inviteStats(links: readonly InviteLink[]): InviteStats {
  let joined = 0;
  let nested = 0;

  for (const link of links) {
    if (!link.contact) continue;
    joined += 1;
    nested += link.contact.invitedCount;
  }

  return { links: links.length, joined, waiting: links.length - joined, nested };
}
