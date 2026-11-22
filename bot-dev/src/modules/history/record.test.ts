/**
 * Запис переписки: вид повідомлення, напрямок і те, що помилка запису не
 * ламає відповідь.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AppContext } from "../../shared/types/env";
import { recordIncomingMessage, recordOutgoingMessage } from "./record";

const recordMock = vi.hoisted(() => vi.fn(async (_db: unknown, _input: { kind?: string }) => {}));
vi.mock("@wwwuabot/shared/database/bot-messages", () => ({ recordBotMessage: recordMock }));

function context(message: Record<string, unknown> | undefined, chatType = "private"): AppContext {
  return {
    message,
    from: { id: 7, is_bot: false, first_name: "Тест" },
    chat: { id: 7, type: chatType },
    env: { DB: {} },
  } as unknown as AppContext;
}

describe("recordIncomingMessage", () => {
  beforeEach(() => recordMock.mockClear());

  it("пише текст людини вхідним рядком", async () => {
    await recordIncomingMessage(context({ message_id: 5, text: "ромашка" }));

    expect(recordMock).toHaveBeenCalledWith(expect.anything(), {
      userId: 7,
      chatId: 7,
      direction: "in",
      messageId: 5,
      kind: "text",
      text: "ромашка",
    });
  });

  it("розрізняє команду, фото, стікер і вкладення", async () => {
    await recordIncomingMessage(context({ message_id: 1, text: "/start" }));
    await recordIncomingMessage(context({ message_id: 2, photo: [{}] }));
    await recordIncomingMessage(context({ message_id: 3, sticker: {} }));
    await recordIncomingMessage(context({ message_id: 4, document: {} }));

    expect(recordMock.mock.calls.map((call) => call[1].kind)).toEqual([
      "command",
      "photo",
      "sticker",
      "other",
    ]);
  });

  it("не пише в групах і без повідомлення", async () => {
    await recordIncomingMessage(context({ message_id: 1, text: "привіт" }, "supergroup"));
    await recordIncomingMessage(context(undefined));
    expect(recordMock).not.toHaveBeenCalled();
  });

  it("помилка запису не вилітає з обробника", async () => {
    recordMock.mockRejectedValueOnce(new Error("D1 down"));
    await expect(
      recordIncomingMessage(context({ message_id: 1, text: "привіт" })),
    ).resolves.toBeUndefined();
  });
});

describe("recordOutgoingMessage", () => {
  beforeEach(() => recordMock.mockClear());

  it("пише відповідь бота вихідним рядком", async () => {
    await recordOutgoingMessage(
      context({ message_id: 9, text: "питання" }),
      11,
      "rich",
      "<h1>Екран</h1>",
      {
        query: "ромашка",
      },
    );

    expect(recordMock).toHaveBeenCalledWith(expect.anything(), {
      userId: 7,
      chatId: 7,
      direction: "out",
      messageId: 11,
      kind: "rich",
      text: "<h1>Екран</h1>",
      meta: { query: "ромашка" },
    });
  });
});
