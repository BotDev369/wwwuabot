/**
 * Підсумкові числа контактів — три плашки в шапці екрана.
 *
 * Список відповідає на питання «хто в мене є», а числа — на «що з цього
 * вийшло»: скільки контактів узагалі, скільки людей зайшло **в бота** й
 * скільки дійшло **до платформи**. Останній крок і є тим, що відрізняє часткове
 * приєднання від повного.
 *
 * **Три плашки, а не рядок тексту.** Числа читають **порівнюючи**, тож вони
 * стоять сіткою з рівних клітинок: число великим, підпис під ним. У рядку
 * підписів числа губились, і лійка переставала бути видною.
 *
 * **Це не три назви одного.** «Всього ≥ Бот ≥ Платформа» — лійка, і кожен крок
 * менший за попередній: людина може зайти в бота й не відкрити Mini App, а
 * контакт може лежати в довіднику взагалі без лінка. Друге джерело для чисел не
 * потрібне — вони рахуються з тих самих контактів (`contactStats`), бо це той
 * самий факт під іншим кутом.
 *
 * **Числа — про людей, записи — про власника.** Два лінки на ту саму людину
 * дають два записи й **одну** людину в «у боті». Раніше під числами стояв
 * рядок-пояснення; тепер його немає навмисно: різницю видно там, де вона й
 * виникає — у списку, де другий запис підписаний «та сама людина, що …». Числа
 * без пояснення не брешуть: «всього» рахує **усі** записи, а не лише запрошені.
 *
 * Числа стоять у шапці, а не окремим блоком: блок унизу екрана відсував би їх
 * від заголовка — за ними треба було б прокручувати рівно тоді, коли список
 * довгий, а питають про них саме тоді.
 *
 * @module @wwwuabot/ui/contacts
 */

import type { ReactElement } from "react";
import type { Contact } from "@wwwuabot/shared/contacts";
import { contactStats } from "./scheme";

export function ContactTotals({ contacts }: { contacts: readonly Contact[] }): ReactElement {
  const stats = contactStats(contacts);

  return (
    <dl className="wb-contact-stats">
      <div className="wb-contact-stat">
        <dt className="wb-contact-stat-label">Всього</dt>
        <dd className="wb-contact-stat-value">{stats.total}</dd>
      </div>
      <div className="wb-contact-stat">
        <dt className="wb-contact-stat-label">Бот</dt>
        <dd className="wb-contact-stat-value">{stats.bot}</dd>
      </div>
      <div className="wb-contact-stat">
        <dt className="wb-contact-stat-label">Платформа</dt>
        <dd className="wb-contact-stat-value">{stats.platform}</dd>
      </div>
    </dl>
  );
}
