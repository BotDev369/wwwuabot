/**
 * Розділи хабу `/profile` — склад, вигляд і його збережений вибір.
 *
 * Тут лише **дані**: пункт, його адреса й те, що він обіцяє. Розмітку пункту
 * дає спільний `MenuList` (`@wwwuabot/ui/menu`), правило дотику —
 * `buildMenuItems`; та сама пара «склад ↔ розмітка», що у футера.
 *
 * **Порядок — за абеткою (А→Я).** Сталий порядок не залежить від того, хто
 * додав пункт останнім, тож місце пункту можна запам'ятати. Стежить
 * `profile-sections.test.ts`.
 *
 * **«Дати» є, і це не друга копія навігації.** У футері слот другий — Простір,
 * тож до дат ведуть **тільки** звідси: вони — щоденний інструмент людини, але
 * не та річ, яку шукають на кожному екрані. Хаб — не копія футера, а те, чого
 * в футері немає місця: Дати, Контакти, Локації, Нотатки, Сторінки й Тема.
 *
 * **Підписів «Мій / Мої» немає** — ні тут, ні в футері, ні на екранах: хаб
 * відкривають зі свого профілю, тож приналежність очевидна, а префікс лише
 * відсуває те слово, за яким пункт упізнають.
 *
 * Пункт без `href` і без дії — заглушка, і це чесно видно ще до дотику: у
 * рядка є пояснення, що там буде (`status: "soon"`), а в плитці — чип
 * «Скоро». Дотик при цьому не мовчить, а показує те саме пояснення діалогом.
 *
 * @module web-platform-dev/src/pages/profile-sections
 */

import type { IconName } from "@wwwuabot/shared";
import type { MenuLayout, ShellMenuItem } from "@wwwuabot/ui/menu";
// Відносний імпорт, а не аліас `@/`: цей модуль читає тест, а тести ганяються
// з кореневого конфіга без аліасів (`vitest.config.ts`).
import { toWebPath } from "@wwwuabot/shared/content";
// Відносний імпорт, а не аліас `@/`: цей модуль читає тест, а тести ганяються
// з кореневого конфіга без аліасів (`vitest.config.ts`).
import { CONTACTS_PATH, NOTES_PATH } from "../app/routes";

/** Сторінка дат — рядок контенту: адресу дає `slug`, а не літерал (AGENTS §7). */
const MY_DATE_SLUG = "mydate";

export interface BuildProfileSectionsOptions {
  /**
   * Відкрити панель теми. Це **своя дія**, а не адреса: тема — налаштування
   * поверхні, і «пункт» тут лишається рівним іншим лише формою.
   */
  onOpenTheme: () => void;
}

export function buildProfileSections({
  onOpenTheme,
}: BuildProfileSectionsOptions): ShellMenuItem[] {
  return [
    { key: "mydate", label: "Дати", icon: "my-dates", href: toWebPath(MY_DATE_SLUG) },
    { key: "contacts", label: "Контакти", icon: "mail", href: CONTACTS_PATH },
    {
      key: "locations",
      label: "Локації",
      icon: "globe",
      status: "soon",
      hint: "Адреси й координати місць, які згадуються у сценаріях.",
    },
    { key: "notes", label: "Нотатки", icon: "text", href: NOTES_PATH },
    {
      key: "pages",
      label: "Сторінки",
      icon: "layout",
      status: "soon",
      hint: "Створені сторінки: адреса, зони й що з них уже опубліковано.",
    },
    { key: "theme", label: "Тема", icon: "sliders", onSelect: onOpenTheme },
  ];
}

/* ── Вигляд розділів: рядки чи плитки ────────────────────────────────────
   Це вибір людини, тому він лежить у сховищі пристрою, а не в стані
   компонента: екран перемонтовується на кожному переході, і вибір, який ніде
   не лежить, скидався б кожного разу — перемикач показував би одне, а розділи
   стояли б по-іншому. Той самий прийом із недоступним сховищем, що у трьох
   кольорів людини (`packages/shared/src/styles/user-colors.ts`). */

const KEY = "wwwuabot-profile-sections-layout";

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

/** Запис вибору. Невдача сховища вибору не скасовує — розділи вже переставились. */
export function writeSectionsLayout(layout: MenuLayout): void {
  try {
    localStorage.setItem(KEY, layout);
  } catch {
    /* ignore — localStorage може бути недоступним */
  }
}
