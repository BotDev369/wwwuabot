/**
 * «МоїКонтакти» — довідник людей, яких власник знає й запрошує.
 *
 * Екран лише **зводить** те, що вже є: список, картку контакту й схему дає
 * спільний `@wwwuabot/ui/contacts`, вигляд — спільний `@wwwuabot/ui/collection`,
 * дані — `useContacts`, а адреса й власник — ця оболонка. Тому тут немає ні
 * розмітки картки, ні правила «хто приєднався»: усе це перевіряється тестами в
 * спільному модулі, незалежно від платформи.
 *
 * **Контакт — це запис із полями, а лінк — одне з них.** Раніше рядок
 * народжувався разом із посиланням, і все, що про людину знали, — підпис і факт
 * приєднання. Тепер контакт можна завести без лінка, відкрити картку, дописати
 * `@username`, Telegram-id, хештеги й примітки, а посилання скласти тоді, коли
 * його справді треба надіслати (кнопка в картці).
 *
 * **Дотик по контакту відкриває картку** — тому в рядку списку немає ні дій, ні
 * посилання: усе, що показують двічі, редагується в одному місці й читається в
 * другому. Список каже рівно те, за чим його читають: номер, ім'я, хто це й
 * чим позначено.
 *
 * Діалоги, буфер обміну й підтвердження живуть тут, а не в картці: це межі
 * оболонки (та сама межа, що в нотатках і панелі теми).
 *
 * Шлях власний (`/contacts`), а не `slug` рядка `scenarios`: список збирається
 * з даних людини (таблиця `contacts`), а не з `page_data` (AGENTS.md §7).
 *
 * @module web-platform-dev/src/pages/ContactsPage
 */

import { useEffect, useState, type ReactElement } from "react";
import { Icon } from "@wwwuabot/shared";
import { sanitizeContactName, type Contact, type ContactInput } from "@wwwuabot/shared/contacts";
import {
  DEFAULT_COLLECTION_VIEW,
  CollectionViewSwitch,
  type CollectionView,
} from "@wwwuabot/ui/collection";
import { ContactList, ContactSheet, ContactsScheme } from "@wwwuabot/ui/contacts";
import { useDialog } from "@wwwuabot/ui/dialog";
import { useContacts } from "./useContacts";

/** Скільки тримається «Скопійовано» на кнопці. */
const COPIED_MS = 2000;

/** Контакт, якого тільки завели: лінка немає, поля порожні, крім імені. */
function newContact(name: string): ContactInput {
  return { name, username: null, telegramUserId: null, tags: [], notes: "" };
}

export function ContactsPage(): ReactElement {
  const { contacts, loading, error, create, update, makeLink, remove } = useContacts();
  const dialog = useDialog();
  const [view, setView] = useState<CollectionView>(DEFAULT_COLLECTION_VIEW);
  // Відкрита картка — стан екрана, а не контакту: контакт у списку лишається
  // тим самим рядком, а картка лише показує його поля.
  const [openId, setOpenId] = useState<number | null>(null);
  const [copiedId, setCopiedId] = useState<number | null>(null);

  useEffect(() => {
    if (copiedId === null) return;
    const timer = setTimeout(() => setCopiedId(null), COPIED_MS);
    return () => clearTimeout(timer);
  }, [copiedId]);

  const open = contacts.find((contact) => contact.id === openId) ?? null;
  const hasContacts = !loading && !error && contacts.length > 0;

  /**
   * Покласти лінк у буфер і позначити картку.
   *
   * Повертає `false`, а не кидає: невдача буфера — не помилка дії, а привід
   * показати посилання текстом, і вирішує це той, хто кликав.
   */
  async function copyLink(contact: Contact): Promise<boolean> {
    if (!contact.deepLink) return false;
    try {
      await navigator.clipboard.writeText(contact.deepLink);
      setCopiedId(contact.id);
      return true;
    } catch {
      return false;
    }
  }

  /** Сказати вголос, чому лінка немає, — замість мовчазного «не спрацювало». */
  async function tellLinkFailure(contact: Contact, what: string): Promise<void> {
    await dialog.alert(
      contact.deepLink
        ? `${what} не вдалося — візьміть посилання з картки контакту.`
        : "Бот ще не знає свого імені — посилання не склалося. Оновіть екран і спробуйте ще раз.",
      { title: "Скопіюйте вручну" },
    );
  }

  /**
   * Додавання контакту: ім'я питаємо діалогом (без нього список стає
   * стовпчиком безіменних карток), далі **одразу складаємо лінк і кладемо його
   * в буфер**, бо саме за цим сюди приходять, і відкриваємо картку — дописати
   * решту полів.
   *
   * Лінк саме **пробуємо** скласти, а не вважаємо обов'язковим: якщо ім'я бота
   * ще невідоме, контакт лишається без лінка, і кнопка в картці складе його
   * потім.
   */
  async function addContact(): Promise<void> {
    const answer = await dialog.prompt("Як звати людину, якій ви надсилаєте посилання?", {
      title: "Додати контакт",
      placeholder: "Ім'я контакту",
      validate: (value) =>
        sanitizeContactName(value) === "" ? "Ім'я не може бути порожнім" : null,
    });
    if (answer === null) return;

    try {
      const created = await create(newContact(sanitizeContactName(answer)));
      setOpenId(created.id);

      const linked = await makeLink(created.id);
      if (!(await copyLink(linked))) await tellLinkFailure(linked, "Скопіювати");
    } catch (e: unknown) {
      await dialog.alert(e instanceof Error ? e.message : "Не вдалося додати контакт", {
        title: "Помилка",
      });
    }
  }

  /** Збереження картки: усі поля одразу, і назад до списку — там зміну видно. */
  async function saveContact(id: number, input: ContactInput): Promise<void> {
    try {
      await update(id, input);
      setOpenId(null);
    } catch (e: unknown) {
      await dialog.alert(e instanceof Error ? e.message : "Не вдалося зберегти контакт", {
        title: "Помилка",
      });
    }
  }

  /** Скласти лінк із картки: код новий, тож старий лінк перестає працювати. */
  async function createLink(id: number): Promise<void> {
    try {
      const linked = await makeLink(id);
      if (!(await copyLink(linked))) await tellLinkFailure(linked, "Скопіювати");
    } catch (e: unknown) {
      await dialog.alert(e instanceof Error ? e.message : "Не вдалося скласти лінк", {
        title: "Помилка",
      });
    }
  }

  async function copyFromCard(contact: Contact): Promise<void> {
    if (await copyLink(contact)) return;
    await tellLinkFailure(contact, "Скопіювати");
  }

  async function deleteContact(contact: Contact): Promise<void> {
    const confirmed = await dialog.confirm(`Прибрати контакт «${contact.name}»?`, {
      title: "Видалення",
      tone: "danger",
      confirmText: "Прибрати",
    });
    if (!confirmed) return;

    try {
      await remove(contact.id);
      setOpenId(null);
    } catch (e: unknown) {
      await dialog.alert(e instanceof Error ? e.message : "Не вдалося прибрати контакт", {
        title: "Помилка",
      });
    }
  }

  return (
    <div className="wb-page">
      {/* Шапка лишається на видноті (`.wb-page-sticky`) — як у нотатках:
          довгий список ховає кнопку створення саме тоді, коли вона потрібна. */}
      <div className="wb-page-sticky">
        <div className="wb-page-head">
          <h1 className="wb-page-title">МоїКонтакти</h1>
          <div className="wb-page-actions">
            {/* Вигляд — той самий спільний кирпичик, що в нотатках: рядки чи
                плитки 1/2. Тут він у шапці, бо окремої смуги пошуку немає, а
                місце поруч із дією — найближче до того, що він міняє. */}
            {hasContacts && <CollectionViewSwitch view={view} onChange={setView} />}
            <button
              type="button"
              className="wb-btn wb-btn-primary"
              onClick={() => void addContact()}
            >
              <Icon name="plus" size={16} />
              Додати контакт
            </button>
          </div>
        </div>
      </div>

      {loading && (
        <div className="wb-empty">
          <div className="wb-skeleton" style={{ width: 160, height: 20 }} />
          <p className="wb-text-muted">Завантаження контактів…</p>
        </div>
      )}

      {!loading && error && (
        <div className="wb-empty">
          <span className="wb-empty-icon">
            <Icon name="warning" size={32} />
          </span>
          <p className="wb-text-red">{error}</p>
        </div>
      )}

      {!loading && !error && contacts.length === 0 && (
        <div className="wb-empty">
          <span className="wb-empty-icon">
            <Icon name="mail" size={32} />
          </span>
          <p className="wb-empty-text">Ще немає жодного контакту.</p>
          {/* Кажемо, як контакт з'являється: без цього порожній екран —
              глухий кут. */}
          <p className="wb-empty-text">
            Натисніть «Додати контакт» — посилання скопіюється саме. Надішліть його людині в
            Telegram: коли вона приєднається, контакт закріпиться за вами й з'явиться тут.
          </p>
        </div>
      )}

      {hasContacts && (
        <>
          <ContactList contacts={contacts} collection={view} onOpen={(c) => setOpenId(c.id)} />

          <h2 className="wb-contact-section">Схема залучених</h2>
          <ContactsScheme contacts={contacts} />
        </>
      )}

      {open && (
        <ContactSheet
          // Картка читає поля при появі: `key` по контакту не дає їй показати
          // поля одного контакту, коли відкрили вже інший.
          key={open.id}
          contact={open}
          index={contacts.indexOf(open)}
          copied={copiedId === open.id}
          onSave={(input) => void saveContact(open.id, input)}
          onDelete={() => void deleteContact(open)}
          onMakeLink={() => void createLink(open.id)}
          onCopyLink={() => void copyFromCard(open)}
          onClose={() => setOpenId(null)}
        />
      )}
    </div>
  );
}
