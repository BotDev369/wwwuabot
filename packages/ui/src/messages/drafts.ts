/**
 * Чернетки в списку — **чисті функції**, без стану.
 *
 * Форма нового повідомлення бере з них дві речі: чим відкритися (найсвіжіша
 * чернетка) і чим замінити текст, коли людину змінили на ту, у якої чернетка вже
 * є. Обидва вибори — правило, а не розмітка, тож і живуть тут: їх видно в
 * тестах, а не в рендері.
 *
 * @module @wwwuabot/ui/messages
 */

import type { MessageDraft } from "@wwwuabot/shared/messages";

/**
 * Найсвіжіша чернетка — нею відкривається форма.
 *
 * Порядок не беремо з відповіді сервера: `updatedAt` — це формат SQLite
 * (`YYYY-MM-DD HH:MM:SS`), тож порівняння рядків дає той самий порядок, а
 * покладатися на чужий `ORDER BY` означало б мати правило, яке зникає разом із
 * одним запитом.
 */
export function latestDraft(drafts: readonly MessageDraft[]): MessageDraft | null {
  return drafts.reduce<MessageDraft | null>(
    (newest, draft) => (newest === null || draft.updatedAt > newest.updatedAt ? draft : newest),
    null,
  );
}

/** Чернетка саме цієї людини; `null` — їй ще не писали. */
export function draftFor(drafts: readonly MessageDraft[], peerId: number): MessageDraft | null {
  return drafts.find((draft) => draft.peerId === peerId) ?? null;
}

/**
 * Чим відкривається форма: чернетка **цієї людини**, а без неї — найсвіжіша.
 *
 * Дві різні речі в одній функції навмисно, бо обидві відповідають на одне
 * питання форми — «що вже написано». Людину задають тоді, коли форму відкрили з
 * рядка списку (там чернетка вже адресована), і тоді чужий текст брати нічого.
 */
export function openingDraft(
  drafts: readonly MessageDraft[],
  peerId: number | null,
): MessageDraft | null {
  return peerId === null ? latestDraft(drafts) : draftFor(drafts, peerId);
}
