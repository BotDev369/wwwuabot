import { Context } from "grammy";
import { LogMessage } from "./log";

export interface Env {
  BOT_TOKEN: string;
  /** Секрет Telegram webhook — для перевірки X-Telegram-Bot-Api-Secret-Token */
  SECRET_TOKEN: string;
  /** Адмінський секрет — для db-proxy, setup-webhook, webhook-info. ВІДРІЗНИЙ від SECRET_TOKEN! */
  ADMIN_SECRET: string;
  ENVIRONMENT: string;
  DB: D1Database;
  LOG_QUEUE: Queue<LogMessage>;
  GAS_LOG_WEBHOOK_URL: string;
  CLOUDINARY_CLOUD_NAME: string;
}

export interface ScreenState {
  codeword: string;
  title?: string | null;
  photo_url: string;
  caption: {
    top?: string;
    mid?: string;
    bot?: string;
  };
  buttons: any[][];
  qty_options?: string | null;
  price?: number | null;
  notify_groups?: string | null;
  notify_template?: string | null;
  rich_message?: boolean; // ← NEW
  rich_data?: any[] | null; // ← NEW
}

export type AppContext = Context & {
  env: Env;
  user?: Record<string, any>;
  userDirty?: boolean;
  menuDirty?: boolean;
  screen?: ScreenState;
  liveMessageSent?: boolean;
  pickTarget?: string;
  pendingNotification?: { data: Record<string, any> }; // ← ДОДАЄМО ЦЕ ПОЛЕ
};

export interface Settings {
  bot_active: number;
  group_admin: string;
  [key: string]: any;
}
