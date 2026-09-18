/**
 * @wwwuabot/ui/contacts — «Контакти»: список, форма контакту й підсумкові
 * числа.
 *
 * Підключення в оболонці:
 *
 *   import { ContactList, ContactSheet, ContactTotals } from "@wwwuabot/ui/contacts";
 *
 * Куди саме писати контакти — знає оболонка (`createContactsApi` зі своїм
 * транспортом): у платформі записи належать людині. Тут лишається те, що
 * однакове: як їх показати, знайти й що з них видно. Дії (`onSave`, `onDelete`,
 * `onMakeLink`, `onCopyLink`) теж вирішує оболонка — буфер обміну, діалоги й
 * підтвердження належать їй, а не картці.
 *
 * Список влаштований **як нотатки**: акордеон із двох рядків інформації, а
 * пошук, сортування, фільтр, групи й вигляд дає спільний
 * `@wwwuabot/ui/collection` (`CollectionToolbar`, `collectionViewClass`) —
 * контакти його другий користувач після нотаток, а не друга копія.
 *
 * @module @wwwuabot/ui/contacts
 */

export { ContactList } from "./ContactList";
export { ContactSheet } from "./ContactSheet";
export { ContactStages } from "./ContactStages";
export { ContactTotals } from "./ContactTotals";
export { ContactsToolbar } from "./ContactsToolbar";
export { CONTACT_STAGE_WORDS, contactStage, contactStats, samePersonAs } from "./scheme";
export type { ContactStage, ContactStats } from "./scheme";
export { DEFAULT_CONTACTS_VIEW } from "./types";
export type {
  ContactsChip,
  ContactsGroup,
  ContactsGroupBy,
  ContactsSort,
  ContactsTagFilter,
  ContactsView,
} from "./types";
export {
  buildContactGroups,
  collectContactTags,
  contactViewChips,
  filterContacts,
  foundContactTags,
  sortContacts,
  CONTACT_GROUP_OPTIONS,
  CONTACT_SORT_OPTIONS,
} from "./view";
