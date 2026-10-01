/**
 * Екран відмови — тести.
 *
 * **Тут ловиться те, що ламається мовчки:** старий екран, який не видалився
 * (клавіатура геть, але текст лишився), і виклик `deleteMessages` не з тими
 * аргументами — grammY приймає їх позиційно, і помилка ковтається, тож про
 * неї ніхто не дізнається.
 *
 * @module bot-dev/src/modules/access/denied.test
 */

import { describe, expect, it } from "vitest";
import type { AppContext } from "../../shared/types/env";
import { showAccessDenied } from "./denied";

interface Call {
  chatId: number;
  text: string;
  labels: string[];
}

/** Чат із одним старим екраном бота (`message_id`) і кнопкою від нього. */
function chat(
  options: { screenId?: number; callbackScreenId?: number; dialogOpen?: boolean } = {},
) {
  const sent: Call[] = [];
  const deleted: { chatId: unknown; ids: unknown }[] = [];

  const api = {
    sendMessage: async (
      chatId: number,
      text: string,
      extra?: {
        reply_markup?: {
          inline_keyboard?: { text: string; callback_data: string }[][];
          keyboard?: { text: string }[][];
        };
      },
    ) => {
      const markup = extra?.reply_markup;
      sent.push({
        chatId,
        text,
        labels: (markup?.inline_keyboard?.flat() ?? markup?.keyboard?.flat() ?? []).map(
          (b) => b.text,
        ),
      });
      return { message_id: 999 };
    },
    deleteMessages: async (chatId: number, messageIds: number[]) => {
      deleted.push({ chatId, ids: messageIds });
      return true;
    },
  };

  const ctx = {
    api,
    chat: { id: 42 },
    from: { id: 42 },
    user: {
      user_id: 42,
      message_id: options.screenId,
      admin_dialog_open: options.dialogOpen ? 1 : 0,
      admin_dialog_text: "",
    },
    callbackQuery: options.callbackScreenId
      ? { data: "mydate_1980-03-03", message: { message_id: options.callbackScreenId } }
      : undefined,
  } as unknown as AppContext;

  return { ctx, sent, deleted };
}

describe("екран відмови", () => {
  it("кнопка «Написати адміну» — на повідомленні, а не тільки під чатом", async () => {
    const store = chat();

    await showAccessDenied(store.ctx);

    // Реплай-клавіатура не малюється в кожному клієнті, inline — завжди.
    expect(store.sent[0]?.labels).toEqual(["Написати адміну"]);
    expect(store.sent[0]?.text).toContain("Зв'язок з Адміном");
  });

  it("⛔ старий екран зноситься — і grammY отримує позиційні аргументи", async () => {
    // Об'єкт замість позиційних аргументів ішов у запит як `chat_id`, Telegram
    // відповідав 400, помилка ковталась — і екрани копилися в чаті.
    const store = chat({ screenId: 7, callbackScreenId: 8 });

    await showAccessDenied(store.ctx);

    expect(store.deleted).toEqual([{ chatId: 42, ids: [7, 8] }]);
  });

  it("⛔ номера дублюються в один виклик: видалення двох — це один запит", async () => {
    const store = chat({ screenId: 7, callbackScreenId: 7 });

    await showAccessDenied(store.ctx);

    expect(store.deleted[0]?.ids).toEqual([7]);
  });

  it("⛔ відкритий дialog не ховає кнопку відмови: написане лишається в панелі", async () => {
    // `/start` посеред написаного показує відмову знову — і кнопка «Написати
    // адміну» мусить лишатися: панель із чернеткою про неї не знає.
    const store = chat({ dialogOpen: true });

    await showAccessDenied(store.ctx);

    expect(store.sent[0]?.labels).toEqual(["Написати адміну"]);
  });

  it("новий екран запам'ятовується як поточний", async () => {
    const store = chat();

    await showAccessDenied(store.ctx);

    expect(store.ctx.user?.message_id).toBe(999);
    expect(store.ctx.userDirty).toBe(true);
  });
});
