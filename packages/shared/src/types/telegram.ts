export interface TelegramWebAppUser {
  id: number;
  is_bot?: boolean;
  first_name: string;
  last_name?: string;
  username?: string;
  language_code?: string;
  photo_url?: string;
  is_premium?: boolean;
  added_to_attachment_menu?: boolean;
}

/**
 * Кольори, які Telegram приймає на `setHeaderColor` / `setBackgroundColor` /
 * `setBottomBarColor`: лише плоскі `#rrggbb` — градієнти клієнт мовчки відхиляє.
 */
export type TelegramChromeColor = `#${string}`;

export interface TelegramWebApp {
  initData?: string;
  initDataUnsafe?: {
    query_id?: string;
    user?: TelegramWebAppUser;
    auth_date?: string;
    hash?: string;
  };
  close?: () => void;
  expand?: () => void;
  /** Mini App готовий — приховує сплеш Telegram (Bot API 6.1+). */
  ready?: () => void;
  /** Колір нативної шапки над Mini App (Bot API 6.1+). */
  setHeaderColor?: (color: TelegramChromeColor) => void;
  /** Колір фону Mini App (Bot API 6.1+). */
  setBackgroundColor?: (color: TelegramChromeColor) => void;
  /** Колір смуги під Mini App (Bot API 7.10+) — те саме місце, що й наш нижній футер. */
  setBottomBarColor?: (color: TelegramChromeColor) => void;
  /** Підписка на події клієнта — використовує `shared/app/telegram-chrome.ts`. */
  onEvent?: (event: string, handler: () => void) => void;
  offEvent?: (event: string, handler: () => void) => void;
}

declare global {
  interface Window {
    Telegram?: {
      WebApp?: TelegramWebApp;
    };
  }
}

export interface TelegramApiResponse<T = unknown> {
  ok: boolean;
  result?: T;
  description?: string;
  error_code?: number;
}

export interface TelegramUser {
  id: number;
  is_bot: boolean;
  first_name: string;
  last_name?: string;
  username?: string;
  language_code?: string;
}

export interface TelegramWebhookInfo {
  url: string;
  has_custom_certificate: boolean;
  pending_update_count: number;
  last_error_date?: number;
  last_error_message?: string;
  max_connections?: number;
  ip_address?: string;
}

export interface TelegramInlineKeyboardButton {
  text: string;
  callback_data?: string;
  url?: string;
  web_app?: { url: string };
}
