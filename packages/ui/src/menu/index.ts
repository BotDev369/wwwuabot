/**
 * @wwwuabot/ui/menu — меню-модалка: повноекранна поверхня зі списком пунктів.
 *
 * Підключення в оболонці:
 *
 *   import { MenuModal, buildMenuItems } from "@wwwuabot/ui/menu";
 *   {open && <MenuModal title="Профіль" items={items} onClose={() => setOpen(false)} />}
 *
 * Склад пунктів — свій у кожної оболонки (як і в футера); сама поверхня,
 * правило дотику й вигляд заглушки — спільні.
 *
 * @module @wwwuabot/ui/menu
 */

export { MenuModal } from "./MenuModal";
export { buildMenuItems } from "./build-items";
export type { BuildMenuItemsOptions } from "./build-items";
export type { MenuCardsLayout, MenuItem, MenuModalProps, ShellMenuItem } from "./types";
