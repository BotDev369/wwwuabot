import { afterEach, describe, expect, it, vi } from "vitest";
import {
  BOT_CHANNEL_HEADER,
  BOT_CHANNEL_PATH,
  signBotChannel,
} from "@wwwuabot/shared/security/bot-channel";
import type { Env } from "../../shared/types/env";
import { handleBotChannel } from "./bot-channel.controller";

const actions = vi.hoisted(() => ({ applyAdminAction: vi.fn() }));
vi.mock("../../modules/history/admin-actions", () => ({
  applyAdminAction: actions.applyAdminAction,
}));

const SECRET = "bot-token";
const env = { BOT_TOKEN: SECRET } as unknown as Env;

async function request(body: string, signed = true): Promise<Request> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (signed) {
    headers[BOT_CHANNEL_HEADER] = await signBotChannel(SECRET, {
      method: "POST",
      path: BOT_CHANNEL_PATH,
      body,
    });
  }
  return new Request(`https://bot.test${BOT_CHANNEL_PATH}`, { method: "POST", headers, body });
}

const EDIT = JSON.stringify({
  action: "edit",
  chatId: 7,
  messageId: 100,
  text: "нове",
  format: "rich",
});

afterEach(() => vi.clearAllMocks());

describe("handleBotChannel", () => {
  it("без підпису — 401 і жодної дії", async () => {
    const response = await handleBotChannel(await request(EDIT, false), env);
    expect(response.status).toBe(401);
    expect(actions.applyAdminAction).not.toHaveBeenCalled();
  });

  it("підміна тіла ламає підпис", async () => {
    const signed = await signBotChannel(SECRET, {
      method: "POST",
      path: BOT_CHANNEL_PATH,
      body: EDIT,
    });
    const tampered = new Request(`https://bot.test${BOT_CHANNEL_PATH}`, {
      method: "POST",
      headers: { [BOT_CHANNEL_HEADER]: signed },
      body: `${EDIT} `,
    });

    const response = await handleBotChannel(tampered, env);
    expect(response.status).toBe(401);
  });

  it("підписаний запит доходить до дії", async () => {
    actions.applyAdminAction.mockResolvedValue({ ok: true, message: { id: 1 } });
    const response = await handleBotChannel(await request(EDIT), env);

    expect(response.status).toBe(200);
    expect(actions.applyAdminAction).toHaveBeenCalledWith(env, {
      action: "edit",
      chatId: 7,
      messageId: 100,
      text: "нове",
      format: "rich",
    });
  });

  it("криве тіло — 400, відмова дії — її статус", async () => {
    expect((await handleBotChannel(await request("{"), env)).status).toBe(400);

    const badShape = JSON.stringify({ action: "drop", chatId: 7, messageId: 100 });
    expect((await handleBotChannel(await request(badShape), env)).status).toBe(400);

    actions.applyAdminAction.mockResolvedValue({ ok: false, status: 409, error: "too_old" });
    const response = await handleBotChannel(await request(EDIT), env);
    expect(response.status).toBe(409);
    expect(await response.json()).toMatchObject({ ok: false, error: "too_old" });
  });
});
