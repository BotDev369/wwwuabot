/**
 * `useScreenChrome` — екран розповідає хедеру про себе.
 *
 * **Оголошення екрана — повне, а не ланцюжок.** Екран не «доповнює» хедер, а
 * замінює його зміст: перейшовши з профілю (де теми немає) в «Обране» (де вона
 * є), екран має сказати про тему `true`. Тому при виході хедер скидається на
 * пустий стан — інакше другий екран успадкував би рішення першого (тема
 * зникала б при кожному переході).
 *
 * **Ключ, а не об'єкт.** Екран створює патч на кожному рендері, тож ефект
 * залежить від рядка-ключа, а не від об'єкта: інакше він ганяв би рендер по
 * колу (стан → контекст → рендер екрана → новий патч → …). Значення в ref
 * тому, що свіжим є останній патч, а ефект мусить бачити саме його.
 *
 * @module packages/ui/src/nav/useScreenChrome
 */

import { useContext, useEffect, useRef } from "react";
import { EMPTY_CHROME, ScreenChromeContext, type ScreenChromePatch } from "./screen-chrome";

export function useScreenChrome(chrome: ScreenChromePatch, enabled = true): void {
  const update = useContext(ScreenChromeContext)?.update;

  const latest = useRef(chrome);
  latest.current = chrome;

  // Рядок-ключ: змінюється тоді, коли змінилося те, що екран сказав. Ручку
  // порівнюємо лише як «є / немає» — вона змінюється на кожному рендері.
  const key = [
    chrome.title ?? "",
    chrome.menu ? "1" : "",
    chrome.shareUrl ?? "",
    JSON.stringify(chrome.favorite ?? null),
    String(chrome.theme ?? ""),
  ].join("|");

  useEffect(() => {
    // Без провайдера (попередній перегляд сторінки в адмінці) хедера немає —
    // тоді оголошувати нічого й не треба.
    if (!enabled || !update) return;
    const patch = latest.current;
    update({ ...patch, theme: patch.theme ?? true });
  }, [update, enabled, key]);

  // Вихід екрана очищає хедер: наступний говоритиме з чистого аркуша.
  useEffect(
    () => () => {
      update?.({ ...EMPTY_CHROME });
    },
    [update],
  );
}
