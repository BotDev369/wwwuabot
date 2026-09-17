/**
 * @wwwuabot/ui/invites — «МоїКонтакти»: лінки запрошень і схема залучених.
 *
 * Підключення в оболонці:
 *
 *   import { InvitesList, InvitesScheme } from "@wwwuabot/ui/invites";
 *
 * Куди саме писати лінки — знає оболонка (`createInvitesApi` зі своїм
 * транспортом): у платформі лінк належить людині. Тут лишається те, що
 * однакове: як їх показати й що з них видно. Дії (`onCopy` / `onDelete`) теж
 * вирішує оболонка — буфер обміну й підтвердження належать їй, а не картці.
 *
 * @module @wwwuabot/ui/invites
 */

export { InvitesList } from "./InvitesList";
export { InvitesScheme } from "./InvitesScheme";
export { inviteStats } from "./scheme";
export type { InviteStats } from "./scheme";
