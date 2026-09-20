/**
 * @wwwuabot/ui/menu — меню-модалка: повноекранна поверхня зі списком пунктів.
 *
 * Підключення в оболонці:
 *
 *   import { MenuModal, buildMenuItems } from "@wwwuabot/ui/menu";
 *   {open && <MenuModal title="Теги" items={items} onClose={() => setOpen(false)} />}
 *
 * Склад пунктів — свій у кожної оболонки (як і в футера); сама поверхня,
 * правило дотику й вигляд заглушки — спільні.
 *
 * `MenuList` — та сама розмітка **без** поверхні: сторінка (хаб профілю
 * платформи) показує ті самі пункти в потоці.
 *
 * @module @wwwuabot/ui/menu
 */

export { MenuModal } from "./MenuModal";
export { MenuList } from "./MenuList";
export type { MenuListProps } from "./MenuList";
export { buildMenuItems } from "./build-items";
export type { BuildMenuItemsOptions } from "./build-items";
export type { MenuItem, MenuLayout, MenuModalProps, ShellMenuItem } from "./types";
