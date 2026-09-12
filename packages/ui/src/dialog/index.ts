/**
 * Спільний діалог для обох оболонок — замінює `window.alert/confirm/prompt`,
 * які не працюють у Telegram Mini App на iOS.
 *
 * Підключення (один раз, біля кореня застосунку):
 *
 *   import { DialogProvider } from "@wwwuabot/ui/dialog";
 *   <DialogProvider><App /></DialogProvider>
 *
 * Використання:
 *
 *   import { useDialog } from "@wwwuabot/ui/dialog";
 *   const dialog = useDialog();
 *   if (!(await dialog.confirm("Видалити?"))) return;
 *
 * @module @wwwuabot/ui/dialog
 */

export { DialogProvider } from "./DialogProvider";
export { useDialog } from "./DialogContext";
export type { AlertOptions, ConfirmOptions, DialogApi, DialogTone, PromptOptions } from "./types";
