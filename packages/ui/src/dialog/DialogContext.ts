/**
 * Контекст спільного діалогу та хук `useDialog`.
 *
 * Хук віддає той самий інтерфейс, що й `window`, але через React: застосунок
 * пише `await dialog.confirm(...)` і не знає, чим це намальовано.
 *
 * @module @wwwuabot/ui/dialog
 */

import { createContext, useContext } from "react";
import type { DialogApi } from "./types";

/**
 * Фолбек, якщо провайдера немає (наприклад, блок змонтовано в застосунку, який
 * його ще не підключив). Поводиться як звичайний `window.*`, тобто гірше, ніж
 * наш діалог, але не ламає рендер і не кидає виняток посеред обробника.
 */
const FALLBACK: DialogApi = {
  alert: async (message) => {
    window.alert(message);
  },
  confirm: async (message) => window.confirm(message),
  prompt: async (message, options) => window.prompt(message, options?.defaultValue ?? ""),
};

export const DialogContext = createContext<DialogApi | null>(null);

export function useDialog(): DialogApi {
  return useContext(DialogContext) ?? FALLBACK;
}
