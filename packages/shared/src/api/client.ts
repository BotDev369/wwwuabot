/**
 * Єдиний API-транспорт для web та web-admin.
 *
 * Відмінності між воркерами:
 * - **web (TWA):** cookie не потрібні (auth через Telegram WebApp SDK headers),
 *   401 не очікується.
 * - **web-admin:** cookie-based auth (браузер додає автоматично),
 *   при 401 — перезавантажуємо сторінку (React покаже LoginScreen).
 *
 * При використанні передайте `credentials: "same-origin"` для web-admin.
 */

export interface ApiClientOptions {
  /** Додаткові заголовки (напр. X-Telegram-User-Id) */
  headers?: Record<string, string>;
  /** Fetch options (method, body, credentials тощо) */
  fetchOptions?: RequestInit;
  /** Обробник помилки 401 (за замовчуванням — нічого) */
  onUnauthorized?: () => void;
}

/**
 * Універсальний fetch-обгортка для API-запитів.
 *
 * @param endpoint — шлях, напр. `/api/scenarios/list`
 * @param options — опціональні параметри
 * @returns розпарсена відповідь JSON
 * @throws Error при помилці
 */
export async function apiFetch<T = unknown>(
  endpoint: string,
  options: ApiClientOptions = {},
): Promise<T> {
  const { headers = {}, fetchOptions = {}, onUnauthorized } = options;

  const response = await fetch(endpoint, {
    ...fetchOptions,
    headers: {
      "Content-Type": "application/json",
      ...headers,
      ...fetchOptions.headers,
    },
  });

  if (response.status === 401) {
    if (onUnauthorized) {
      onUnauthorized();
    }
    throw new Error("Session expired");
  }

  if (!response.ok) {
    const err = await response
      .json()
      .catch(() => ({ error: `HTTP ${response.status}` }));
    throw new Error(
      (err as { error?: string }).error ?? `HTTP ${response.status}`,
    );
  }

  return response.json() as Promise<T>;
}
