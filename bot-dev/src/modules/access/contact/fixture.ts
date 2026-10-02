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
/** Номер повідомлення людини: на нього бот відповідає, тож він має бути видимий. */
const GUEST_MESSAGE = 77;
/** Власник у тесті — те саме значення, що живе в секреті `ADMIN_TELEGRAM_ID`. */
const OWNER = 372567448;

/** Одне надіслане повідомлення: чат, текст, підписи кнопок і відповідь на що. */
export interface Sent {
  chat: number;
  text: string;
  labels: string[];
  /** Номер повідомлення людини, на яке це повідомлення — відповідь. */
  replyTo?: number;
}

export interface Store {
  ctx: AppContext;
  sent: Sent[];
  /** Статусні екрани, які бот зніс перед новим (число — ідентифікатор). */
  cleared: number[];
  /** Повідомлення, з яких зняли кнопки, але не змогли видалити. */
  detached: number[];
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
  options: {
    open?: boolean;
    draft?: string;
    count?: number;
    panelId?: number;
    screenId?: number;
    /** Старий екран не дається видалити — бот має зняти з нього кнопки. */
    undeletableScreen?: boolean;
    saveFails?: boolean;
  } = {},
): Store {
  const sent: Sent[] = [];
  const cleared: number[] = [];
  const detached: number[] = [];
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

  // Старий статусний екран не завжди можна видалити (48 годин, чужі
  // повідомлення) — тоді бот має принаймні зняти кнопки, а `deleteMessage`
  // падає саме тут.
  const undeletable = options.undeletableScreen === true;

  const api = {
    sendMessage: async (
      chatId: number,
      text: string,
      extra?: {
        reply_markup?: { inline_keyboard?: { text: string }[][] };
        reply_parameters?: { message_id: number };
      },
    ) => {
      const rows = extra?.reply_markup?.inline_keyboard ?? [];
      sent.push({
        chat: chatId,
        text,
        labels: rows.flat().map((b) => b.text),
        replyTo: extra?.reply_parameters?.message_id,
      });
      return { message_id: sent.length };
    },
    deleteMessage: async (_chatId: number, messageId: number) => {
      if (undeletable) throw new Error("message can not be deleted");
      cleared.push(messageId);
      return true;
    },
    editMessageReplyMarkup: async (_chatId: number, messageId: number) => {
      detached.push(messageId);
      return true;
    },
  };

  const ctx = {
    env: { DB: db, ADMIN_TELEGRAM_ID: String(OWNER) },
    api,
    chat: { id: GUEST },
    from: { id: GUEST },
    message: { message_id: GUEST_MESSAGE },
    user: {
      user_id: GUEST,
      first_name: "Оля",
      username: "olya",
      admin_dialog_open: options.open ? 1 : 0,
      admin_dialog_text: options.draft ?? "",
      admin_dialog_count: options.count ?? (options.draft ? 1 : 0),
      admin_panel_id: options.panelId ?? null,
      message_id: options.screenId ?? null,
    },
  } as unknown as AppContext;

  const toAdmin = () => sent.filter((s) => s.chat === OWNER).map((s) => s.text);

  return {
    ctx,
    sent,
    cleared,
    detached,
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
  (store.ctx as unknown as { message: unknown }).message = {
    message_id: GUEST_MESSAGE,
    text: payload,
  };
  return handleContactFlow(store.ctx);
}
