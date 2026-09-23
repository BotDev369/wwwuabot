/**
 * @wwwuabot/ui/nav — навігація низу екрана: головна смуга й друга під нею.
 *
 * Обидві оболонки мають однакову смугу внизу екрана: рівні слоти, вибраний
 * пункт показує ЗАЛИТИЙ варіант своєї іконки, у центрі — слот дії, крайній
 * справа — профіль. Розмітка й стилі — спільні, склад пунктів — свій у кожної
 * оболонки.
 *
 * `SubBar` — **друга** смуга, над головною: вона веде між сторінками одного
 * розділу (налаштування теми), а не між розділами продукту.
 *
 * `SideBar` — **єдиний сайдбар продукту**: меню адмінки, панель розділів
 * Простору й список розділів теми рендрить він, а не три схожі розмітки.
 *
 * @module @wwwuabot/ui/nav
 */

export { TabBar } from "./TabBar";
export { SubBar, buildSubBarItems } from "./SubBar";
export { SideBar, SideBarMenu } from "./Sidebar";
export type { SideBarProps } from "./Sidebar";
export { buildTabBarItems, isTabActive, withPrimaryAction } from "./build-items";
export type { BuildTabBarItemsOptions } from "./build-items";
export type {
  ShellSubItem,
  ShellTab,
  SideBarItem,
  SideBarSection,
  SubBarItem,
  TabBarItem,
} from "./types";
