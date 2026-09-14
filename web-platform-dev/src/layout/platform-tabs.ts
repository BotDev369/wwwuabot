/**
 * Склад пунктів нижнього футера платформи.
 *
 * Порядок і ролі — за патерном топових застосунків: рівні слоти, активний
 * підсвічено колом під іконкою, крайній справа — профіль. Окремої кнопки «+»
 * немає: вона вибивалась би розміром із ряду равних пунктів.
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
}

export const PLATFORM_TABS: readonly PlatformTab[] = [
  { key: "home", label: "Головна", icon: "home", slug: HOME_SLUG },
  { key: "mydate", label: "МоїДати", icon: "my-dates", slug: "mydate" },
  { key: "galyashop", label: "GalyaShop", icon: "tag", slug: "galyashop" },
  { key: "profile", label: "Профіль", icon: "user" },
];

/** Той самий склад, але з готовими адресами — як очікує спільний `TabBar`. */
export function toShellTabs(tabs: readonly PlatformTab[] = PLATFORM_TABS): ShellTab[] {
  return tabs.map(({ slug, ...tab }) => ({
    ...tab,
    href: slug === undefined ? undefined : toWebPath(slug),
  }));
}
