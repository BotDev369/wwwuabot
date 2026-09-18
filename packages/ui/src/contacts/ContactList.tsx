/**
 * Список контактів — групи й рядки-акордеони.
 *
 * Рядок показує **два рядки** й більше нічого: ім'я з датою-часом зміни і хто це
 * на якому кроці. Усе інше — у розкритому тілі, і **закритий** кожен рядок, бо
 * список читають очима згори вниз: розкриті картки перетворюють його на полотно,
 * де не видно, скільки контактів узагалі є. Розгорнути одразу всі — окремий
 * перемикач у смузі (той самий кирпичик, що в нотатках).
 *
 * Що де стоїть — навмисно: **ім'я** — те, за чим контакт упізнають, тож воно
 * забирає вільне місце, а **дата й хештеги** стоять приглушено. Коли підписи
 * такі ж голосні, як ім'я, список читається як суцільна сітка й око не
 * чіпляється ні за що. Знайдений хештег (який знайшов пошук або фільтр) стоїть
 * акцентом — інакше в стовпчику однакових підписів не видно, за що зачепився
 * пошук.
 *
 * **Стадія названа словом** (`CONTACT_STAGE_WORDS`): «зайшов у бота» проти
 * «приєднався» — це те, заради чого екран існує, і кольором таке не читається.
 *
 * **Два записи про одну людину — не два різні рядки.** Людина, яка зайшла за
 * двома лінками, дає дві картки з однаковим `id`, і саме тут це видно: у другого
 * запису стоїть підпис «та сама людина, що …». Мовчазний близнюк читався б як
 * помилка даних, а це правда: лінків два, людини одна.
 *
 * **Номер — порядковий**, а не колонка в базі: він каже, скільком записам
 * відповідає рядок, і зникає разом із контактом, а не переписується в кожному
 * рядку при кожному видаленні. Рахується він **у видимому порядку**, тож у
 * групах продовжується, а не починається з одиниці.
 *
 * Розкритість — стан **оболонки** (`openIds` + `onToggle`), а не рядка:
 * «розгорнути всі» приходить ззовні, і стан мусить бути один. Дії рядок не
 * робить сам: підтвердження, буфер і правку веде оболонка (та сама межа, що в
 * нотатках).
 *
 * Вигляд (рядки / картки 1 / картки 2) — ззовні (`@wwwuabot/ui/collection`):
 * розмітка в усіх трьох одна й та сама, різницю несе клас розкладки.
 *
 * @module @wwwuabot/ui/contacts
 */

import { type ReactElement } from "react";
import { Icon } from "@wwwuabot/shared";
import type { Contact } from "@wwwuabot/shared/contacts";
import { formatStamp } from "@wwwuabot/shared/utils/datetime";
import { collectionViewClass, type CollectionView } from "../collection";
import { ContactStages } from "./ContactStages";
import { CONTACT_STAGE_WORDS, contactStage, samePersonAs } from "./scheme";
import type { ContactsGroup } from "./types";

interface ContactListProps {
  groups: readonly ContactsGroup[];
  /**
   * Хештеги, які знайшов поточний пошук чи фільтр (`foundContactTags`) — рядок
   * виділяє їх акцентом. Порожній список — не помилка, а «нічого не шукали».
   */
  found?: readonly string[];
  /** Які рядки розгорнуті — **стан оболонки**, а не рядка. */
  openIds: readonly number[];
  /** Перемкнути один рядок. */
  onToggle: (id: number) => void;
  /** Відкрити форму контакту. */
  onEdit: (contact: Contact) => void;
  /** Прибрати контакт — оболонка питає підтвердження сама. */
  onDelete: (contact: Contact) => void;
  /** Скласти особистий лінк — його кладе в буфер оболонка. */
  onMakeLink: (contact: Contact) => void;
  /** Покласти наявний лінк у буфер. */
  onCopyLink: (contact: Contact) => void;
  /** Чий лінк щойно скопійовано — щоб кнопка сказала це словом. */
  copiedId: number | null;
  /** Рядки чи картки-превью — стан екрана, а не списку. */
  collection: CollectionView;
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

/** Особистий лінк у тілі: складений, використаний або його ще немає. */
function LinkBlock({
  contact,
  copied,
  onMakeLink,
  onCopyLink,
}: {
  contact: Contact;
  copied: boolean;
  onMakeLink: () => void;
  onCopyLink: () => void;
}): ReactElement {
  if (contact.joinedBotAt) {
    // Лінк персональний і вже спрацював: показувати його як робочий означало б
    // обіцяти друге приєднання, якого не буде.
    return (
      <p className="wb-contact-joined">
        <Icon name="check" size={14} />
        Лінк використано — за ним уже прийшов контакт
      </p>
    );
  }

  if (!contact.code) {
    return (
      <button type="button" className="wb-btn wb-btn-secondary" onClick={onMakeLink}>
        <Icon name="link" size={16} />
        Створити лінк
      </button>
    );
  }

  return (
    <div className="wb-contact-link-row">
      <code className="wb-contact-link">
        {contact.deepLink ?? `${contact.code} — лінк не скласти: невідоме ім'я бота`}
      </code>
      <button
        type="button"
        className="wb-btn wb-btn-secondary"
        onClick={onCopyLink}
        disabled={!contact.deepLink}
      >
        <Icon name={copied ? "check" : "copy"} size={16} />
        {copied ? "Скопійовано" : "Копіювати"}
      </button>
    </div>
  );
}

export function ContactList({
  groups,
  found,
  openIds,
  onToggle,
  onEdit,
  onDelete,
  onMakeLink,
  onCopyLink,
  copiedId,
  collection,
}: ContactListProps): ReactElement {
  const hits = new Set(found ?? []);
  const open = new Set(openIds);
  // Порядковий номер — у видимому порядку: у групах він продовжується, бо
  // групи ділять список, а не починають його заново.
  let number = 0;

  return (
    <>
      {groups.map((group) => {
        // Близнюків рахуємо **в межах групи**: контакт і його копія стоять поруч,
        // а в різних групах (за днями чи тегами) вони й справді різні рядки.
        const twins = samePersonAs(group.contacts);

        return (
          <section key={group.key} className="wb-contact-group">
            <h2 className="wb-contact-group-title">
              {group.label}
              {/* Кількість у заголовку — щоб «тут 12 контактів» було видно, не
                  рахуючи очима. */}
              <span className="wb-contact-group-count">{group.contacts.length}</span>
            </h2>
            <ul className={`wb-contact-list ${collectionViewClass(collection)}`}>
              {group.contacts.map((contact) => {
                number += 1;
                const stage = contactStage(contact);
                const who = identity(contact);
                const twin = twins.get(contact.id);
                const isOpen = open.has(contact.id);

                return (
                  <li
                    key={contact.id}
                    className={`wb-contact-item${isOpen ? " wb-contact-item--open" : ""}`}
                  >
                    {/* Голова — **кнопка на всю ширину**: палець мусить діставати
                        будь-де, а тіло з'являється під нею вже зі своїми
                        кнопками (тіло в кнопці дало б кнопки в кнопці). */}
                    <button
                      type="button"
                      className="wb-contact-card"
                      aria-expanded={isOpen}
                      onClick={() => onToggle(contact.id)}
                    >
                      <span className="wb-contact-head">
                        <span className="wb-contact-number">{number}</span>
                        <span className="wb-contact-name">{contact.name}</span>
                        <span className="wb-contact-stamp">{formatStamp(contact.updatedAt)}</span>
                        <span className="wb-contact-open">
                          <Icon name={isOpen ? "chevron-up" : "chevron-down"} size={16} />
                        </span>
                      </span>

                      <span className="wb-contact-line">
                        {who && <span className="wb-contact-who">{who}</span>}
                        <span className="wb-contact-state">{CONTACT_STAGE_WORDS[stage]}</span>
                        {/* Той самий id у двох рядках — не збіг, а одна людина:
                            тому підпис стоїть поруч зі станом, а не в тілі. */}
                        {twin !== undefined && (
                          <span className="wb-contact-twin">та сама людина, що «{twin}»</span>
                        )}
                      </span>

                      {contact.tags.length > 0 && (
                        <span className="wb-contact-tags">
                          {/* Хештег тут — **підпис, а не чип**: у чипа бренди
                              задають свої мірки з `!important`, і рядок тегів
                              виходив би вдвічі вищим за рядок із іменем. */}
                          {contact.tags.map((tag) => (
                            <span
                              key={tag}
                              className={`wb-contact-tag${hits.has(tag) ? " wb-contact-tag--hit" : ""}`}
                            >
                              #{tag}
                            </span>
                          ))}
                        </span>
                      )}
                    </button>

                    {isOpen && (
                      <div className="wb-contact-body">
                        {/* Примітки — текст цілком: переноси це те, як їх написали. */}
                        {contact.notes.trim() && (
                          <p className="wb-contact-note-text">{contact.notes}</p>
                        )}

                        <ContactStages contact={contact} />

                        <LinkBlock
                          contact={contact}
                          copied={copiedId === contact.id}
                          onMakeLink={() => onMakeLink(contact)}
                          onCopyLink={() => onCopyLink(contact)}
                        />

                        {/* Глибина гілки — рядком, а не окремим блоком: це один
                            факт, і він видно саме тому, хто відкрив картку. */}
                        {contact.invitedCount > 0 && (
                          <p className="wb-contact-nested">Залучив(ла) ще {contact.invitedCount}</p>
                        )}

                        {/* Обидві дати — парами «підпис → значення»: «коли
                            створив» і «коли змінив» — різні факти, і злитий
                            рядок змушував би вгадувати, який із них. У рядку
                            списку стоїть лише зміна. */}
                        <dl className="wb-contact-dates">
                          <dt className="wb-text-muted">Створено</dt>
                          <dd>{formatStamp(contact.createdAt)}</dd>
                          <dt className="wb-text-muted">Змінено</dt>
                          <dd>{formatStamp(contact.updatedAt)}</dd>
                        </dl>

                        <div className="wb-sheet-actions">
                          <button
                            type="button"
                            className="wb-btn wb-btn-secondary wb-btn-danger"
                            onClick={() => onDelete(contact)}
                          >
                            <Icon name="trash" size={16} />
                            Прибрати
                          </button>
                          <button
                            type="button"
                            className="wb-btn wb-btn-primary"
                            onClick={() => onEdit(contact)}
                          >
                            <Icon name="edit" size={16} />
                            Змінити
                          </button>
                        </div>
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          </section>
        );
      })}
    </>
  );
}
