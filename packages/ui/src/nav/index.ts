/**
 * @wwwuabot/ui/nav — глобальний нижній футер (tab bar).
 *
 * Обидві оболонки мають однакову смугу внизу екрана: рівні слоти, активний
 * підсвічено залитим колом під іконкою, крайній справа — профіль. Розмітка й
 * стилі — спільні, склад пунктів — свій у кожної оболонки.
 *
 * @module @wwwuabot/ui/nav
 */

export { TabBar } from "./TabBar";
export { buildTabBarItems, isTabActive } from "./build-items";
export type { BuildTabBarItemsOptions } from "./build-items";
export type { ShellTab, TabBarItem } from "./types";
