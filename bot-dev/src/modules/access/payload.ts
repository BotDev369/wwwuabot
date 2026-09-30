/**
 * Код запрошення в payload — його розбір, а не застосування.
 *
 * **Де він живе.** `buildShareLinks` складає посилання з кодом останнім
 * сегментом: `mydate_1980-03-03_inv-8f3k2q`. Тобто код — це **хвіст**, а не
 * весь payload, і «відрізати код» треба перед тим, як шукати сторінку: інакше
 * адреса з кодом не знайшла б нічого (`getScenarioByBotPayload` не знає про
 * коди) і людина бачила б порожнечу.
 *
 * **Чому останнім, а не першим.** Адреса сторінки стоїть першою вже тому, що
 * її пишуть людини, а код додає той, хто ділиться. Порядок «адреса, потім код»
 * читається без довідок, і саме його видно в посиланні, яке людина копіює.
 *
 * **Чиста функція.** Розбір не ходить ні в базу, ні в Telegram: його можна
 * перевірити тестом, і він нічого не вирішує. Що з кодом зробити — вже
 * рішення `applyContactPayload`.
 *
 * @module bot-dev/src/modules/access/payload
 */

import { BOT_SEPARATOR, botPayloadSegments } from "@wwwuabot/shared/content";
import { isInviteCode } from "@wwwuabot/shared/contacts";

/** Payload без коду — те, що справді є адресою сторінки. */
export interface SplitPayload {
  /** Код запрошення, або `null`, коли його в payload немає. */
  inviteCode: string | null;
  /** Решта payload: адреса сторінки з параметрами. */
  pagePayload: string;
}

/**
 * Відокремити код запрошення від адреси.
 *
 * Кодом вважається **останній** сегмент, який пройшов `isInviteCode`. Решта —
 * адреса, навіть коли вона порожня (головна).
 */
export function splitInviteCode(payload: string): SplitPayload {
  const segments = botPayloadSegments(payload);
  const last = segments[segments.length - 1];

  if (last === undefined || !isInviteCode(last)) {
    return { inviteCode: null, pagePayload: payload };
  }

  return {
    inviteCode: last,
    pagePayload: segments.slice(0, -1).join(BOT_SEPARATOR),
  };
}
