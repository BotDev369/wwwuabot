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
  words: vi.fn(),
  cart: vi.fn(),
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
vi.mock("../../modules/search/words.handler", () => ({ handleWords: mocks.words }));
vi.mock("../../modules/search/cart.handler", () => ({ handleCartCallback: mocks.cart }));

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
  mocks.words.mockResolvedValue(true);
  mocks.cart.mockResolvedValue(true);
});

describe("botRouter", () => {
  it("/start без payload відкриває `/start`", async () => {
    await botRouter(context({ message: { text: "/start", message_id: 3 } }));

    expect(mocks.find).toHaveBeenCalledWith("/start");
    expect(mocks.render).toHaveBeenCalledWith(expect.anything(), SCENARIO, undefined);
  });

  it("/start з payload відкриває вид документа", async () => {
    await botRouter(context({ message: { text: "/start about", message_id: 3 } }));

    // `about` — не окремий сценарій, а вид головного віджета.
    expect(mocks.find).toHaveBeenCalledWith("/start");
    expect(mocks.render).toHaveBeenCalledWith(expect.anything(), SCENARIO, "about");
  });

  it("тап кошика — дія, а не ключ сценарію", async () => {
    await botRouter(
      context({
        callbackQuery: { data: "cart:add:12", message: { message_id: 9 } },
      }),
    );

    expect(mocks.cart).toHaveBeenCalled();
    expect(mocks.find).not.toHaveBeenCalled();
  });

  it("callback_data виду теж веде в головний документ", async () => {
    await botRouter(context({ callbackQuery: { data: "about" } }));
    expect(mocks.find).toHaveBeenCalledWith("/start");
    expect(mocks.render).toHaveBeenCalledWith(expect.anything(), SCENARIO, "about");
  });

  it("довільний ключ лишається окремим сценарієм", async () => {
    await botRouter(context({ callbackQuery: { data: "secret" } }));
    expect(mocks.find).toHaveBeenCalledWith("secret");
    expect(mocks.render).toHaveBeenCalledWith(expect.anything(), SCENARIO, undefined);
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

  it("/admin показує власнику кнопку Mini App", async () => {
    const sendMessage = vi.fn(async () => ({ message_id: 11 }));
    await botRouter(
      context({
        message: { text: "/admin", message_id: 3 },
        from: { id: 1 },
        chat: { id: 1, type: "private" },
        api: { sendMessage },
        env: {
          DB: {},
          ADMIN_TELEGRAM_ID: "1",
          WEB_ADMIN_URL: "https://admin.example",
        },
      }),
    );

    expect(sendMessage).toHaveBeenCalledWith(
      1,
      expect.any(String),
      expect.objectContaining({
        reply_markup: {
          inline_keyboard: [
            [{ text: expect.any(String), web_app: { url: "https://admin.example" } }],
          ],
        },
      }),
    );
    expect(mocks.find).not.toHaveBeenCalled();
  });

  it("/admin чужому не показує нічого", async () => {
    const sendMessage = vi.fn(async () => ({ message_id: 11 }));
    await botRouter(
      context({
        message: { text: "/admin", message_id: 3 },
        from: { id: 2 },
        chat: { id: 2, type: "private" },
        api: { sendMessage },
        env: {
          DB: {},
          ADMIN_TELEGRAM_ID: "1",
          WEB_ADMIN_URL: "https://admin.example",
        },
      }),
    );

    expect(sendMessage).not.toHaveBeenCalled();
    expect(mocks.deleteIncoming).toHaveBeenCalled();
    expect(mocks.find).not.toHaveBeenCalled();
  });

  it("/admin у групі не показує нічого — там кнопка Mini App не працює", async () => {
    const sendMessage = vi.fn(async () => ({ message_id: 11 }));
    await botRouter(
      context({
        message: { text: "/admin", message_id: 3 },
        from: { id: 1 },
        chat: { id: -100123, type: "supergroup" },
        api: { sendMessage },
        env: {
          DB: {},
          ADMIN_TELEGRAM_ID: "1",
          WEB_ADMIN_URL: "https://admin.example",
        },
      }),
    );

    expect(sendMessage).not.toHaveBeenCalled();
    expect(mocks.deleteIncoming).toHaveBeenCalled();
    expect(mocks.find).not.toHaveBeenCalled();
  });

  it("/words показує довідник слів, а не сценарій", async () => {
    await botRouter(context({ message: { text: "/words", message_id: 3 } }));

    expect(mocks.words).toHaveBeenCalled();
    expect(mocks.find).not.toHaveBeenCalled();
    expect(mocks.deleteIncoming).not.toHaveBeenCalled();
  });

  it("/words без індексу зникає, як інші службові команди", async () => {
    mocks.words.mockResolvedValue(false);
    await botRouter(context({ message: { text: "/words@bot", message_id: 3 } }));

    expect(mocks.words).toHaveBeenCalled();
    expect(mocks.deleteIncoming).toHaveBeenCalled();
  });

  it("без тексту й callback нічого не робить", async () => {
    await botRouter(context({ message: { photo: [] } }));
    expect(mocks.find).not.toHaveBeenCalled();
  });
});
