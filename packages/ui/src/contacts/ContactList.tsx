/**
 * Список контактів — один рядок на контакт, і жодних дій у ньому.
 *
 * **Дотик по контакту відкриває картку** — тому в рядку немає ні «Копіювати»,
 * ні «Прибрати»: лінк, хештеги й примітки живуть у картці, і показувати їх
 * половину в списку означало б мати два місця для одного поля. Рядок каже
 * рівно те, за чим список читають: **номер, ім'я, хто це і на якій стадії**.
 *
 * **Стадія названа словом** (`CONTACT_STAGE_WORDS`): «зайшов у бота» проти
 * «приєднався» — це те, заради чого екран існує, і кольором таке не читається.
 * Хто це (`@username`, `id`) приходить **від бота**: власник цих даних не
 * вписує, бо не знає їх (AGENTS.md §7).
 *
 * **Номер — порядковий**, а не колонка в базі: він каже, скільки контактів
 * узагалі є, і зникає разом із контактом, а не переписується в кожному рядку
 * при кожному видаленні.
 *
 * Вигляд (рядки / картки 1 / картки 2) — ззовні (`@wwwuabot/ui/collection`):
 * розмітка в усіх трьох **одна й та сама**, різницю несе клас розкладки.
 *
 * @module @wwwuabot/ui/contacts
 */

import { type ReactElement } from "react";
import { Icon } from "@wwwuabot/shared";
import type { Contact } from "@wwwuabot/shared/contacts";
import { collectionViewClass, type CollectionView } from "../collection";
import { CONTACT_STAGE_WORDS, contactStage } from "./scheme";

interface ContactListProps {
  contacts: readonly Contact[];
  /** Рядки чи картки-превью — стан екрана, а не списку. */
  collection: CollectionView;
  /** Відкрити картку контакту. */
  onOpen: (contact: Contact) => void;
}

/**
 * Хто це — одним рядком.
 *
 * Порожньо тут буває: контакт, у якого ще немає ні хендла, ні id, — це контакт,
 * якого тільки занесли в довідник, і тоді рядок каже це **стадією**, а не
 * порожнім місцем.
 */
function identity(contact: Contact): string {
  const parts: string[] = [];
  if (contact.username) parts.push(`@${contact.username}`);
  if (contact.joinedUserId !== null) parts.push(`id ${contact.joinedUserId}`);
  return parts.join(" · ");
}

export function ContactList({ contacts, collection, onOpen }: ContactListProps): ReactElement {
  return (
    <ul className={`wb-contact-list ${collectionViewClass(collection)}`}>
      {contacts.map((contact, index) => {
        const who = identity(contact);

        return (
          <li key={contact.id} className="wb-contact-item">
            {/* Картка — **одна кнопка на всю ширину**: палець мусить діставати
                будь-де, а окремі клітинки дій живуть у картці контакту. */}
            <button
              type="button"
              className="wb-contact-card"
              onClick={() => onOpen(contact)}
              aria-label={`Відкрити контакт «${contact.name}»`}
            >
              <span className="wb-contact-head">
                <span className="wb-contact-number">{index + 1}</span>
                <span className="wb-contact-name">{contact.name}</span>
                <span className="wb-contact-open">
                  <Icon name="chevron-right" size={16} />
                </span>
              </span>

              <span className="wb-contact-line">
                {who && <span className="wb-contact-who">{who}</span>}
                {/* Стан — слово, а не відтінок: «у боті» й «приєднався» — різні
                    події, і за кольором їх не видно. */}
                <span className="wb-contact-state">
                  {CONTACT_STAGE_WORDS[contactStage(contact)]}
                </span>
              </span>

              {contact.tags.length > 0 && (
                <span className="wb-contact-tags">
                  {/* Хештег тут — **підпис**, а не чип: у чипа бренди задають свої
                      мірки з `!important`, і рядок тегів виходив би вдвічі вищим
                      за рядок із текстом (та сама межа, що в нотатках). */}
                  {contact.tags.map((tag) => (
                    <span key={tag} className="wb-contact-tag">
                      #{tag}
                    </span>
                  ))}
                </span>
              )}
            </button>
          </li>
        );
      })}
    </ul>
  );
}
