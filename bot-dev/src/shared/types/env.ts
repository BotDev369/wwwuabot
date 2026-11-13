import { Context } from "grammy";
import type { BotScenario } from "./scenario";

export interface BotUser {
  user_id: number;
  first_name?: string;
  last_name?: string;
  username?: string;
  language?: string;
  telegram_json?: string;
  platform_username?: string;
  is_blocked?: number | boolean;
  rate_limit_json?: string;
  /** Останній ключ сценарію, який бачила людина. */
  active_scenario?: string | null;
  /** Останнє повідомлення бота — його замінює наступний екран. */
  message_id?: number;
  my_dates?: string;
  inviter_id?: number | null;
  admin_dialog_open?: number | null;
  admin_dialog_text?: string | null;
  admin_dialog_count?: number | null;
  admin_panel_id?: number | null;
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
  CLOUDINARY_CLOUD_NAME: string;
  /** Публічна база Mini App; без неї бот не додає web_app-кнопок. */
  WEB_PLATFORM_URL?: string;
  ADMIN_TELEGRAM_ID?: string;
  SENTRY_DSN?: string;
  CF_VERSION_METADATA?: { id?: string };
}

export type AppContext = Context & {
  env: Env;
  user?: BotUser;
  userDirty?: boolean;
  menuDirty?: boolean;
  /** Сценарій, який треба показати цим апдейтом. */
  scenario?: BotScenario;
  /**
   * Повідомлення людини зноситься **після** успішного показу екрана: видалити
   * раніше — значить зникнути, не показавши нічого.
   */
  dropIncomingAfterRender?: boolean;
  /** Роутер уже відповів на це оновлення: вхідне не вважаємо несподіваним. */
  screenHandled?: boolean;
  pickTarget?: string;
  pendingNotification?: { data: Record<string, unknown> };
};

export interface Settings {
  bot_active: number;
  group_admin: string;
  [key: string]: unknown;
}
