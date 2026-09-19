/**
 * Склад пунктів нижнього футера платформи.
 *
 * Порядок і ролі — за патерном топових застосунків: рівні слоти, у центрі —
 * «+» (слот дії), крайній справа — профіль. Вибраний розділ показує ЗАЛИТИЙ
 * варіант своєї іконки: це той самий знак, тож перехід між розділами не
 * смикає смугу, а фонового кола під іконкою немає взагалі.
 *
 * Пункт описується САМИМ `slug` сторінки, а не рядком URL: це та сама
 * сутність адреси, з якої `toWebPath()` будує веб-шлях (AGENTS.md §7). Пункт
 * без `slug` — заглушка: екрана під ним ще немає, і дотик чесно про це скаже
 * замість тиші.
 *
 * @module web-platform-dev/src/layout/platform-tabs
 */

import { HOME_SLUG, toWebPath } from "@wwwuabot/shared/content";
import type { ShellTab, TabBarItem } from "@wwwuabot/ui/nav";

export interface PlatformTab extends Omit<ShellTab, "href"> {
  /** Адреса сторінки — `slug` рядка `scenarios`. Немає — заглушка. */
  slug?: string;
  /**
   * Маршрут, який **не** є рядком контенту (профіль). Окреме поле, а не
   * `slug`, бо тут адреса не береться з бази: вигадати `slug` під екран, у
   * якого немає `page_data`, означало б завести друге правило «яка адреса
   * відповідає цьому екрану» (AGENTS.md §7).
   */
  to?: string;
}

/**
 * Адреса профілю — єдиний екран платформи, який не є рядком контенту.
 *
 * Константа, а не рядок на місці: на цей шлях ведуть двоє — пункт футера
 * (коли меню профілю не було) і картка «хто ти» в самому меню. Два літерали
 * розійшлися б тихо, і один із них вів би на 404.
 */
export const PROFILE_PATH = "/profile";

/** Ключ пункту профілю: футер вішає на нього меню замість навігації. */
export const PROFILE_TAB_KEY = "profile";

/**
 * Екран «Повідомлення» — теж власний маршрут, а не рядок контенту.
 *
 * Переписка живе в своїх таблицях (`conversations`, `messages`), а не в
 * `page_data`: це дані людини, і сторінкою контенту вони не бувають — та сама
 * причина, що в нотаток, контактів і профілю (AGENTS.md §7).
 *
 * Адреса тут, а не в `profile-menu.ts`, бо пункт живе **у футері**: меню
 * профілю до переписки не веде (це розділ, а не налаштування), і тримати
 * константу в його модулі означало б зв'язок ні за чим.
 */
export const MESSAGES_PATH = "/messages";

/** Ключ пункту повідомлень: на нього чіпляється число непрочитаних. */
export const MESSAGES_TAB_KEY = "messages";

export const PLATFORM_TABS: readonly PlatformTab[] = [
  { key: "home", label: "Головна", icon: "home", iconActive: "home-solid", slug: HOME_SLUG },
  {
    key: "mydate",
    label: "Дати",
    icon: "my-dates",
    iconActive: "my-dates-solid",
    slug: "mydate",
  },
  { key: "create", label: "Створити", icon: "plus", primary: true },
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
