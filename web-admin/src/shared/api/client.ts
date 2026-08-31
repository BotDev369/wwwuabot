/**
 * web-admin API client.
 * Обгортка над shared apiFetch з cookie-based auth та обробкою 401.
 */

import { apiFetch as sharedApiFetch } from "@wwwuabot/shared";

export async function apiFetch<T = unknown>(
  endpoint: string,
  options: RequestInit = {},
): Promise<T> {
  return sharedApiFetch<T>(endpoint, {
    fetchOptions: {
      ...options,
      credentials: "same-origin",
    },
    onUnauthorized: () => {
      window.location.reload();
    },
  });
}
