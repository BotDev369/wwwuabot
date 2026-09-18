/**
 * Вибір розкладки карток у меню профілю — і дані перемикача, який його робить.
 *
 * Саме `localStorage`, а не стан компонента: меню розмонтовується на кожному
 * закритті, тож вибір, який ніде не лежить, скидався б кожного разу — і
 * перемикач показував би один варіант, а картки стояли б по-іншому. Той самий
 * підхід і той самий прийом із недоступним сховищем, що у трьох кольорів
 * людини (`packages/shared/src/styles/user-colors.ts`): це вибір вигляду, він
 * належить пристрою, а не серверу.
 *
 * Розкладка — спільна здатність поверхні (`@wwwuabot/ui/menu` → `cardLayout`):
 * нею міняються **обидві** родини карток, і облікові, і плитки пунктів. Тому
 * тут лежить і вибір, і його варіанти, а самі картки про розкладку не знають.
 *
 * @module web-platform-dev/src/layout/profile-cards-pref
 */

import type { IconName } from "@wwwuabot/shared";
import type { MenuCardsLayout } from "@wwwuabot/ui/menu";

const KEY = "wwwuabot-profile-cards";

/** Типове — **портрет**: так картки видно як дві окремі, а не як пункти меню. */
export const DEFAULT_CARDS_LAYOUT: MenuCardsLayout = "portrait";

/** Варіант розкладки — дані для перемикача, а не розмітка. */
export interface CardsLayoutOption {
  key: MenuCardsLayout;
  /**
   * Ім'я варіанта. У смузі сегмент показує лише знак, тож це і `aria-label`,
   * і `title`: без нього знак не сказав би, що саме він робить.
   */
  label: string;
  icon: IconName;
}

export const CARDS_LAYOUT_OPTIONS: readonly CardsLayoutOption[] = [
  { key: "portrait", label: "Стовпці", icon: "card" },
  { key: "horizontal", label: "Рядки", icon: "list" },
];

/** Читання вибору. Сміття і недоступне сховище дають типове, а не помилку. */
export function readCardsLayout(): MenuCardsLayout {
  try {
    return localStorage.getItem(KEY) === "horizontal" ? "horizontal" : DEFAULT_CARDS_LAYOUT;
  } catch {
    return DEFAULT_CARDS_LAYOUT;
  }
}

/** Запис вибору. Невдача сховища вибору не скасовує — картки вже переставились. */
export function writeCardsLayout(layout: MenuCardsLayout): void {
  try {
    localStorage.setItem(KEY, layout);
  } catch {
    /* ignore — localStorage може бути недоступним */
  }
}
