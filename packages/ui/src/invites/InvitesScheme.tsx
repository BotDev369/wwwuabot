/**
 * Схема залучених — те, заради чого лінк і існує.
 *
 * Список лінків відповідає на питання «що я надіслав», а схема — на «що з цього
 * вийшло»: скільки людей прийшло, скільки ще не прийшло й **хто з тих, хто
 * прийшов, залучив далі**. Останній пункт і робить список схемою: видно, що
 * гілка не закінчується на першому рівні.
 *
 * Схема малюється **з тих самих лінків**, а не окремим запитом: це той самий
 * факт, лише під іншим кутом, і друге джерело для нього розійшлося б із першим.
 *
 * @module @wwwuabot/ui/invites
 */

import type { ReactElement } from "react";
import { Icon } from "@wwwuabot/shared";
import type { InviteLink } from "@wwwuabot/shared/invites";
import { inviteStats } from "./scheme";

function SchemeRow({ link }: { link: InviteLink }): ReactElement {
  const contact = link.contact;

  return (
    <li className={`wb-invite-scheme-row wb-invite-scheme-row--${contact ? "joined" : "waiting"}`}>
      <span className="wb-invite-scheme-node">
        <Icon name={contact ? "user" : "link"} size={14} />
        {link.label.trim() || "Без підпису"}
      </span>

      {contact ? (
        <>
          <span className="wb-invite-scheme-name">{contact.name}</span>
          {/* Другий рівень показуємо лише тоді, коли він є: «залучив 0» — це
              рядок заради нуля. */}
          {contact.invitedCount > 0 && (
            <span className="wb-invite-scheme-nested">залучив(ла) ще {contact.invitedCount}</span>
          )}
        </>
      ) : (
        <span className="wb-invite-scheme-name wb-text-muted">ще не приєднався</span>
      )}
    </li>
  );
}

export function InvitesScheme({ links }: { links: readonly InviteLink[] }): ReactElement {
  const stats = inviteStats(links);

  return (
    <div className="wb-invite-scheme">
      {/* Три числа — три різні факти; «усього» тут немає навмисно: воно нічого
          не додає до того, що вже сказано трьома. */}
      <dl className="wb-invite-stats">
        <div className="wb-invite-stat">
          <dt>Лінків</dt>
          <dd>{stats.links}</dd>
        </div>
        <div className="wb-invite-stat">
          <dt>Приєднались</dt>
          <dd>{stats.joined}</dd>
        </div>
        <div className="wb-invite-stat">
          <dt>Очікують</dt>
          <dd>{stats.waiting}</dd>
        </div>
      </dl>

      {/* Другий рівень — одне речення, а не ще три числа: це підсумок того,
          що видно нижче в рядках, і повторювати його окремою сіткою означало б
          сказати те саме двічі. */}
      {stats.nested > 0 && (
        <p className="wb-invite-nested-total">
          Ваші контакти залучили ще {stats.nested} — гілка продовжується.
        </p>
      )}

      <ul className="wb-invite-scheme-list">
        <li className="wb-invite-scheme-root">
          <Icon name="user" size={14} />
          Ви
        </li>
        {links.map((link) => (
          <SchemeRow key={link.id} link={link} />
        ))}
      </ul>
    </div>
  );
}
