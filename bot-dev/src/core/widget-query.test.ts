/**
 * Тап у віджеті: перемикання виду через `editMessageWidgetData`, надсилання
 * документа, коли повідомлення вже немає, і відмова без допуску.
 *
 * @module bot-dev/src/core/widget-query.test
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Env } from "../shared/types/env";

const mocks = vi.hoisted(() => ({
  find: vi.fn(),
  state: vi.fn(),
  save: vi.fn(),
  user: vi.fn(),
  update: vi.fn(),
  access: vi.fn(),
  widget: vi.fn(),
  edit: vi.fn(),
  answer: vi.fn(),
}));

vi.mock("../repositories/scenario.repository", () => ({
  ScenarioRepository: class {
    findByLookup = mocks.find;
    getMessageState = mocks.state;
    saveMessageState = mocks.save;
  },
}));
vi.mock("../modules/users/user.repository", () => ({
  UserRepository: class {
    getUser = mocks.user;
    updateUser = mocks.update;
  },
}));
vi.mock("@wwwuabot/shared/security/access", () => ({ hasAccess: mocks.access }));
vi.mock("../shared/telegram/widgets", () => ({
  sendWidget: mocks.widget,
  answerWidgetQuery: mocks.answer,
  editMessageWidgetData: mocks.edit,
}));

const { handleWidgetQuery } = await import("./widget-query");

const env = { BOT_TOKEN: "token", ADMIN_TELEGRAM_ID: "1" } as Env;

const APP = { lookup: "/start", kind: "widget", widget_html: "<b>app</b>", widget_data: null };

beforeEach(() => {
  vi.clearAllMocks();
  mocks.answer.mockResolvedValue(true);
  mocks.access.mockReturnValue(true);
  mocks.user.mockResolvedValue({ user_id: 7, message_id: 3 });
  mocks.update.mockResolvedValue(undefined);
  mocks.find.mockResolvedValue(APP);
  mocks.state.mockResolvedValue({
    message_id: 9,
    widget_id: "w",
    lookup: "/start",
    chat_data: '{"v":"start"}',
  });
  mocks.widget.mockResolvedValue({ message_id: 11, widget: { id: "w" } });
  mocks.edit.mockResolvedValue(true);
  vi.stubGlobal("fetch", async () => new Response("{}", { status: 200 }));
});

describe("handleWidgetQuery", () => {
  it("перемикає вид наявного віджета без нових повідомлень", async () => {
    await handleWidgetQuery(env, {
      id: "q1",
      from: { id: 7 },
      data: "about",
      chat: { id: 7, type: "private" },
    });

    expect(mocks.answer).toHaveBeenCalledWith("token", "q1");
    expect(mocks.edit).toHaveBeenCalledWith("token", 7, 9, '{"v":"about"}');
    expect(mocks.widget).not.toHaveBeenCalled();
    expect(mocks.save).toHaveBeenCalledWith(7, 9, "w", "/start", '{"v":"about"}');
  });

  it("без повідомлення в чаті надсилає документ із потрібним видом", async () => {
    mocks.state.mockResolvedValue(null);

    await handleWidgetQuery(env, {
      id: "q2",
      from: { id: 7 },
      data: "contacts",
      chat: { id: 7, type: "private" },
    });

    expect(mocks.widget).toHaveBeenCalledWith(
      "token",
      expect.objectContaining({ chatId: 7, chatData: '{"v":"contacts"}' }),
    );
    expect(mocks.edit).not.toHaveBeenCalled();
    expect(mocks.save).toHaveBeenCalledWith(7, 11, "w", "/start", '{"v":"contacts"}');
  });

  it("якщо правку стану відхилено — надсилає документ", async () => {
    mocks.edit.mockRejectedValue(new Error("message to edit not found"));

    await handleWidgetQuery(env, {
      id: "q3",
      from: { id: 7 },
      data: "about",
      chat: { id: 7, type: "private" },
    });

    expect(mocks.widget).toHaveBeenCalled();
  });

  it("окремий сценарій за ключем надсилається як екран", async () => {
    mocks.find.mockImplementation(async (lookup: string) =>
      lookup === "secret" ? { ...APP, lookup: "secret", widget_data: '{"a":1}' } : APP,
    );

    await handleWidgetQuery(env, {
      id: "q4",
      from: { id: 7 },
      data: "secret",
      chat: { id: 7, type: "private" },
    });

    expect(mocks.widget).toHaveBeenCalledWith(
      "token",
      expect.objectContaining({ html: "<b>app</b>", chatData: '{"a":1}' }),
    );
  });

  it("без допуску показує віджет-відмову", async () => {
    mocks.access.mockReturnValue(false);
    await handleWidgetQuery(env, { id: "q5", from: { id: 7 }, data: "about", chat: { id: 7 } });

    expect(mocks.widget).toHaveBeenCalledWith(
      "token",
      expect.objectContaining({ chatId: 7, html: expect.stringContaining("запрошеннями") }),
    );
    expect(mocks.find).not.toHaveBeenCalled();
  });

  it("невідомий ключ — лише відповідь", async () => {
    mocks.find.mockResolvedValue(null);
    await handleWidgetQuery(env, { id: "q6", from: { id: 7 }, data: "nope", chat: { id: 7 } });

    expect(mocks.widget).not.toHaveBeenCalled();
  });

  it("без data нічого не шукає", async () => {
    await handleWidgetQuery(env, { id: "q7", from: { id: 7 }, chat: { id: 7 } });
    expect(mocks.find).not.toHaveBeenCalled();
  });
});
