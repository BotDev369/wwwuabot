/**
 * Склад пунктів нижнього футера платформи.
 *
 * Порядок і ролі — за патерном топових застосунків: рівні слоти, у центрі —
 * «+» (слот дії), крайній справа — профіль. Вибраний розділ показує ЗАЛИТИЙ
 * варіант своєї іконки: це той самий знак, тож перехід між розділами не
 * смикає смугу, а фонового кола під іконкою немає взагалі.
 *
 * **Кожен слот — адреса, і винятків немає.** «+» довго відкривав композер
 * поверхні, тож у нього не було ні історії, ні «назад», ні посилання, яке
 * можна надіслати, — а шість власних екранів людини жили в хабі профілю й
 * губилися серед них. Тепер «+» веде на `/create` (хаб «Створити»), а
 * створення відкриває **сам екран**, який його вміє (`?new=1`,
 * `withCreateIntent` у `app/routes.ts`).
 *
 * Пункт описується САМИМ `slug` сторінки, а не рядком URL: це та сама
 * сутність адреси, з якої `toWebPath()` будує веб-шлях (AGENTS.md §7). Пункт
 * без `slug` — заглушка: екрана під ним ще немає, і дотик чесно про це скаже
 * замість тиші. Таких у смузі немає — і це стереже `platform-tabs.test.ts`.
 *
 * @module web-platform-dev/src/layout/platform-tabs
 */

import { HOME_SLUG, toWebPath } from "@wwwuabot/shared/content";
import type { ShellTab, TabBarItem } from "@wwwuabot/ui/nav";
// Відносний імпорт, а не аліас `@/`: цей модуль читає тест, а тести ганяються
// з кореневого конфіга без аліасів (`vitest.config.ts`).
import { CREATE_PATH, MESSAGES_PATH, PROFILE_PATH, SPACE_PATH } from "../app/routes";

export interface PlatformTab extends Omit<ShellTab, "href"> {
  /** Адреса сторінки — `slug` рядка `scenarios`. Немає — заглушка. */
  slug?: string;
  /**
   * Маршрут, який **не** є рядком контенту (профіль, простір, створення,
   * повідомлення). Окреме поле, а не `slug`, бо тут адреса не береться з бази:
   * вигадати `slug` під екран, у якого немає `page_data`, означало б завести
   * друге правило «яка адреса відповідає цьому екрану» (AGENTS.md §7).
   */
  to?: string;
}

/** Ключ пункту повідомлень: на нього чіпляється число непрочитаних. */
export const MESSAGES_TAB_KEY = "messages";

export const PLATFORM_TABS: readonly PlatformTab[] = [
  { key: "home", label: "Головна", icon: "home", iconActive: "home-solid", slug: HOME_SLUG },
  {
    // «Простір» — спільний відкритий простір платформи: люди, які самі
    // показали свій профіль, а далі оголошення й сторінки.
    //
    // Адреса — **власна** (`/space`), а не `slug` рядка контенту: Простір є
    // вибіркою з даних, а не сторінкою, тож `to`, а не `slug`.
    key: "space",
    label: "Простір",
    icon: "feed",
    iconActive: "feed-solid",
    to: SPACE_PATH,
  },
  {
    // «+» лишається **дією за значенням** — тут починають створювати, — але
    // дією є сама адреса: сторінка хабу і є тим, що відкриває дотик.
    key: "create",
    label: "Створити",
    icon: "plus",
    primary: true,
    to: CREATE_PATH,
  },
  {
    key: MESSAGES_TAB_KEY,
    label: "Повідомлення",
    icon: "message-square",
    // Залитого близнюка цієї іконки в реєстрі немає, тож вибраний пункт
    // виділяє колір і жирніший штрих — як у будь-якого пункту без `iconActive`.
    to: MESSAGES_PATH,
  },
  {
    key: "profile",
    label: "Профіль",
    icon: "user",
    iconActive: "user-solid",
    to: PROFILE_PATH,
  },
];

/**
 * Число непрочитаних на пункті повідомлень.
 *
 * Окрема функція, а не `badge: unread` у виклику: правило «котрий пункт несе
 * число» мусить бути одне, і його треба перевіряти без DOM — `unread` більше
 * нуля поставити легко, а помилитись пунктом ще легше.
 *
 * Нуль і від'ємне **не** ставляться: `badge` без числа — це порожня позначка,
 * і краще не мати її зовсім (див. `ShellTab.badge`).
 */
export function withUnreadBadge(tabs: readonly TabBarItem[], unread: number): TabBarItem[] {
  if (!Number.isFinite(unread) || unread <= 0) return [...tabs];
  return tabs.map((tab) => (tab.key === MESSAGES_TAB_KEY ? { ...tab, badge: unread } : tab));
}

/** Той самий склад, але з готовими адресами — як очікує спільний `TabBar`. */
export function toShellTabs(tabs: readonly PlatformTab[] = PLATFORM_TABS): ShellTab[] {
  return tabs.map(({ slug, to, ...tab }) => ({
    ...tab,
    href: to ?? (slug === undefined ? undefined : toWebPath(slug)),
  }));
}
