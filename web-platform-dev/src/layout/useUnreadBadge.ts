/**
 * Скільки повідомлень чекає — число для бейджа у футері.
 *
 * **Чому опитування, а не пуш.** У Mini App пушів немає: Telegram WebView (і
 * WKWebView на iOS, і Android WebView) не дає Push API, а `addToHomeScreen()`
 * додає ярлик Telegram, а не PWA. Єдине, чим платформа може сказати «є нове»,
 * поки людина в застосунку, — сама смуга. Тому це **найлегший** шлях
 * (`GET /api/messages/badge` → одне число) і помірний крок: розмови не
 * змінюються щосекунди, а зайвий похід у базу нікому не потрібен.
 *
 * **Коли опитування спиняється.** Поки застосунок невидимий, питати нема сенсу:
 * людина не бачить ні бейджа, ні екрана. Тому таймер живе разом із видимістю, а
 * повернення у фокус опитує **одразу** — інакше після згортання число стояло б
 * старим рівно до наступного кроку таймера.
 *
 * Помилка тут не показується: бейдж — підказка, і «не вдалося порахувати» не
 * варте того, щоб вішати на екран повідомлення про збій. Мережа повернеться —
 * число повернеться.
 *
 * @module web-platform-dev/src/layout/useUnreadBadge
 */

import { useEffect, useState } from "react";
import { messagesApi } from "@/shared/api/messages.api";

/** Крок опитування: частіше — зайві запити, рідше — число помітно старіє. */
export const BADGE_POLL_MS = 25_000;

export function useUnreadBadge(): number {
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setInterval> | null = null;

    async function poll(): Promise<void> {
      try {
        const count = await messagesApi.badge();
        if (!cancelled) setUnread(count);
      } catch {
        // Мовчки: бейдж — підказка, а не стан, про який треба звітувати.
      }
    }

    function start(): void {
      if (timer !== null) return;
      void poll();
      timer = setInterval(() => void poll(), BADGE_POLL_MS);
    }

    function stop(): void {
      if (timer === null) return;
      clearInterval(timer);
      timer = null;
    }

    // `visibilitychange` — єдине, що справді каже «людина дивиться»: у Mini App
    // згортання не завжди дає `blur`, а `focus` приходить і без повернення
    // видимості (напр. після діалогу).
    function handleVisibility(): void {
      if (document.hidden) stop();
      else start();
    }

    if (document.hidden) stop();
    else start();
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      cancelled = true;
      stop();
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, []);

  return unread;
}
