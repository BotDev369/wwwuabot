/**
 * Склад вкладок композера.
 *
 * Дані, а не логіка: щоб додати вкладку, допиши рядок тут — розмітка, стилі
 * й перемикання вже готові. «Нотатка» — перша й типова: саме її бачить
 * користувач, коли гортає «+».
 *
 * @module @wwwuabot/ui/composer
 */

import type { ComposerTab } from "./types";

/** Вкладка, яка відкривається за замовчуванням. */
export const DEFAULT_COMPOSER_TAB = "note";

export const COMPOSER_TABS: readonly ComposerTab[] = [
  { key: "note", label: "Нотатка", icon: "text", status: "ready" },
  {
    key: "page",
    label: "Сторінка",
    icon: "layout",
    status: "soon",
    hint: "Новий інтерфейс створення сторінки: макет, зони й блоки — без переходу в адмінку.",
    planned: [
      "Вибір шаблону й чотири зони (sidebar, header, main, footer)",
      "Адреса сторінки (slug) і подання для бота",
      "Публікація одразу з композера",
    ],
  },
  {
    key: "media",
    label: "Медіа",
    icon: "image",
    status: "soon",
    hint: "Фото, відео й файли — те саме додавання, що з вкладки «Нотатка», лише як окремий крок.",
    planned: ["Завантаження з телефона", "Галерея вже завантаженого", "Вставка за посиланням"],
  },
  {
    key: "files",
    label: "Файли",
    icon: "clipboard",
    status: "soon",
    hint: "Документи й архіви: те, що не є ні фото, ні відео.",
    planned: ["Файли з пристрою", "Обмеження розміру й типів", "Посилання на файл у боті"],
  },
  {
    key: "templates",
    label: "Шаблони",
    icon: "blocks",
    status: "soon",
    hint: "Заготовки, з яких починається створення: щоб не збирати те саме щоразу.",
    planned: ["Шаблони", "Спільні набори", "Готовий блок у сторінку"],
  },
];

/** Вкладка за ключем; невідомий ключ повертає типову — композер не лишається порожнім. */
export function findComposerTab(key: string): ComposerTab {
  return COMPOSER_TABS.find((tab) => tab.key === key) ?? COMPOSER_TABS[0];
}
