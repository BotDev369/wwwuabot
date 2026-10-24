/**
 * web (TWA) API client.
 *
 * ЄДИНЕ місце, яке додає ідентичність до запитів: підписаний Telegram
 * `initData`. Контролери api-dev беруть `user_id` тільки з нього
 * (див. `api-dev/src/shared/identity.ts`), тому жоден виклик не можна
 * робити «голим» `fetch()` — інакше дістанеш 401.
 *
 * @module web-platform-dev/src/shared/api
 */

import { apiFetch as sharedApiFetch } from "@wwwuabot/shared";
import { shouldRecordPlatformAction } from "@wwwuabot/shared/events";
import { telegramAuthHeaders } from "@wwwuabot/shared/security/telegram";
import { cancelHeldClick } from "@/layout/platform-journal";

/**
 * Дотик, що став зміною стану, не пише себе ще раз: журнал уже матиме рядок
 * від сервера («Зберіг нотатку»). Читання нічого не пише, тож дотик лишається.
 */
function settleHeldClick(path: string, method: string | undefined): void {
  if (shouldRecordPlatformAction(method ?? "GET", path.split("?")[0])) cancelHeldClick();
}

/** fetch до api-dev із заголовками ідентичності. Повертає сиру відповідь. */
export function apiFetchRaw(path: string, init: RequestInit = {}): Promise<Response> {
  settleHeldClick(path, init.method);
  return fetch(path, {
    ...init,
    headers: {
      ...telegramAuthHeaders(),
      ...(init.headers as Record<string, string> | undefined),
    },
  });
}

/** Те саме, але з розбором JSON і винятком при помилці. */
export async function apiFetch<T = unknown>(
  endpoint: string,
  options: RequestInit = {},
): Promise<T> {
  settleHeldClick(endpoint, options.method);
  return sharedApiFetch<T>(endpoint, {
    headers: telegramAuthHeaders(),
    fetchOptions: options,
  });
}

/**
 * Завантаження файлу: multipart **без** `Content-Type` у запиті.
 *
 * Окрема ручка, бо спільний клієнт ставить `Content-Type: application/json` — а
 * для multipart це зіпсувало б межу частин, і сервер не розібрав би форму. Тому
 * заголовок вмісту тут не ставиться узагалі: його визначає браузер.
 */
export async function apiUpload<T = unknown>(path: string, form: FormData): Promise<T> {
  const response = await apiFetchRaw(path, { method: "POST", body: form });
  if (!response.ok) {
    const err = await response.json().catch(() => ({ error: `HTTP ${response.status}` }));
    throw new Error((err as { error?: string }).error ?? `HTTP ${response.status}`);
  }
  return (await response.json()) as T;
}
