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
import { telegramAuthHeaders } from "@wwwuabot/shared/security/telegram";

/** fetch до api-dev із заголовками ідентичності. Повертає сиру відповідь. */
export function apiFetchRaw(
  path: string,
  init: RequestInit = {},
): Promise<Response> {
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
  return sharedApiFetch<T>(endpoint, {
    headers: telegramAuthHeaders(),
    fetchOptions: options,
  });
}
