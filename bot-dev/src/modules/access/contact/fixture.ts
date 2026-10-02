/**
 * Фікстур діалогу з адміном для тестів.
 *
 * Живий `AppContext` — це Telegram, D1 і користувач разом; тест має право
 * знати лише те, що цікавить: що бот написав у чат людини, що в чат адміна,
 * що зберіглося в базу і в якому стані діалог.
 *
 * @module bot-dev/src/modules/access/contact/fixture
 */

import type { AppContext } from "../../../shared/types/env";
import { handleContactCallback } from "./panel";
import { handleContactFlow } from "./reply";

const GUEST = 555;
/** Власник у тесті — те саме значення, що живе в секреті `ADMIN_TELEGRAM_ID`. */
const OWNER = 372567448;

/** Одне надіслане повідомлення: чат, текст і підписи клавіатури. */
export interface Sent {
  chat: number;
  text: string;
  labels: string[];
}

export interface Store {
  ctx: AppContext;
  sent: Sent[];
  edited: Sent[];
  inserted: string[];
  texts: () => string[];
  labelsOfLast: () => string[];
  adminTexts: () => string[];
}

/**
 * Чат людини без допуску: база відповідає на все, Telegram записує все, що
 * бот відправив. `saveFails` імітує недоступну базу в момент відправки.
 */
export function chat(
  options: { open?: boolean; draft?: string; panelId?: number; saveFails?: boolean } = {},
): Store {
  const sent: Sent[] = [];
  const edited: Sent[] = [];
  const inserted: string[] = [];

  const db = {
    prepare: (sql: string) => {
      const statement = {
        bind: (...values: unknown[]) => {
          if (/^INSERT INTO access_requests/.test(sql.trim())) inserted.push(String(values[1]));
          return statement;
        },
        all: async () => ({ results: [] }),
        run: async () => {
          if (options.saveFails) throw new Error("D1 недоступна");
          return { meta: { changes: 1 } };
        },
      };
      return statement;
    },
  };

  const api = {
    sendMessage: async (
      chatId: number,
      text: string,
      extra?: {
        reply_markup?: { keyboard?: { text: string }[][]; inline_keyboard?: { text: string }[][] };
      },
    ) => {
      const markup = extra?.reply_markup;
      // Кнопки бувають і під чатом, і на повідомленні — тестуємо обидва.
      const labels = (markup?.keyboard?.[0] ?? markup?.inline_keyboard?.flat() ?? []).map(
        (b) => b.text,
      );
      sent.push({ chat: chatId, text, labels });
      return { message_id: 1 };
    },
    deleteMessage: async () => true,
    editMessageText: async (
      chatId: number,
      _messageId: number,
      text: string,
      extra?: { reply_markup?: { inline_keyboard?: { text: string }[][] } },
    ) => {
      const rows = extra?.reply_markup?.inline_keyboard ?? [];
      edited.push({ chat: chatId, text, labels: rows.flat().map((b) => b.text) });
      return true;
    },
  };

  const ctx = {
    env: { DB: db, ADMIN_TELEGRAM_ID: String(OWNER) },
    api,
    chat: { id: GUEST },
    from: { id: GUEST },
    message: { message_id: 1 },
    user: {
      user_id: GUEST,
      first_name: "Оля",
      username: "olya",
      admin_dialog_open: options.open ? 1 : 0,
      admin_dialog_text: options.draft ?? "",
      admin_panel_id: options.panelId ?? null,
    },
  } as unknown as AppContext;

  const toAdmin = () => sent.filter((s) => s.chat === OWNER).map((s) => s.text);

  return {
    ctx,
    sent,
    edited,
    inserted,
    texts: () => sent.map((s) => s.text),
    labelsOfLast: () => sent[sent.length - 1]?.labels ?? [],
    adminTexts: toAdmin,
  };
}

/** Натискання inline-кнопки: `callback_data` приходить у `callback_query`. */
export async function tap(store: Store, data: string): Promise<boolean> {
  (store.ctx as unknown as { callbackQuery: unknown }).callbackQuery = { data };
  return handleContactCallback(store.ctx);
}

/** Крок людини: надісланий текст або (`undefined`) фото/файл/стікер. */
export async function step(store: Store, payload: string | undefined): Promise<boolean> {
  (store.ctx as unknown as { message: unknown }).message = { message_id: 1, text: payload };
  return handleContactFlow(store.ctx);
}
