/**
 * Environment bindings for the API Cloudflare Worker.
 * Declared here once, imported by all controllers and the router.
 */
export interface Env {
  DB: D1Database;
  CONTENT_KV: KVNamespace;
  /**
   * Фото й файли магазину — R2-бакет середовища (`wwwuabot-shop-dev`).
   *
   * Байти лежать у бакеті, облік — у рядках `shop_media`: товар зберігає
   * **номери** рядків, а не адреси, бо адреса залежить від бакета й змінилася б
   * разом із ним (`docs/SHOPS.md` §5).
   *
   * Необов'язковий, як `CF_VERSION_METADATA`: він є в `wrangler.toml`, але
   * тестове оточення його не дає, а читати його буде лише магазин — тож той,
   * хто читає, сам відповідає за 503, коли біндингу немає (як із будь-якою
   * залежністю, якої може не бути в конкретному оточенні).
   */
  SHOP_MEDIA?: R2Bucket;
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
  /**
   * DSN із Sentry. Задається як Cloudflare Secret (`wrangler secret put` або
   * Dashboard). Без нього Sentry вимкнено — воркер працює як звичайно.
   * Див. `@wwwuabot/shared/observability/sentry`.
   */
  SENTRY_DSN?: string;
  /** Середовище для подій Sentry (`dev` / `production`). */
  ENVIRONMENT?: string;
  /**
   * Репозиторій моніторингу у форматі `owner/name` — звичайна змінна в
   * `wrangler.toml` `[vars]`, не секрет. Порожнє значення = типовий.
   */
  MONITOR_GITHUB_REPO?: string;
  /**
   * Read-only токен GitHub для збору показників (Cloudflare Secret
   * `GITHUB_MONITOR_TOKEN`). Без нього публічний репозиторій читається
   * анонімно (60 запитів/год на IP воркера), приватний — не читається зовсім.
   */
  GITHUB_MONITOR_TOKEN?: string;
  /**
   * Read-only токен Cloudflare (Cloudflare Secret `CF_MONITOR_TOKEN`) —
   * знадобиться для збору по D1/KV/R2/воркерах. Поки не використовується:
   * джерело показників етапу 2.
   */
  CF_MONITOR_TOKEN?: string;
  /** Account id Cloudflare (не секрет): `/accounts/{id}/analytics` етапу 2. */
  MONITOR_CF_ACCOUNT_ID?: string;
  /** Binding Cloudflare `CF_VERSION_METADATA` — дає `id` релізу для Sentry. */
  CF_VERSION_METADATA?: { id?: string };
}
