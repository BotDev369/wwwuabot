import { Context } from "grammy";
import { LogMessage } from "./log";
import type { ScenarioButton } from "./scenario";

export interface BotUser {
  user_id: number;
  first_name?: string;
  last_name?: string;
  username?: string;
  language?: string;
  /**
   * Усе, що Telegram віддав про користувача (`ctx.from` як JSON) — щоб
   * профіль показував справжні дані, а не перелік, який ми самі склали.
   */
  telegram_json?: string;
  /** Ім'я на платформі (wwwuabot) — його обирає сам користувач, не Telegram. */
  platform_username?: string;
  is_blocked?: number | boolean;
  rate_limit_json?: string;
  active_scenario?: string | null;
  message_id?: number;
  my_dates?: string;
  created_at?: string;
  updated_at?: string;
  [key: string]: unknown;
}

export interface Env {
  BOT_TOKEN: string;
  /** Секрет Telegram webhook — для перевірки X-Telegram-Bot-Api-Secret-Token */
  SECRET_TOKEN: string;
  ENVIRONMENT: string;
  DB: D1Database;
  LOG_QUEUE: Queue<LogMessage>;
  GAS_LOG_WEBHOOK_URL: string;
  CLOUDINARY_CLOUD_NAME: string;
  /** Публічна база Mini App; без неї бот не додає автоматичну web_app-кнопку. */
  WEB_PLATFORM_URL?: string;
  /**
   * DSN із Sentry. Задається як Cloudflare Secret. Без нього Sentry вимкнено
   * — бот працює як звичайно.
   */
  SENTRY_DSN?: string;
  /** Binding Cloudflare `CF_VERSION_METADATA` — дає `id` релізу для Sentry. */
  CF_VERSION_METADATA?: { id?: string };
}

export interface ScreenState {
  slug: string;
  title?: string | null;
  photo_url: string;
  caption: {
    top?: string;
    mid?: string;
    bot?: string;
  };
  buttons: ScenarioButton[][];
  qty_options?: string | null;
  price?: number | null;
  notify_groups?: string | null;
  notify_template?: string | null;
  rich_message?: boolean;
  rich_data?: Record<string, unknown>[] | null;
  /** Повний шлях поточного маршруту; заповнюється для Telegram deep link. */
  web_path?: string;
}

export type AppContext = Context & {
  env: Env;
  user?: BotUser;
  userDirty?: boolean;
  menuDirty?: boolean;
  screen?: ScreenState;
  liveMessageSent?: boolean;
  pickTarget?: string;
  pendingNotification?: { data: Record<string, unknown> };
};

export interface Settings {
  bot_active: number;
  group_admin: string;
  [key: string]: unknown;
}
