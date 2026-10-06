/**
 * Висота хедера застосунку — виміряна, а не виведена з токена.
 *
 * `min-height` — підлога, а не стеля: два рядки назви на збільшеному шрифті
 * вищі за `--topbar-h`, а від висоти хедера відлічують закріплені речі
 * сторінки. Тож хук публікує справжню висоту в `--appbar-h`; токен з
 * `tokens.css` лишається початковим — до першого виміру.
 */

import { useEffect, type RefObject } from "react";

export function useAppBarHeight(ref: RefObject<HTMLElement | null>): void {
  useEffect(() => {
    const header = ref.current;
    if (!header) return;

    const root = document.documentElement;
    const publish = () => {
      const height = Math.ceil(header.getBoundingClientRect().height);
      // Нуль означає «розкладки немає» (серверний рендер, тести): тоді хай
      // лишається значення з токена, а не хедер нульової висоти.
      if (height > 0) root.style.setProperty("--appbar-h", `${height}px`);
    };

    publish();

    // Висота міняється від усього — назва екрана, шрифт людини, safe-area від
    // Telegram, — тож дивимось на сам елемент, а не на події вікна.
    const observer = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(publish);
    observer?.observe(header);

    return () => {
      observer?.disconnect();
      root.style.removeProperty("--appbar-h");
    };
  }, [ref]);
}
