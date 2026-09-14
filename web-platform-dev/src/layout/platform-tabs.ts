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
import type { ShellTab } from "@wwwuabot/ui/nav";

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

export const PLATFORM_TABS: readonly PlatformTab[] = [
  { key: "home", label: "Головна", icon: "home", iconActive: "home-solid", slug: HOME_SLUG },
  {
    key: "mydate",
    label: "МоїДати",
    icon: "my-dates",
    iconActive: "my-dates-solid",
    slug: "mydate",
  },
  { key: "create", label: "Створити", icon: "plus", primary: true },
  {
    key: "galyashop",
    label: "GalyaShop",
    icon: "shop",
    iconActive: "shop-solid",
    slug: "galyashop",
  },
  { key: "profile", label: "Профіль", icon: "user", iconActive: "user-solid", to: "/profile" },
];

/** Той самий склад, але з готовими адресами — як очікує спільний `TabBar`. */
export function toShellTabs(tabs: readonly PlatformTab[] = PLATFORM_TABS): ShellTab[] {
  return tabs.map(({ slug, to, ...tab }) => ({
    ...tab,
    href: to ?? (slug === undefined ? undefined : toWebPath(slug)),
  }));
}
