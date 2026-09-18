/**
 * Де зберігається вибір розкладки облікових карток у меню профілю.
 *
 * Саме `localStorage`, а не стан компонента: меню розмонтовується на кожному
 * закритті, тож вибір, який ніде не лежить, скидався б кожного разу — і
 * перемикач показував би один варіант, а картки стояли б по-іншому. Той самий
 * підхід і той самий прийом із недоступним сховищем, що у трьох кольорів
 * людини (`packages/shared/src/styles/user-colors.ts`): це вибір вигляду, він
 * належить пристрою, а не серверу.
 *
 * @module web-platform-dev/src/layout/profile-cards-pref
 */

import { DEFAULT_ACCOUNT_CARDS_LAYOUT, type AccountCardsLayout } from "./profile-account";

const KEY = "wwwuabot-profile-cards";

/** Читання вибору. Сміття і недоступне сховище дають типове, а не помилку. */
export function readAccountCardsLayout(): AccountCardsLayout {
  try {
    return localStorage.getItem(KEY) === "horizontal" ? "horizontal" : DEFAULT_ACCOUNT_CARDS_LAYOUT;
  } catch {
    return DEFAULT_ACCOUNT_CARDS_LAYOUT;
  }
}

/** Запис вибору. Невдача сховища вибору не скасовує — картки вже переставились. */
export function writeAccountCardsLayout(layout: AccountCardsLayout): void {
  try {
    localStorage.setItem(KEY, layout);
  } catch {
    /* ignore — localStorage може бути недоступним */
  }
}
