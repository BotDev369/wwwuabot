/**
 * «МоїКонтакти» — довідник людей, яких власник знає й запрошує.
 *
 * Екран лише **зводить** те, що вже є: список, форму контакту й підсумкові
 * числа дає спільний `@wwwuabot/ui/contacts`, а пошук, сортування, фільтр,
 * групи й вигляд — спільний `@wwwuabot/ui/collection` (той самий кирпичик, що в
 * нотатках), дані — `useContacts`, а адреса й власник — ця оболонка.
 *
 * **Контакт — це запис із полями, а лінк — одне з них.** Контакт заводять без
 * лінка, а посилання складають тоді, коли його справді треба надіслати. Тому
 * «Додати контакт» питає ім'я, створює запис, **одразу складає лінк, кладе його
 * в буфер** і відкриває форму — дописати решту.
 *
 * **Рядок списку — акордеон**, як у нотатках: закритий показує ім'я з датою й
 * хто це на якому кроці, розкритий — етапи приєднання, лінк, дати й дії.
 * Правка живе у формі (`ContactSheet`), а не в рядку: поле в двох місцях
 * неминуче редагується в одному й читається в другому.
 *
 * **Шапка: назва, числа, «+».** Усе в одному рядку — за назвою знак із числом
 * (запрошені / у боті / на платформі), а останнім коло з «+»: воно єдина
 * акцентна пляма, і саме тому читається як головна дія без підпису
 * (`.wb-page-add`). Дія лишається видимою й при нулі контактів — нею заводять
 * першого, і порожній екран без неї був би глухим кутом.
 *
 * **Id не вписують — їх видно.** Свій Telegram-id власник не бачить ніде: його
 * бере сервер із підписаного `initData` при першому ж збереженні. Id людини
 * приходить від бота, коли вона відкрила `?start=<код>`, а другу дату
 * (платформу) ставить `api-dev`, коли вона зайшла в Mini App. Тому екран нічого
 * з цього не передає нагору — він це лише **показує**: запрошено → у боті → на
 * платформі.
 *
 * Заголовок екрана — **«Контакти»**, без «Мої…»: у шапці він читається разом зі
 * знаками, і довге слово відсувало б числа.
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
  ContactList,
  ContactSheet,
  ContactTotals,
  ContactsToolbar,
  DEFAULT_CONTACTS_VIEW,
  buildContactGroups,
  collectContactTags,
  filterContacts,
  foundContactTags,
  type ContactsView,
} from "@wwwuabot/ui/contacts";
import { useDialog } from "@wwwuabot/ui/dialog";
import { useContacts } from "./useContacts";

/** Скільки тримається «Скопійовано» на кнопці. */
const COPIED_MS = 2000;

/** Контакт, якого тільки завели: лінка немає, поля порожні, крім імені. */
function newContact(name: string): ContactInput {
  return { name, username: null, tags: [], notes: "" };
}

export function ContactsPage(): ReactElement {
  const { contacts, loading, error, create, update, makeLink, remove } = useContacts();
  const dialog = useDialog();
  const [view, setView] = useState<ContactsView>(DEFAULT_CONTACTS_VIEW);
  // Розгорнуті рядки й відкрита форма — стан **екрана**, а не контакту: контакт
  // у списку лишається тим самим рядком, а форма лише показує його поля.
  const [openIds, setOpenIds] = useState<ReadonlySet<number>>(() => new Set());
  const [editingId, setEditingId] = useState<number | null>(null);
  const [copiedId, setCopiedId] = useState<number | null>(null);

  useEffect(() => {
    if (copiedId === null) return;
    const timer = setTimeout(() => setCopiedId(null), COPIED_MS);
    return () => clearTimeout(timer);
  }, [copiedId]);

  const visible = filterContacts(contacts, view);
  const groups = buildContactGroups(contacts, view);
  // Які теги знайшов поточний пошук чи фільтр — їх рядок виділяє акцентом.
  const found = foundContactTags(collectContactTags(contacts), view);
  // «Усі розгорнуті» — про те, що ВИДНО: шукати очима те, що відсіяли
  // фільтром, немає де, а перемикач мусить казати про поточний список.
  const allOpen = visible.length > 0 && visible.every((contact) => openIds.has(contact.id));
  const editing = contacts.find((contact) => contact.id === editingId) ?? null;
  const hasContacts = !loading && !error && contacts.length > 0;

  function toggleAll(): void {
    setOpenIds(allOpen ? new Set() : new Set(visible.map((contact) => contact.id)));
  }

  function toggleOne(id: number): void {
    setOpenIds((prev) => {
      const next = new Set(prev);
      if (!next.delete(id)) next.add(id);
      return next;
    });
  }

  /**
   * Покласти лінк у буфер і позначити рядок.
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
        ? `${what} не вдалося — візьміть посилання з розкритого контакту.`
        : "Бот ще не знає свого імені — посилання не склалося. Оновіть екран і спробуйте ще раз.",
      { title: "Скопіюйте вручну" },
    );
  }

  /**
   * Додавання контакту: ім'я питаємо діалогом (без нього список стає
   * стовпчиком безіменних карток), далі **одразу складаємо лінк і кладемо його
   * в буфер**, бо саме за цим сюди приходять, і відкриваємо форму — дописати
   * решту полів.
   *
   * Лінк саме **пробуємо** скласти, а не вважаємо обов'язковим: якщо ім'я бота
   * ще невідоме, контакт лишається без лінка, і кнопка в тілі рядка складе його
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
      setOpenIds((prev) => new Set(prev).add(created.id));
      setEditingId(created.id);

      const linked = await makeLink(created.id);
      if (!(await copyLink(linked))) await tellLinkFailure(linked, "Скопіювати");
    } catch (e: unknown) {
      await dialog.alert(e instanceof Error ? e.message : "Не вдалося додати контакт", {
        title: "Помилка",
      });
    }
  }

  /** Збереження форми: усі поля одразу, і назад до списку — там зміну видно. */
  async function saveContact(id: number, input: ContactInput): Promise<void> {
    try {
      await update(id, input);
      setEditingId(null);
    } catch (e: unknown) {
      await dialog.alert(e instanceof Error ? e.message : "Не вдалося зберегти контакт", {
        title: "Помилка",
      });
    }
  }

  /** Скласти лінк із тіла рядка: код новий, тож старий лінк перестає працювати. */
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

  async function copyFromRow(contact: Contact): Promise<void> {
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
      setEditingId(null);
      // Рядок прибираємо з розгорнутих: його вже немає, а id у стані лишився б
      // і «оживив» наступний контакт із тим самим номером.
      setOpenIds((prev) => {
        const next = new Set(prev);
        next.delete(contact.id);
        return next;
      });
    } catch (e: unknown) {
      await dialog.alert(e instanceof Error ? e.message : "Не вдалося прибрати контакт", {
        title: "Помилка",
      });
    }
  }

  return (
    <div className="wb-page">
      {/* Шапка, числа й смуга керування їдуть разом і лишаються на видноті
          (`.wb-page-sticky`): список довгий, і без цього і пошук, і числа
          зникали рівно тоді, коли вони потрібні. */}
      <div className="wb-page-sticky">
        {/* Один рядок: назва, числа, «+». Числа стоять **у ряд із назвою** —
            за ними приходять саме тоді, коли список довгий, а блок під шапкою
            відсував їх від заголовка рівно настільки, щоб не бачити разом. */}
        <div className="wb-page-head">
          <h1 className="wb-page-title">Контакти</h1>
          {hasContacts && <ContactTotals contacts={contacts} />}

          {/* Дія — **коло зі знаком** у тому ж рядку, останнім: підпис забирав
              би рядок цілком, а «+» у шапці списку читається однозначно.
              Слово лишається в `aria-label` — без нього кнопка не має назви для
              того, хто не бачить знака. */}
          <button
            type="button"
            className="wb-btn wb-btn-primary wb-page-add"
            onClick={() => void addContact()}
            aria-label="Додати контакт"
          >
            <Icon name="plus" size={20} />
          </button>
        </div>

        {hasContacts && (
          <ContactsToolbar
            view={view}
            onChange={(patch) => setView((prev) => ({ ...prev, ...patch }))}
            tags={collectContactTags(contacts)}
            shown={visible.length}
            total={contacts.length}
            allOpen={allOpen}
            onToggleAll={toggleAll}
          />
        )}
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
            Натисніть «+» угорі — посилання скопіюється саме. Надішліть його людині в Telegram: коли
            вона приєднається, контакт закріпиться за вами й з'явиться тут.
          </p>
        </div>
      )}

      {hasContacts &&
        (groups.length > 0 ? (
          <ContactList
            groups={groups}
            found={found}
            openIds={[...openIds]}
            onToggle={toggleOne}
            onEdit={(contact) => setEditingId(contact.id)}
            onDelete={(contact) => void deleteContact(contact)}
            onMakeLink={(contact) => void createLink(contact.id)}
            onCopyLink={(contact) => void copyFromRow(contact)}
            copiedId={copiedId}
            collection={{ layout: view.layout, columns: view.columns }}
          />
        ) : (
          <div className="wb-empty">
            <span className="wb-empty-icon">
              <Icon name="search" size={32} />
            </span>
            <p className="wb-empty-text">Нічого не знайдено за цим запитом.</p>
            <button
              type="button"
              className="wb-btn wb-btn-secondary"
              onClick={() => setView(DEFAULT_CONTACTS_VIEW)}
            >
              <Icon name="close" size={16} />
              Скинути пошук і фільтри
            </button>
          </div>
        ))}

      {editing && (
        <ContactSheet
          // Форма читає поля при появі: `key` по контакту не дає їй показати
          // поля одного контакту, коли відкрили вже інший.
          key={editing.id}
          contact={editing}
          onSave={(input) => void saveContact(editing.id, input)}
          onClose={() => setEditingId(null)}
        />
      )}
    </div>
  );
}
