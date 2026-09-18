/**
 * @wwwuabot/ui/contacts — «МоїКонтакти»: список, картка контакту й схема.
 *
 * Підключення в оболонці:
 *
 *   import { ContactList, ContactSheet, ContactsScheme } from "@wwwuabot/ui/contacts";
 *
 * Куди саме писати контакти — знає оболонка (`createContactsApi` зі своїм
 * транспортом): у платформі записи належать людині. Тут лишається те, що
 * однакове: як їх показати й що з них видно. Дії (`onSave`, `onDelete`,
 * `onCopyLink`) теж вирішує оболонка — буфер обміну, діалоги й підтвердження
 * належать їй, а не картці.
 *
 * Вигляд списку (рядки / картки 1 / картки 2) дає спільний
 * `@wwwuabot/ui/collection` — контакти його другий користувач після нотаток.
 *
 * @module @wwwuabot/ui/contacts
 */

export { ContactList } from "./ContactList";
export { ContactSheet } from "./ContactSheet";
export { ContactsScheme } from "./ContactsScheme";
export { CONTACT_STAGE_WORDS, contactStage, contactStats } from "./scheme";
export type { ContactStage, ContactStats } from "./scheme";
