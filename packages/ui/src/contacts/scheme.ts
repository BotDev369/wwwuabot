/**
 * Стадія контакту й підсумки схеми — чисті числа з контактів.
 *
 * **Навіщо окремо.** «Запрошено», «зайшов у бота» і «зайшов на платформу» —
 * три різні факти, і рахувати їх у розмітці означає мати формулу в JSX, де її
 * неможливо перевірити без DOM. Тут — стадія одного контакту й лійка з трьох
 * чисел.
 *
 * **Стадія — це порядок, а не сума.** Людина, яка зайшла на платформу, зайшла
 * й у бота: дати обидві, і старша стадія не «втрачає» молодшу. Тому
 * `contactStage` дивиться з кінця — від повного приєднання до простого лінка,
 * — а не збирає прапорці.
 *
 * **Контакт без лінка — не «очікує».** Він нікого не запрошував, і чекати
 * нічого: тому в нього власна стадія (`none`), і в жодне число лійки він не
 * потрапляє, крім «контактів».
 *
 * @module @wwwuabot/ui/contacts
 */

import type { Contact } from "@wwwuabot/shared/contacts";

/**
 * Де контакт зупинився.
 *
 * - `none` — лінка немає, людину просто занесли в довідник;
 * - `invited` — лінк складено, але за ним ніхто не прийшов;
 * - `bot` — людина зайшла в бота: **часткове** приєднання;
 * - `platform` — людина зайшла на платформу: приєднання повне.
 */
export type ContactStage = "none" | "invited" | "bot" | "platform";

export function contactStage(contact: Contact): ContactStage {
  if (contact.joinedPlatformAt) return "platform";
  if (contact.joinedBotAt) return "bot";
  return contact.code ? "invited" : "none";
}

/** Слова стадій — одним місцем: список і картка мусять казати те саме. */
export const CONTACT_STAGE_WORDS: Record<ContactStage, string> = {
  none: "без лінка",
  invited: "лінк чекає",
  bot: "зайшов у бота",
  platform: "приєднався",
};

export interface ContactStats {
  /** Усього контактів у довіднику. */
  total: number;
  /** Скільком уже склали особистий лінк. */
  invited: number;
  /** Скільком лінк складено, але людина ще не зайшла **в бота**. */
  waiting: number;
  /** Скільки людей зайшло в бота (часткове приєднання). */
  bot: number;
  /** Скільки людей зайшло **на платформу** (повне приєднання). */
  platform: number;
  /** Скільком залучили далі **самі контакти** — глибина схеми. */
  nested: number;
}

export function contactStats(contacts: readonly Contact[]): ContactStats {
  let invited = 0;
  let waiting = 0;
  let bot = 0;
  let platform = 0;
  let nested = 0;

  for (const contact of contacts) {
    const stage = contactStage(contact);

    if (stage !== "none") invited += 1;
    if (stage === "invited") waiting += 1;
    // `bot` — це «зайшов у бота хоч раз»: і часткове приєднання, і повне
    // проходять через нього, тож лійка не має дірок.
    if (stage === "bot" || stage === "platform") {
      bot += 1;
      nested += contact.invitedCount;
    }
    if (stage === "platform") platform += 1;
  }

  return { total: contacts.length, invited, waiting, bot, platform, nested };
}
