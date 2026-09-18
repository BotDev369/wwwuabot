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
 * @module @wwwuabot/ui/contacts
 */

import type { ReactElement } from "react";
import { Icon } from "@wwwuabot/shared";
import type { Contact } from "@wwwuabot/shared/contacts";
import { CONTACT_STAGE_WORDS, contactStage, contactStats } from "./scheme";

function SchemeRow({ contact }: { contact: Contact }): ReactElement {
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
    </li>
  );
}

export function ContactsScheme({ contacts }: { contacts: readonly Contact[] }): ReactElement {
  const stats = contactStats(contacts);

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
          <SchemeRow key={contact.id} contact={contact} />
        ))}
      </ul>
    </div>
  );
}
