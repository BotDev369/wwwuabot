/**
 * Схема залучених — те, заради чого лінк і існує.
 *
 * Список контактів відповідає на питання «хто в мене є», а схема — на «що з
 * цього вийшло»: скільком склали лінк, скільки людей зайшло **в бота** й
 * скільки дійшло **до платформи**, а також хто з тих, хто прийшов, залучив
 * далі. Останній пункт і робить список схемою: видно, що гілка не закінчується
 * на першому рівні.
 *
 * **Три числа — не три назви одного.** «Запрошено / у боті / приєднались» —
 * це лійка, і кожен крок менший за попередній: людина може зайти в бота й не
 * відкрити платформу, і саме ця різниця тут і видна. Друге джерело для неї не
 * потрібне — числа рахуються з тих самих контактів (`contactStats`), бо це той
 * самий факт під іншим кутом.
 *
 * **Числа — про людей, записи — про власника.** Два лінки на ту саму людину
 * дають два записи й **одну** людину в лійці; тому рядок-близнюк підписаний
 * (`та сама людина, що «Карась 2»`), а під числами стоїть пояснення. Без
 * підпису «запрошено 2 → у боті 1» читалось би як діра в схемі, хоч це правда.
 *
 * @module @wwwuabot/ui/contacts
 */

import type { ReactElement } from "react";
import { Icon } from "@wwwuabot/shared";
import type { Contact } from "@wwwuabot/shared/contacts";
import {
  CONTACT_STAGE_WORDS,
  contactStage,
  contactStats,
  recordWord,
  samePersonAs,
} from "./scheme";

function SchemeRow({ contact, twin }: { contact: Contact; twin?: string }): ReactElement {
  const stage = contactStage(contact);

  return (
    <li className="wb-contact-scheme-row">
      <span className="wb-contact-scheme-node">
        {/* Знак каже, на якому кроці цей контакт: людина (`user`), надісланий
            лінк (`link`) — і нічого, якщо власник просто знає цю людину. */}
        <Icon name={contact.joinedBotAt ? "user" : contact.code ? "link" : "user"} size={14} />
        {contact.name}
      </span>

      {contact.username && <span className="wb-contact-scheme-name">@{contact.username}</span>}
      {/* Стадію кажемо **словом** і лише тоді, коли вона не «приєднався»: для
          повного приєднання це шум, а от «у боті» — саме те, що варто бачити. */}
      {stage !== "platform" && (
        <span className="wb-contact-scheme-stage">{CONTACT_STAGE_WORDS[stage]}</span>
      )}
      {/* Другий рівень показуємо лише тоді, коли він є: «залучив 0» — це рядок
          заради нуля. */}
      {contact.invitedCount > 0 && (
        <span className="wb-contact-scheme-nested">залучив(ла) ще {contact.invitedCount}</span>
      )}
      {/* Близнюк мусить бути підписаний: інакше два рядки з однаковим id
          виглядають як два різні люди, і числа під ними здаються зламаними. */}
      {twin !== undefined && (
        <span className="wb-contact-scheme-twin">та сама людина, що «{twin}»</span>
      )}
    </li>
  );
}

export function ContactsScheme({ contacts }: { contacts: readonly Contact[] }): ReactElement {
  const stats = contactStats(contacts);
  const twins = samePersonAs(contacts);

  return (
    <div className="wb-contact-scheme">
      {/* Три кроки однієї лійки: скільком склали лінк, скільки людей зайшло в
          бота й скільки дійшло до платформи. */}
      <dl className="wb-contact-stats">
        <div className="wb-contact-stat">
          <dt>Запрошено</dt>
          <dd>{stats.invited}</dd>
        </div>
        <div className="wb-contact-stat">
          <dt>У боті</dt>
          <dd>{stats.bot}</dd>
        </div>
        <div className="wb-contact-stat">
          <dt>Приєднались</dt>
          <dd>{stats.platform}</dd>
        </div>
      </dl>

      {/* Чому число менше за попереднє — сказано тут, а не в голові власника:
          дублі не помилка, вони просто не подвоюють людину. */}
      {stats.duplicates > 0 && (
        <p className="wb-contact-twins-note">
          Ще {recordWord(stats.duplicates)} про тих самих людей: у числах кожна людина порахована
          один раз.
        </p>
      )}

      {/* Другий рівень — одне речення, а не ще три числа: це підсумок того,
          що видно нижче в рядках, і повторювати його окремою сіткою означало б
          сказати те саме двічі. */}
      {stats.nested > 0 && (
        <p className="wb-contact-nested-total">
          Ваші контакти залучили ще {stats.nested} — гілка продовжується.
        </p>
      )}

      <ul className="wb-contact-scheme-list">
        <li className="wb-contact-scheme-root">
          <Icon name="user" size={14} />
          Ви
        </li>
        {contacts.map((contact) => (
          <SchemeRow key={contact.id} contact={contact} twin={twins.get(contact.id)} />
        ))}
      </ul>
    </div>
  );
}
