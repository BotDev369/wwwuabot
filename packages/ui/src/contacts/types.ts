/**
 * Стан вигляду списку контактів: пошук, фільтр, сортування, групування й
 * вигляд (рядки чи картки-превью).
 *
 * Це **не** склад екрана, а опис того, як ті самі контакти показати. Тому тут
 * немає ні React, ні API: `view.ts` перетворює `Contact[]` + `ContactsView` у
 * групи для рендеру, і саме тому все це можна перевірити тестами без DOM.
 *
 * Два поля тут — не контактні, а **спільні** (`@wwwuabot/ui/collection`):
 * фільтр за хештегами (`CollectionTagFilter`) і вигляд розкладки. Це той самий
 * кирпичик, що в нотаток: хештеги лежать і шукаються однаково, а розкладку
 * задає спільний `collectionViewClass`.
 *
 * @module @wwwuabot/ui/contacts
 */

import type { Contact } from "@wwwuabot/shared/contacts";
import type {
  CollectionChip,
  CollectionColumns,
  CollectionLayout,
  CollectionTagFilter,
} from "../collection";

/**
 * Порядок показу контактів.
 *
 * За стадією приєднання тут немає навмисно: «хто далі просунувся» — це те, що
 * показує **схема** (числа в шапці й стан у рядку), а не порядок рядків. Список
 * читають як довідник: за іменем або за тим, що нещодавно змінили.
 */
export type ContactsSort = "updated-desc" | "created-desc" | "created-asc" | "name";

/** За чим збирати контакти в групи. */
export type ContactsGroupBy = "none" | "day" | "tag";

/** Фільтр за хештегами — спільне правило: усі / без хештегів / вибрані теги. */
export type ContactsTagFilter = CollectionTagFilter;

/** Те, що людина вибрала у смузі керування. */
export interface ContactsView {
  /** Пошук за іменем, хендлом, хештегами й примітками (усі слова мусять знайтись). */
  query: string;
  tags: ContactsTagFilter;
  sort: ContactsSort;
  groupBy: ContactsGroupBy;
  /** Рядки чи картки-превью — стан екрана, а не списку. */
  layout: CollectionLayout;
  /** Скільком колонками стоять плитки. У рядків значення немає. */
  columns: CollectionColumns;
}

/**
 * Типовий вигляд списку.
 *
 * **Груп типово немає** — як і в нотатках: довідник відкривають, щоб знайти
 * людину, і «Сьогодні / Вчора» ріжуть його за датою **зміни**, хоч шукають за
 * іменем. Групування лишається вибором у смузі.
 */
export const DEFAULT_CONTACTS_VIEW: ContactsView = {
  query: "",
  tags: { kind: "all" },
  sort: "updated-desc",
  groupBy: "none",
  layout: "rows",
  columns: 2,
};

/** Чип смуги керування — те, що людина вибрала, і як це зняти. */
export type ContactsChip = CollectionChip<ContactsView>;

/**
 * Група в списку — з неї рендериться заголовок і рядки.
 *
 * У заголовку стоїть **кількість записів**, а не людей: група — це як список
 * розклали, а не ще одне число лійки (числа живуть у шапці й рахують людей).
 */
export interface ContactsGroup {
  /** Стабільний ключ React-списку (`day:today`, `tag:київ`, `all`). */
  key: string;
  /** Підпис групи. */
  label: string;
  contacts: Contact[];
}
