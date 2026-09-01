/**
 * Environment bindings for the API Cloudflare Worker.
 * Declared here once, imported by all controllers and the router.
 */
export interface Env {
  DB: D1Database;
  CONTENT_KV: KVNamespace;
  /** Токен Telegram бота (для setup-webhook) */
  BOT_TOKEN?: string;
  /** Секрет Telegram webhook (для setup-webhook) */
  SECRET_TOKEN?: string;
  /** Адмінський секрет (для db-proxy, webhook-info, auth-check) */
  ADMIN_SECRET?: string;
}
