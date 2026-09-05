import { Context } from "grammy";
import { LogMessage } from "./log";
import type { ScenarioButton } from "./scenario";

export interface BotUser {
  user_id: number;
  first_name?: string;
  last_name?: string;
  username?: string;
  language?: string;
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
  buttons: ScenarioButton[][];
  qty_options?: string | null;
  price?: number | null;
  notify_groups?: string | null;
  notify_template?: string | null;
  rich_message?: boolean;
  rich_data?: Record<string, unknown>[] | null;
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
