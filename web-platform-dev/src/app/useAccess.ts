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
  /** Допуск є. */
  allowed: boolean;
  /** Відповідь прийшла (або її не потрібно): до неї платформу не показуємо. */
  ready: boolean;
}

/**
 * Допуск людини до платформи.
 *
 * **Одне запрошення, один запит.** Без підпису `/api/user/access` відповість
 * `allowed: false`, тож окремий запит «а чи є підпис» був би зайвим.
 *
 * **`null` — ще невідомо, `false` — відмова.** Три стани, а не два, бо
 * «перевіряємо» й «закрито» — різні екрани: перший чекає, другий пояснює.
 *
 * **Помилка — це «ні».** Якщо запит не вдався, ми не знаємо, чи є допуск, а
 * показувати закритий продукт незнайомій людині небезпечніше, ніж показати
 * відмову зайвій.
 */
export function useAccess(): Access {
  const hasSession = hasTelegramSession();
  // `null` лише до відповіді; стан не скидається на запит, якого не було.
  const [allowed, setAllowed] = useState<boolean | null>(hasSession ? null : false);

  useEffect(() => {
    if (!hasSession || allowed !== null) return;

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
  }, [hasSession, allowed]);

  return { allowed: allowed === true, ready: allowed !== null };
}
