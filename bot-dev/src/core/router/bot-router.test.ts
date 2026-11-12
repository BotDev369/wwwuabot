/**
 * Роутер бота: `/start` і payload, callback як ключ, текст як ключ, відмова.
 *
 * @module bot-dev/src/core/router/bot-router.test
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AppContext } from "../../shared/types/env";

const mocks = vi.hoisted(() => ({
  find: vi.fn(),
  render: vi.fn(),
  hasAccess: vi.fn(),
  denied: vi.fn(),
  invite: vi.fn(),
  contactFlow: vi.fn(),
  contactCallback: vi.fn(),
  deleteIncoming: vi.fn(),
}));

vi.mock("../../repositories/scenario.repository", () => ({
  ScenarioRepository: class {
    findByLookup = mocks.find;
  },
}));
vi.mock("../../shared/utils/scenario-screen", () => ({ renderScenario: mocks.render }));
vi.mock("@wwwuabot/shared/security/access", () => ({ hasAccess: mocks.hasAccess }));
vi.mock("../../modules/access/denied", () => ({ showAccessDenied: mocks.denied }));
vi.mock("../../modules/contacts/invite-screen", () => ({ showInviteScreen: mocks.invite }));
vi.mock("../../modules/contacts/contact-link", () => ({
  applyContactPayload: vi.fn(async () => ({ kind: "unknown" })),
}));
vi.mock("../../modules/access/contact/reply", () => ({ handleContactFlow: mocks.contactFlow }));
vi.mock("../../modules/access/contact/panel", () => ({
  handleContactCallback: mocks.contactCallback,
}));
vi.mock("../../shared/utils/message", () => ({
  deleteIncomingMessage: mocks.deleteIncoming,
}));

const { botRouter } = await import("./bot-router");

const SCENARIO = { id: 1, lookup: "/start", kind: "widget" };

function context(overrides: Record<string, unknown> = {}): AppContext {
  return {
    env: { DB: {}, ADMIN_TELEGRAM_ID: "1" },
    user: { user_id: 7 },
    ...overrides,
  } as unknown as AppContext;
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.hasAccess.mockReturnValue(true);
  mocks.find.mockResolvedValue(SCENARIO);
  mocks.render.mockResolvedValue(true);
  mocks.invite.mockResolvedValue(true);
  mocks.denied.mockResolvedValue(true);
  mocks.contactFlow.mockResolvedValue(false);
  mocks.contactCallback.mockResolvedValue(false);
});

describe("botRouter", () => {
  it("/start без payload відкриває `/start`", async () => {
    await botRouter(context({ message: { text: "/start", message_id: 3 } }));

    expect(mocks.find).toHaveBeenCalledWith("/start");
    expect(mocks.render).toHaveBeenCalledWith(expect.anything(), SCENARIO);
  });

  it("/start з payload шукає payload", async () => {
    await botRouter(context({ message: { text: "/start about", message_id: 3 } }));
    expect(mocks.find).toHaveBeenCalledWith("about");
  });

  it("callback_data — точний ключ", async () => {
    await botRouter(context({ callbackQuery: { data: "about" } }));
    expect(mocks.find).toHaveBeenCalledWith("about");
  });

  it("текст шукається як є", async () => {
    await botRouter(context({ message: { text: "Сервіси", message_id: 3 } }));
    expect(mocks.find).toHaveBeenCalledWith("Сервіси");
  });

  it("невідомий ключ зносить повідомлення", async () => {
    mocks.find.mockResolvedValue(null);
    await botRouter(context({ message: { text: "нема", message_id: 3 } }));

    expect(mocks.render).not.toHaveBeenCalled();
    expect(mocks.deleteIncoming).toHaveBeenCalled();
  });

  it("без допуску показує відмову", async () => {
    mocks.hasAccess.mockReturnValue(false);
    await botRouter(context({ message: { text: "/start", message_id: 3 } }));

    expect(mocks.denied).toHaveBeenCalled();
    expect(mocks.render).not.toHaveBeenCalled();
  });

  it("чужа команда зникає", async () => {
    await botRouter(context({ message: { text: "/help", message_id: 3 } }));
    expect(mocks.deleteIncoming).toHaveBeenCalled();
    expect(mocks.find).not.toHaveBeenCalled();
  });

  it("без тексту й callback нічого не робить", async () => {
    await botRouter(context({ message: { photo: [] } }));
    expect(mocks.find).not.toHaveBeenCalled();
  });
});
