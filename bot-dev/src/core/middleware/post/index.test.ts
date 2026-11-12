/**
 * Пост-обробка апдейта: рендер сценарію, нотифікації, збереження людини.
 *
 * @module bot-dev/src/core/middleware/post/index.test
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AppContext } from "../../../shared/types/env";

const mocks = vi.hoisted(() => ({
  router: vi.fn(),
  render: vi.fn(),
  deleteIncoming: vi.fn(),
  dispatch: vi.fn(),
  updateUser: vi.fn(),
}));

vi.mock("../../router/bot-router", () => ({ botRouter: mocks.router }));
vi.mock("../../../shared/utils/scenario-screen", () => ({ renderScenario: mocks.render }));
vi.mock("../../../shared/utils/message", () => ({
  deleteIncomingMessage: mocks.deleteIncoming,
}));
vi.mock("../../../modules/notifications/dispatcher", () => ({
  dispatchNotification: mocks.dispatch,
}));
vi.mock("../../../modules/users/user.repository", () => ({
  UserRepository: class {
    updateUser = mocks.updateUser;
  },
}));

const { postMiddleware } = await import("./index");

function context(overrides: Record<string, unknown> = {}): AppContext {
  return {
    env: {},
    from: { id: 7 },
    user: { user_id: 7 },
    ...overrides,
  } as unknown as AppContext;
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.render.mockResolvedValue(true);
});

describe("postMiddleware", () => {
  it("рендерить сценарій і зносить повідомлення", async () => {
    const scenario = { lookup: "/start", kind: "widget" };
    const ctx = context({ scenario });

    await postMiddleware(ctx, async () => undefined);

    expect(mocks.router).toHaveBeenCalled();
    expect(mocks.render).toHaveBeenCalledWith(ctx, scenario);
    expect(mocks.deleteIncoming).toHaveBeenCalledWith(ctx);
  });

  it("без сценарію рендера немає", async () => {
    await postMiddleware(context(), async () => undefined);
    expect(mocks.render).not.toHaveBeenCalled();
  });

  it("неочікуване в приваті зносить", async () => {
    const ctx = context({
      chat: { id: 7, type: "private" },
      message: { message_id: 4, text: "привіт" },
    });
    await postMiddleware(ctx, async () => undefined);

    expect(mocks.deleteIncoming).toHaveBeenCalledWith(ctx);
  });

  it("у групі чужі повідомлення лишаються", async () => {
    const ctx = context({
      chat: { id: -5, type: "supergroup" },
      message: { message_id: 4, text: "привіт" },
    });
    await postMiddleware(ctx, async () => undefined);

    expect(mocks.deleteIncoming).not.toHaveBeenCalled();
  });

  it("нотифікації йдуть, коли сценарій їх налаштував", async () => {
    const scenario = { notify_groups: "main", notify_template: "${user_name}" };
    await postMiddleware(
      context({ scenario, pendingNotification: { data: { a: 1 } } }),
      async () => undefined,
    );

    expect(mocks.dispatch).toHaveBeenCalledWith(expect.anything(), { a: 1 });
  });

  it("зміненого користувача зберігає", async () => {
    const ctx = context({ userDirty: true });
    await postMiddleware(ctx, async () => undefined);

    expect(mocks.updateUser).toHaveBeenCalledWith(7, expect.any(Object));
  });
});
