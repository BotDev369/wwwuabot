/**
 * `useScreenChrome` — екран розповідає хедеру про себе.
 *
 * **Чому ефект, а не рендер.** Патч приходить під час рендеру екрана, а стан
 * хедера читає рендер хедера (іншого екрана): оновити стан з рендеру значило б
 * стан під час рендеру. Ефект робить це після нього.
 *
 * **Патч можна передавати кожного рендеру.** `update` повертає той самий об'єкт
 * стану, коли нічого не змінилося, тож повторний той самий патч рендер не
 * ганяє.
 *
 * @module packages/ui/src/nav/useScreenChrome
 */

import { useContext, useEffect } from "react";
import { ScreenChromeContext, type ScreenChromePatch } from "./screen-chrome";

export function useScreenChrome(chrome: ScreenChromePatch, enabled = true): void {
  const update = useContext(ScreenChromeContext)?.update;

  useEffect(() => {
    // Без провайдера (попередній перегляд сторінки в адмінці) хедера немає —
    // тоді оголошувати нічого й не треба.
    if (!enabled) return;
    update?.(chrome);
  }, [update, enabled, chrome]);
}
