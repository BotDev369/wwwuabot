/**
 * web (TWA) API client.
 * Обгортка над shared apiFetch для Telegram WebApp контексту.
 * Cookie-based auth не потрібен (auth через Telegram WebApp SDK headers).
 */

import { apiFetch as sharedApiFetch } from "@wwwuabot/shared";

export async function apiFetch<T = unknown>(
  endpoint: string,
  options: RequestInit = {},
): Promise<T> {
  return sharedApiFetch<T>(endpoint, {
    fetchOptions: options,
  });
}
