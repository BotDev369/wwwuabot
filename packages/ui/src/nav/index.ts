/**
 * @wwwuabot/ui/nav — глобальний нижній футер (tab bar).
 *
 * Обидві оболонки мають однакову смугу внизу екрана: рівні слоти, вибраний
 * пункт показує ЗАЛИТИЙ варіант своєї іконки, у центрі — слот дії, крайній
 * справа — профіль. Розмітка й стилі — спільні, склад пунктів — свій у кожної
 * оболонки.
 *
 * @module @wwwuabot/ui/nav
 */

export { TabBar } from "./TabBar";
export { buildTabBarItems, isTabActive, withPrimaryAction } from "./build-items";
export type { BuildTabBarItemsOptions } from "./build-items";
export type { ShellTab, TabBarItem } from "./types";
