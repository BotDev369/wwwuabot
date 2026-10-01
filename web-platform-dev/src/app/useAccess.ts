import { useEffect, useState } from "react";
import { telegramAuthHeaders } from "@wwwuabot/shared/security/telegram";

/**
 * Чи є підписаний `initData` від Telegram.
 *
 * Перевіряємо саме `initData` (підписаний рядок), а не `initDataUnsafe.user`:
 * api-dev довіряє виключно підпису, тож клієнтський гейт має перевіряти те
 * саме, що й сервер. Поза Telegram SDK лишає об'єкт порожнім.
 */
function hasTelegramSession(): boolean {
  try {
    return !!window.Telegram?.WebApp?.initData;
  } catch {
    return false;
  }
}

/** Відповідь `GET /api/user/access`. */
interface AccessResponse {
  allowed: boolean;
}

export interface Access {
  /** Платформа взагалі не має чого показувати: відкрито поза ботом. */
  outsideTelegram: boolean;
  /** Допуск є. */
  allowed: boolean;
  /** Відповідь прийшла (або її не потрібно): до неї платформу не показуємо. */
  ready: boolean;
}

/**
 * Допуск людини до платформи.
 *
 * **Поза ботом платформа не відкривається взагалі.** Без підписаного `initData`
 * ми не знаємо, хто перед нами, а значить не маємо що ані показувати, ані
 * приймати від когось «прохання». Тому запит `/api/user/access` без підпису
 * не йде, а гейт повертає `outsideTelegram: true` — і застосунок не малює
 * нічого.
 *
 * **Одне запрошення, один запит.** Коли підпис є, питання про допуск іде один
 * раз у `/api/user/access` — єдиний шлях, який сам запит про допуск і не
 * закритий гейтом.
 *
 * **`null` — ще невідомо, `false` — відмова.** Три стани, а не два, бо
 * «перевіряємо» й «закрито» — різні екрани: перший чекає, другий пояснює.
 *
 * **Помилка — це «ні».** Якщо запит не вдався, ми не знаємо, чи є допуск, а
 * показувати закритий продукт незнайомій людині небезпечніше, ніж показати
 * відмову зайвій.
 */
export function useAccess(): Access {
  const outsideTelegram = !hasTelegramSession();
  // `null` лише до відповіді.
  const [allowed, setAllowed] = useState<boolean | null>(null);

  useEffect(() => {
    if (outsideTelegram || allowed !== null) return;

    let cancelled = false;
    void (async () => {
      try {
        const response = await fetch("/api/user/access", { headers: telegramAuthHeaders() });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const body = (await response.json()) as AccessResponse;
        if (!cancelled) setAllowed(body.allowed === true);
      } catch {
        if (!cancelled) setAllowed(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [outsideTelegram, allowed]);

  return {
    outsideTelegram,
    allowed: allowed === true,
    ready: !outsideTelegram && allowed !== null,
  };
}
