/**
 * Вибір вигляду списку — **стан пристрою**, а не екрана.
 *
 * Список пунктів (хаб «Створити») перемонтовується на кожному переході, і
 * вибір, який ніде не лежить, скидався б щоразу: перемикач показував би одне,
 * а пункти стояли б по-іншому. Той самий прийом із недоступним сховищем, що в
 * трьох кольорів людини (`packages/shared/src/styles/user-colors.ts`).
 *
 * Лежить окремо від складу пунктів: склад — це **що** тут є, а вигляд — **як**
 * його показати. Дві різні правди, тож і два модулі.
 *
 * @module web-platform-dev/src/pages/section-layout
 */

import type { IconName } from "@wwwuabot/shared";
import type { MenuLayout } from "@wwwuabot/ui/menu";

const KEY = "wwwuabot-sections-layout";

/**
 * Типово — **рядки**: у рядку пункт називає себе словом і пояснює, що там буде,
 * тож людина не мусить угадувати розділ за знаком у плитці. Плитки лишаються
 * вибором того, хто вже знає, куди йде.
 */
export const DEFAULT_SECTIONS_LAYOUT: MenuLayout = "rows";

/** Варіант вигляду — дані для перемикача, а не розмітка. */
export interface SectionsLayoutOption {
  key: MenuLayout;
  /**
   * Ім'я варіанта. У смузі сегмент показує лише знак, тож це і `aria-label`,
   * і `title`: без нього знак не сказав би, що саме він робить.
   */
  label: string;
  icon: IconName;
}

export const SECTIONS_LAYOUT_OPTIONS: readonly SectionsLayoutOption[] = [
  { key: "rows", label: "Рядки", icon: "list" },
  { key: "blocks", label: "Плитки", icon: "card" },
];

/**
 * Читання вибору. Сміття і недоступне сховище дають типове, а не помилку.
 *
 * Вибір звіряється зі **списком варіантів**, а не з одним значенням: коли
 * зі сховища читався лише `rows`, типовий вигляд мінявся мовчки — людина
 * обирала плитки, а бачила рядки, бо «плитки» не згадувались у читанні взагалі.
 */
export function readSectionsLayout(): MenuLayout {
  try {
    const stored = localStorage.getItem(KEY);
    const known = SECTIONS_LAYOUT_OPTIONS.some((option) => option.key === stored);
    return known ? (stored as MenuLayout) : DEFAULT_SECTIONS_LAYOUT;
  } catch {
    return DEFAULT_SECTIONS_LAYOUT;
  }
}

/** Запис вибору. Невдача сховища вибору не скасовує — список уже переставився. */
export function writeSectionsLayout(layout: MenuLayout): void {
  try {
    localStorage.setItem(KEY, layout);
  } catch {
    /* ignore — localStorage може бути недоступним */
  }
}
