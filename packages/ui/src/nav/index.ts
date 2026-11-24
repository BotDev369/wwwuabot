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
 * `ContextBar` — **контекстний футер**: дії поточного екрана (групи, порядок,
 * «+») над головною смугою. Смуга однакова, склад дій задає екран.
 *
 * `SideBar` — **єдиний сайдбар продукту**: меню адмінки й список розділів
 * теми рендрить він, а не дві схожі розмітки.
 *
 * `AppBar` — закріплений хедер застосунку й **лише він**: ліворуч крохи,
 * праворуч гамбургер. Дій сторінки (поділитись, обране) в хедері немає — їх
 * сховано, поки не знайдеться їм місце; тему й навігацію тримає правий
 * сайдбар.
 *
 * @module @wwwuabot/ui/nav
 */

export { AppBar } from "./AppBar";
export { MenuButton, MENU_LABEL } from "./MenuButton";
export { ScreenChromeProvider } from "./ScreenChromeProvider";
export { useScreenChrome } from "./useScreenChrome";
export { useCopyLink } from "./useCopyLink";
export { ScreenChromeContext } from "./screen-chrome";
export type { ScreenChrome, ScreenChromePatch } from "./screen-chrome";
export { TabBar } from "./TabBar";
export { SubBar, buildSubBarItems } from "./SubBar";
export { ContextBar } from "./ContextBar";
export type { ContextAction } from "./ContextBar";
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
