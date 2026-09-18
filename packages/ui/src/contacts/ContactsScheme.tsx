/**
 * Схема залучених — те, заради чого лінк і існує.
 *
 * Список контактів відповідає на питання «хто в мене є», а схема — на «що з
 * цього вийшло»: скільком склали лінк, скільки людей прийшло й **хто з тих, хто
 * прийшов, залучив далі**. Останній пункт і робить список схемою: видно, що
 * гілка не закінчується на першому рівні.
 *
 * Схема малюється **з тих самих контактів**, а не окремим запитом: це той самий
 * факт, лише під іншим кутом, і друге джерело для нього розійшлося б із першим.
 * Числа рахує чиста `contactStats`.
 *
 * @module @wwwuabot/ui/contacts
 */

import type { ReactElement } from "react";
import { Icon } from "@wwwuabot/shared";
import type { Contact } from "@wwwuabot/shared/contacts";
import { contactStats } from "./scheme";

function SchemeRow({ contact }: { contact: Contact }): ReactElement {
  const joined = contact.telegramUserId !== null;

  return (
    <li className="wb-contact-scheme-row">
      <span className="wb-contact-scheme-node">
        {/* Знак каже, на якому кроці цей контакт: людина (`user`), надісланий
            лінк (`link`) — і нічого, якщо власник просто знає цю людину. */}
        <Icon name={joined ? "user" : contact.code ? "link" : "user"} size={14} />
        {contact.name}
      </span>

      {joined ? (
        <>
          {contact.username && <span className="wb-contact-scheme-name">@{contact.username}</span>}
          {/* Другий рівень показуємо лише тоді, коли він є: «залучив 0» — це
              рядок заради нуля. */}
          {contact.invitedCount > 0 && (
            <span className="wb-contact-scheme-nested">залучив(ла) ще {contact.invitedCount}</span>
          )}
        </>
      ) : (
        <span className="wb-contact-scheme-name wb-text-muted">
          {contact.code ? "лінк чекає" : "без лінка"}
        </span>
      )}
    </li>
  );
}

export function ContactsScheme({ contacts }: { contacts: readonly Contact[] }): ReactElement {
  const stats = contactStats(contacts);

  return (
    <div className="wb-contact-scheme">
      {/* Три числа — три кроки однієї лійки: скільки контактів узагалі,
          скільком склали лінк і скільки людей прийшло. */}
      <dl className="wb-contact-stats">
        <div className="wb-contact-stat">
          <dt>Контактів</dt>
          <dd>{stats.total}</dd>
        </div>
        <div className="wb-contact-stat">
          <dt>Запрошено</dt>
          <dd>{stats.linked}</dd>
        </div>
        <div className="wb-contact-stat">
          <dt>Приєднались</dt>
          <dd>{stats.joined}</dd>
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
