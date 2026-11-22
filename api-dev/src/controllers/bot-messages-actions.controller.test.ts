/**
 * Контракт `/api/admin/users/:id/messages/:mid`: що саме й у якому порядку
 * перевіряється до підписаного виклику бота.
 *
 * Найважливіше тут — відмови: чужі повідомлення не редагуються, старші за
 * 48 годин не чіпаються взагалі, а відмова Telegram доходить до адміна
 * поясненням, а не «щось пішло не так».
 */

import { afterEach, describe, expect, it, vi } from "vitest";
import type { Env } from "../shared/types";
import { handleDeleteUserMessage, handleEditUserMessage } from "./bot-messages-actions.controller";

const channel = vi.hoisted(() => ({ callBotChannel: vi.fn() }));
vi.mock("../services/bot-channel.service", () => ({
  callBotChannel: channel.callBotChannel,
}));

interface Row {
  id: number;
  direction: string;
  message_id: number;
  kind: string;
  text: string;
  created_at: string;
  deleted_at: string | null;
}

function row(overrides: Partial<Row> = {}): Row {
  return {
    id: 1,
    direction: "out",
    message_id: 100,
    kind: "text",
    text: "старе",
    created_at: "2026-11-22 10:00:00",
    deleted_at: null,
    ...overrides,
  };
}

function env(target: Row | null): Env {
  const statement = { bind: () => statement, first: async () => target };
  return { DB: { prepare: () => statement } } as unknown as Env;
}

function editRequest(text: unknown): Request {
  return new Request("https://api.test/api/admin/users/7/messages/100", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text }),
  });
}

function deleteRequest(): Request {
  return new Request("https://api.test/api/admin/users/7/messages/100", { method: "DELETE" });
}

afterEach(() => vi.clearAllMocks());

describe("handleEditUserMessage", () => {
  it("передає боту новий текст і формат rich для rich-повідомлення", async () => {
    channel.callBotChannel.mockResolvedValue({ ok: true, status: 200, message: { text: "нове" } });
    const response = await handleEditUserMessage(
      editRequest("нове"),
      env(row({ kind: "rich" })),
      7,
      100,
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true, message: { text: "нове" } });
    expect(channel.callBotChannel).toHaveBeenCalledWith(expect.anything(), {
      action: "edit",
      chatId: 7,
      messageId: 100,
      text: "нове",
      format: "rich",
    });
  });

  it("чуже повідомлення, старе й уже видалене — різні відмови без бота", async () => {
    const incoming = await handleEditUserMessage(
      editRequest("нове"),
      env(row({ direction: "in" })),
      7,
      100,
    );
    expect(incoming.status).toBe(400);

    const old = await handleEditUserMessage(
      editRequest("нове"),
      env(row({ created_at: "2020-01-01 00:00:00" })),
      7,
      100,
    );
    expect(old.status).toBe(409);
    expect(((await old.json()) as { error: string }).error).toContain("48");

    const deleted = await handleEditUserMessage(
      editRequest("нове"),
      env(row({ deleted_at: "2026-11-22 11:00:00" })),
      7,
      100,
    );
    expect(deleted.status).toBe(409);
    expect(channel.callBotChannel).not.toHaveBeenCalled();
  });

  it("порожній текст і невідомий рядок не доходять до бота", async () => {
    const empty = await handleEditUserMessage(editRequest("   "), env(row()), 7, 100);
    expect(empty.status).toBe(400);

    const missing = await handleEditUserMessage(editRequest("нове"), env(null), 7, 100);
    expect(missing.status).toBe(404);
    expect(channel.callBotChannel).not.toHaveBeenCalled();
  });

  it("відмову Telegram повертає текстом із кодом", async () => {
    channel.callBotChannel.mockResolvedValue({
      ok: false,
      status: 409,
      error: "telegram_refused",
      description: "message can't be edited",
    });
    const response = await handleEditUserMessage(editRequest("нове"), env(row()), 7, 100);

    expect(response.status).toBe(409);
    const body = (await response.json()) as { code: string; error: string };
    expect(body.code).toBe("telegram_refused");
    expect(body.error).toContain("message can't be edited");
  });
});

describe("handleDeleteUserMessage", () => {
  it("видаляє будь-чиє повідомлення", async () => {
    channel.callBotChannel.mockResolvedValue({
      ok: true,
      status: 200,
      message: { deleted_at: "2026-11-22 12:00:00" },
    });
    const response = await handleDeleteUserMessage(
      deleteRequest(),
      env(row({ direction: "in" })),
      7,
      100,
    );

    expect(response.status).toBe(200);
    expect(channel.callBotChannel).toHaveBeenCalledWith(expect.anything(), {
      action: "delete",
      chatId: 7,
      messageId: 100,
    });
  });

  it("старше 48 годин відмовляє поясненням, не турбуючи бота", async () => {
    const response = await handleDeleteUserMessage(
      deleteRequest(),
      env(row({ created_at: "2020-01-01 00:00:00" })),
      7,
      100,
    );

    expect(response.status).toBe(409);
    expect(((await response.json()) as { error: string }).error).toContain("48");
    expect(channel.callBotChannel).not.toHaveBeenCalled();
  });

  it("відсутній канал і невідомий рядок — чесні 503/404", async () => {
    channel.callBotChannel.mockResolvedValue({ ok: false, status: 503, error: "channel_missing" });
    const noChannel = await handleDeleteUserMessage(deleteRequest(), env(row()), 7, 100);
    expect(noChannel.status).toBe(503);

    channel.callBotChannel.mockClear();
    const missing = await handleDeleteUserMessage(deleteRequest(), env(null), 7, 100);
    expect(missing.status).toBe(404);
    expect(channel.callBotChannel).not.toHaveBeenCalled();
  });
});
