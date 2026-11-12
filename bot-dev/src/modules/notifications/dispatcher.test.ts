/**
 * Нотифікації: без сценарію — тихо, з налаштуванням — у кожну групу, на помилці —
 * звіт адміну.
 *
 * @module bot-dev/src/modules/notifications/dispatcher.test
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AppContext } from "../../shared/types/env";

const mocks = vi.hoisted(() => ({
  chatId: vi.fn(),
  topic: vi.fn(),
  send: vi.fn(),
  render: vi.fn(),
}));

vi.mock("./topic-manager", () => ({ getOrCreateTopic: mocks.topic }));
vi.mock("./sender", () => ({ sendNotification: mocks.send }));
vi.mock("./template-engine", () => ({
  buildTemplateContext: () => ({}),
  renderTemplate: mocks.render,
}));
vi.mock("../../repositories/settings.repository", () => ({
  SettingsRepository: class {
    getChatId = mocks.chatId;
  },
}));

const { dispatchNotification } = await import("./dispatcher");

function context(scenario?: Record<string, unknown>): AppContext {
  return { env: {}, from: { id: 7 }, scenario } as unknown as AppContext;
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.chatId.mockResolvedValue("-100");
  mocks.topic.mockResolvedValue(5);
  mocks.send.mockResolvedValue(true);
  mocks.render.mockReturnValue("текст");
});

describe("dispatchNotification", () => {
  it("без сценарію нічого не шле", async () => {
    await dispatchNotification(context(), {});
    expect(mocks.send).not.toHaveBeenCalled();
  });

  it("без груп і шаблону нічого не шле", async () => {
    await dispatchNotification(context({ lookup: "/start" }), {});
    expect(mocks.send).not.toHaveBeenCalled();
  });

  it("шле в кожну групу з топіком", async () => {
    await dispatchNotification(
      context({ lookup: "order", notify_groups: "main, shop", notify_template: "t" }),
      {},
    );

    expect(mocks.chatId).toHaveBeenCalledTimes(2);
    expect(mocks.send).toHaveBeenCalledTimes(2);
    expect(mocks.send).toHaveBeenCalledWith(expect.anything(), "-100", "текст", 5);
  });

  it("⛔ збій групи — звіт адміну", async () => {
    mocks.send.mockResolvedValueOnce(false).mockResolvedValue(true);

    await dispatchNotification(
      context({ lookup: "order", notify_groups: "main", notify_template: "t" }),
      {},
    );

    expect(mocks.chatId).toHaveBeenCalledWith("group_admin");
    expect(mocks.send).toHaveBeenLastCalledWith(
      expect.anything(),
      "-100",
      expect.stringContaining("Помилка нотифікації"),
      5,
    );
  });
});
