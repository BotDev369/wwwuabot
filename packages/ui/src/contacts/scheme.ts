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
 * **Числа рахують людей, а не картки.** Той самий лінк можна скласти двічі, і
 * людина пройде за обома — тоді в довіднику два записи, а людина одна. Якщо
 * рахувати рядки, лійка показує «2 у боті» там, де людина одна, і цифра
 * перестає бути правдою саме в того, хто перевіряє застосунок. Тому «у боті» й
 * «приєднались» рахуються **унікальними людьми** (`joinedUserId`), а
 * «запрошено» лишається числом лінків: у людини немає id, поки вона не прийшла.
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

/**
 * Ключ людини для підрахунку.
 *
 * Зазвичай це Telegram-id. Якщо id немає (рядок зі стадією приєднання без
 * ідентифікатора — такого бути не має, але база цього не забороняє), ключем
 * стає сам рядок: порахований один раз, а не втрачений.
 */
function personKey(contact: Contact): string {
  return contact.joinedUserId === null ? `row:${contact.id}` : `tg:${contact.joinedUserId}`;
}

/**
 * Хто з контактів — **та сама людина**: `id контакту → ім'я першого запису`.
 *
 * Першим уважається той, кого власник бачить **вище**: підпис має вказувати на
 * запис, до якого його читають очима, а не на «старіший за датою» — людина
 * заходить за обома посиланнями майже одночасно, і дата тут не вирішує нічого.
 *
 * Контакт без Telegram-id близнюка мати не може: близнюків робить **людина**, а
 * не ім'я, тож порожній id нікого ні з ким не зближує.
 */
export function samePersonAs(contacts: readonly Contact[]): Map<number, string> {
  const first = new Map<number, string>();
  const twins = new Map<number, string>();

  for (const contact of contacts) {
    if (contact.joinedUserId === null) continue;

    const known = first.get(contact.joinedUserId);
    if (known === undefined) first.set(contact.joinedUserId, contact.name);
    else twins.set(contact.id, known);
  }

  return twins;
}

/**
 * Слово для кількості записів: «1 запис», «2 записи», «5 записів».
 *
 * Числа 11–14 — окремий випадок української мови: «11 записів», а не
 * «11 запис» за останньою цифрою.
 */
export function recordWord(count: number): string {
  const tail = count % 100;
  if (tail >= 11 && tail <= 14) return `${count} записів`;

  switch (count % 10) {
    case 1:
      return `${count} запис`;
    case 2:
    case 3:
    case 4:
      return `${count} записи`;
    default:
      return `${count} записів`;
  }
}

export interface ContactStats {
  /** Усього контактів у довіднику — **записів**, а не людей. */
  total: number;
  /** Скільком уже склали особистий лінк. */
  invited: number;
  /** Скільком лінк складено, але людина ще не зайшла **в бота**. */
  waiting: number;
  /** Скільки людей зайшло в бота (часткове приєднання). */
  bot: number;
  /** Скільки людей зайшло **на платформу** (повне приєднання). */
  platform: number;
  /** Скільком залучили далі **самі люди з контактів** — глибина схеми. */
  nested: number;
  /** Скільки записів описують людину, про яку вже є запис вище. */
  duplicates: number;
}

export function contactStats(contacts: readonly Contact[]): ContactStats {
  let invited = 0;
  let waiting = 0;
  let duplicates = 0;
  // Людина в лійці — один запис у мапі, хоч би скільки карток її описувало.
  const people = new Map<string, { platform: boolean; nested: number }>();

  for (const contact of contacts) {
    const stage = contactStage(contact);

    if (stage !== "none") invited += 1;
    if (stage === "invited") waiting += 1;
    // `bot` — це «зайшов у бота хоч раз»: і часткове приєднання, і повне
    // проходять через нього, тож лійка не має дірок.
    if (stage !== "bot" && stage !== "platform") continue;

    const key = personKey(contact);
    const person = people.get(key);

    if (person === undefined) {
      people.set(key, { platform: stage === "platform", nested: contact.invitedCount });
      continue;
    }

    duplicates += 1;
    // Свій рядок може відстати від близнюка (застарів у базі) — беремо більший
    // рахунок: менший сказав би, що людина залучила менше, ніж залучила.
    if (stage === "platform") person.platform = true;
    if (contact.invitedCount > person.nested) person.nested = contact.invitedCount;
  }

  let platform = 0;
  let nested = 0;
  for (const person of people.values()) {
    if (person.platform) platform += 1;
    nested += person.nested;
  }

  return {
    total: contacts.length,
    invited,
    waiting,
    bot: people.size,
    platform,
    nested,
    duplicates,
  };
}
