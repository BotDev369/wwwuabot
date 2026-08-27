/**
 * Мінімальний логер для api-воркера.
 * Використовує console.error для помилок (не структурований, але з префіксом [api]).
 * Для продакшн-логування можна розширити (напр. до Cloudflare Queue, як у bot/).
 */
export const apiLog = {
  info(message: string, data?: Record<string, unknown>): void {
    console.log(`[api] ${message}`, data ? JSON.stringify(data) : "");
  },
  error(message: string, error?: unknown): void {
    const detail = error instanceof Error ? error.message : String(error);
    console.error(`[api] ${message}:`, detail);
  },
};
