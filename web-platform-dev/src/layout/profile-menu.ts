/**
 * Склад меню профілю — того, що відкривається дотиком до «Профіль» у футері.
 *
 * Тут лише **склад**: пункти, їхні адреси й те, що кожен із них обіцяє. Саму
 * поверхню, правило дотику й вигляд заглушки дає спільний `MenuModal`
 * (`@wwwuabot/ui/menu`) — та сама пара «склад ↔ розмітка», що у футера
 * (`platform-tabs.ts` + `@wwwuabot/ui/nav`).
 *
 * **Порядок — згори вниз, і він навмисно зворотний до того, як його диктують
 * звичкою.** Профільні розділи стоять угорі, «Тема» — у самому низу: те, що
 * стосується людини й контенту, читають першим, а налаштування — останнім.
 *
 * Пункт без `href` і без дії — заглушка, і це чесно видно ще до дотику: у
 * рядка є пояснення, що там буде (`status: "soon"`). Так само поводиться
 * пункт футера без адреси — краще сказати, ніж мовчки нічого не робити (§7).
 *
 * @module web-platform-dev/src/layout/profile-menu
 */

import { toWebPath } from "@wwwuabot/shared/content";
import type { IconName } from "@wwwuabot/shared";
import type { ShellMenuItem } from "@wwwuabot/ui/menu";

/**
 * Екран «МоїНотатки» — власний маршрут, а не рядок контенту.
 *
 * Окремий шлях, а не `slug`, з тієї самої причини, що й у профілю: список
 * нотаток збирається з даних людини (`notes`), а не з `page_data` рядка
 * `scenarios` (AGENTS.md §7).
 */
/** Сегмент маршруту (без слеша — так його чекає роутер; `app/router.tsx`). */
export const NOTES_ROUTE = "notes";

/** Адреса того ж екрана — те, на що веде пункт меню. */
export const NOTES_PATH = `/${NOTES_ROUTE}`;

/** Вид усередині меню: список розділів або панель теми. */
export type ProfileMenuView = "list" | "theme";

export interface BuildProfileItemsOptions {
  /** Відкрити панель теми: вона живе в тій самій поверхні, окремим видом. */
  onOpenTheme: () => void;
}

/** Стани теми, потрібні панелі: що вибрано й чим вибирають. */
export interface ThemeChoice {
  brand: "apple" | "android";
  scheme: "light" | "dark";
  setBrand: (brand: "apple" | "android") => void;
  setScheme: (scheme: "light" | "dark") => void;
}

export function buildProfileItems({ onOpenTheme }: BuildProfileItemsOptions): ShellMenuItem[] {
  return [
    {
      key: "contacts",
      label: "МоїКонтакти",
      icon: "mail",
      status: "soon",
      hint: "Телефони, пошти й месенджери — одним списком для бота та сторінок.",
    },
    {
      key: "locations",
      label: "МоїЛокації",
      icon: "globe",
      status: "soon",
      hint: "Адреси й координати місць, які згадуються у сценаріях.",
    },
    { key: "mydate", label: "МоїДати", icon: "my-dates", href: toWebPath("mydate") },
    {
      key: "pages",
      label: "МоїСторінки",
      icon: "layout",
      status: "soon",
      hint: "Створені сторінки: адреса, зони й що з них уже опубліковано.",
    },
    { key: "notes", label: "МоїНотатки", icon: "text", href: NOTES_PATH },
    { key: "theme", label: "Тема", icon: "sliders", onSelect: onOpenTheme },
  ];
}

/**
 * Панель теми — той самий список, лише з вибором.
 *
 * Вибір показує галочка (`selected`), а не перехід: це не навігація, а стан,
 * який видно на власні очі. Обидва перемикачі тут, а не в окремій модалці,
 * бо тема — це одна річ, і тримати її в двох поверхнях означало б два місця
 * для одного факту.
 */
export function buildThemeItems(choice: ThemeChoice): ShellMenuItem[] {
  const brand = (value: "apple" | "android", label: string, icon: IconName): ShellMenuItem => ({
    key: `brand-${value}`,
    label,
    icon,
    selected: choice.brand === value,
    onSelect: () => choice.setBrand(value),
  });

  const scheme = (value: "light" | "dark", label: string, icon: IconName): ShellMenuItem => ({
    key: `scheme-${value}`,
    label,
    icon,
    selected: choice.scheme === value,
    onSelect: () => choice.setScheme(value),
  });

  return [
    brand("apple", "Apple", "grid"),
    brand("android", "Android", "blocks"),
    scheme("light", "Світла", "sun"),
    scheme("dark", "Темна", "moon"),
  ];
}
