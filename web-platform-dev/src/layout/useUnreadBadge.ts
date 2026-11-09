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
 * **Крок відступає, поки нічого не змінюється.** Відкритий застосунок з рівним
 * кроком 25 с — це 144 запити на годину в порожнечу. Тому крок росте, поки число
 * те саме (25 → 40 → 60 → 90 с, далі стеля), і **вертається до базового** на
 * будь-яку зміну числа, на сигнал `onUnreadChanged` і на повернення видимості.
 * Плата за це — чуже нове повідомлення до 1,5 хв на тихому екрані; виграш —
 * менше запитів саме тоді, коли читати нічого.
 *
 * **Коли опитування спиняється.** Поки застосунок невидимий, питати нема сенсу:
 * людина не бачить ні бейджа, ні екрана. Тому таймер живе разом із видимістю, а
 * повернення у фокус опитує **одразу** — інакше після згортання число стояло б
 * старим рівно до наступного кроку таймера.
 *
 * **Крок таймера — не єдиний привід перечитати число.** Прочитане й стерте
 * переписку змінюють той самий лічильник, і чекати на них до наступного кроку
 * означало б показувати непрочитане вже прочитаного. Тому цей хук слухає спільний
 * сигнал (`onUnreadChanged`) і на нього опитує **зразу**: число ставить сервер, і
 * клієнт лише просить його перерахувати.
 *
 * Помилка тут не показується: бейдж — підказка, і «не вдалося порахувати» не
 * варте того, щоб вішати на екран повідомлення про збій. Мережа повернеться —
 * число повернеться.
 *
 * @module web-platform-dev/src/layout/useUnreadBadge
 */

import { useEffect, useState } from "react";
import { onUnreadChanged } from "@wwwuabot/shared/messages";
import { messagesApi } from "@/shared/api/messages.api";

/** Базовий крок: одразу після зміни, сигналу чи повернення у фокус. */
export const BADGE_POLL_MS = 25_000;

/** Стеля відступу: далі крок не росте, навіть якщо тихо годинами. */
export const BADGE_POLL_MAX_MS = 90_000;

/** Кроки відступу, поки число не змінюється. */
const BADGE_POLL_STEPS = [BADGE_POLL_MS, 40_000, 60_000, BADGE_POLL_MAX_MS] as const;

export function useUnreadBadge(): number {
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    let cancelled = false;
    let running = false;
    let timer: ReturnType<typeof setTimeout> | null = null;
    let step = 0;
    let resetNext = true;
    let last: number | null = null;

    async function tick(): Promise<void> {
      timer = null;

      let changed = false;
      try {
        const count = await messagesApi.badge();
        if (cancelled) return;
        changed = last !== null && count !== last;
        last = count;
        setUnread(count);
      } catch {
        // Мовчки: бейдж — підказка, а не стан, про який треба звітувати.
      }

      if (cancelled || !running) return;
      step = changed || resetNext ? 0 : Math.min(step + 1, BADGE_POLL_STEPS.length - 1);
      resetNext = false;
      timer = setTimeout(() => void tick(), BADGE_POLL_STEPS[step] ?? BADGE_POLL_MAX_MS);
    }

    function start(): void {
      if (running) return;
      running = true;
      step = 0;
      resetNext = true;
      void tick();
    }

    function stop(): void {
      running = false;
      if (timer !== null) {
        clearTimeout(timer);
        timer = null;
      }
    }

    /** Привід перечитати зразу: власна дія або повернення у фокус. */
    function pollNow(): void {
      if (!running) return;
      resetNext = true;
      if (timer !== null) {
        clearTimeout(timer);
        timer = null;
      }
      void tick();
    }

    // `visibilitychange` — єдине, що справді каже «людина дивиться»: у Mini App
    // згортання не завжди дає `blur`, а `focus` приходить і без повернення
    // видимості (напр. після діалогу).
    function handleVisibility(): void {
      if (document.hidden) stop();
      else start();
    }

    // Сигнал «переписку змінили» — другий привід опитувати, крім таймера.
    // Невидимий екран його ігнорує: наступний `start()` і так питає зразу.
    const off = onUnreadChanged(() => pollNow());

    if (document.hidden) stop();
    else start();
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      cancelled = true;
      off();
      stop();
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, []);

  return unread;
}
