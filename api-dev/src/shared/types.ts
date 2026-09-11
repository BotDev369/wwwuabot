/**
 * Environment bindings for the API Cloudflare Worker.
 * Declared here once, imported by all controllers and the router.
 */
export interface Env {
  DB: D1Database;
  CONTENT_KV: KVNamespace;
  /** Токен Telegram бота — виклики api.telegram.org (налаштування вебхука). */
  BOT_TOKEN?: string;
  /** Секрет Telegram webhook — ставиться в secret_token при setWebhook. */
  SECRET_TOKEN?: string;
  /**
   * Пароль входу в адмінку І ключ підпису cookie `admin_session`.
   *
   * Використовується лише в `auth.controller.ts` (перевірка пароля) та
   * `@wwwuabot/shared/security/session` (HMAC-підпис токена).
   * Як заголовок для API-викликів НЕ використовується — усі адмін-дії
   * йдуть виключно через cookie-сесію (див. `router.ts`, адмін-гейт).
   */
  ADMIN_SECRET?: string;
}
