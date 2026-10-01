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
import { ADMIN_TELEGRAM_ID, handleContactFlow } from "./dialog";

const GUEST = 555;

/** Одне надіслане повідомлення: чат, текст і підписи клавіатури. */
export interface Sent {
  chat: number;
  text: string;
  labels: string[];
}

export interface Store {
  ctx: AppContext;
  sent: Sent[];
  inserted: string[];
  texts: () => string[];
  labelsOfLast: () => string[];
  adminTexts: () => string[];
}

/**
 * Чат людини без допуску: база відповідає на все, Telegram записує все, що
 * бот відправив. `saveFails` імітує недоступну базу в момент відправки.
 */
export function chat(options: { open?: boolean; draft?: string; saveFails?: boolean } = {}): Store {
  const sent: Sent[] = [];
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
      extra?: { reply_markup?: { keyboard?: { text: string }[][] } },
    ) => {
      const keyboard = extra?.reply_markup?.keyboard ?? [];
      sent.push({ chat: chatId, text, labels: (keyboard[0] ?? []).map((b) => b.text) });
      return { message_id: 1 };
    },
    deleteMessage: async () => true,
  };

  const ctx = {
    env: { DB: db },
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
    },
  } as unknown as AppContext;

  const toAdmin = () => sent.filter((s) => s.chat === ADMIN_TELEGRAM_ID).map((s) => s.text);

  return {
    ctx,
    sent,
    inserted,
    texts: () => sent.map((s) => s.text),
    labelsOfLast: () => sent[sent.length - 1]?.labels ?? [],
    adminTexts: toAdmin,
  };
}

/** Крок людини: надісланий текст або (`undefined`) фото/файл/стікер. */
export async function step(store: Store, payload: string | undefined): Promise<boolean> {
  (store.ctx as unknown as { message: unknown }).message = { message_id: 1, text: payload };
  return handleContactFlow(store.ctx);
}
