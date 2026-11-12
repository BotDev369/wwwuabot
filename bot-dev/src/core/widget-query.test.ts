/**
 * Тап у віджеті: відповідь на запит, пошук за `data`, відмова без допуску.
 *
 * @module bot-dev/src/core/widget-query.test
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Env } from "../shared/types/env";

const mocks = vi.hoisted(() => ({
  find: vi.fn(),
  user: vi.fn(),
  update: vi.fn(),
  save: vi.fn(),
  access: vi.fn(),
  widget: vi.fn(),
  rich: vi.fn(),
  answer: vi.fn(),
}));

vi.mock("../repositories/scenario.repository", () => ({
  ScenarioRepository: class {
    findByLookup = mocks.find;
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
  sendRichMessage: mocks.rich,
  answerWidgetQuery: mocks.answer,
}));

const { handleWidgetQuery } = await import("./widget-query");

const env = { BOT_TOKEN: "token", ADMIN_TELEGRAM_ID: "1" } as Env;

beforeEach(() => {
  vi.clearAllMocks();
  mocks.answer.mockResolvedValue(true);
  mocks.access.mockReturnValue(true);
  mocks.user.mockResolvedValue({ user_id: 7, message_id: 3 });
  mocks.find.mockResolvedValue({
    lookup: "about",
    kind: "widget",
    widget_html: "<b>x</b>",
    widget_data: "{}",
    caption: null,
    rich_html: null,
  });
  mocks.widget.mockResolvedValue({ message_id: 9, widget: { id: "w" } });
  mocks.rich.mockResolvedValue({ message_id: 9 });
  vi.stubGlobal("fetch", async () => new Response("{}", { status: 200 }));
});

describe("handleWidgetQuery", () => {
  it("відповідає й показує віджет за ключем", async () => {
    await handleWidgetQuery(env, {
      id: "q1",
      from: { id: 7 },
      data: "about",
      chat: { id: 7, type: "private" },
    });

    expect(mocks.answer).toHaveBeenCalledWith("token", "q1");
    expect(mocks.find).toHaveBeenCalledWith("about");
    expect(mocks.widget).toHaveBeenCalled();
    expect(mocks.update).toHaveBeenCalledWith(7, { message_id: 9 });
    expect(mocks.save).toHaveBeenCalledWith(7, 9, "w", "about", "{}");
  });

  it("без допуску показує rich-відмову", async () => {
    mocks.access.mockReturnValue(false);
    await handleWidgetQuery(env, { id: "q2", from: { id: 7 }, data: "about", chat: { id: 7 } });

    expect(mocks.rich).toHaveBeenCalledWith("token", 7, expect.stringContaining("за запрошеннями"));
    expect(mocks.find).not.toHaveBeenCalled();
  });

  it("невідомий ключ — лише відповідь", async () => {
    mocks.find.mockResolvedValue(null);
    await handleWidgetQuery(env, { id: "q3", from: { id: 7 }, data: "nope", chat: { id: 7 } });

    expect(mocks.widget).not.toHaveBeenCalled();
  });

  it("без data нічого не шукає", async () => {
    await handleWidgetQuery(env, { id: "q4", from: { id: 7 }, chat: { id: 7 } });
    expect(mocks.find).not.toHaveBeenCalled();
  });
});
