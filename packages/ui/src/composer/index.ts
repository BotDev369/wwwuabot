/**
 * @wwwuabot/ui/composer — модалка швидкого створення (нотатка, оголошення).
 *
 * Підключення в оболонці:
 *
 *   import { ComposerModal } from "@wwwuabot/ui/composer";
 *   {open && <ComposerModal onClose={() => setOpen(false)} />}
 *
 * Хто саме її відкриває, вирішує оболонка: у смузі футера за це відповідає
 * центральний пункт-дія (`withPrimaryAction` з `@wwwuabot/ui/nav`).
 *
 * @module @wwwuabot/ui/composer
 */

export { ComposerModal } from "./ComposerModal";
export { COMPOSER_TABS, DEFAULT_COMPOSER_TAB, findComposerTab } from "./tabs";
export type { ComposerState } from "./useComposer";
export type { AttachmentKind, ComposerModalProps, ComposerTab } from "./types";
