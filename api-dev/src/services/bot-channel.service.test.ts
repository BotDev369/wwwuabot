import { afterEach, describe, expect, it, vi } from "vitest";
import {
  BOT_CHANNEL_HEADER,
  BOT_CHANNEL_PATH,
  verifyBotChannel,
} from "@wwwuabot/shared/security/bot-channel";
import type { Env } from "../shared/types";
import { callBotChannel } from "./bot-channel.service";

const TOKEN = "bot-token";

function env(fetcher?: unknown): Env {
  return { BOT_TOKEN: TOKEN, BOT: fetcher } as unknown as Env;
}

function answer(body: unknown, status = 200): Response {
  return { ok: status < 400, status, json: async () => body } as unknown as Response;
}

afterEach(() => vi.unstubAllGlobals());

describe("callBotChannel", () => {
  it("підписує фактичне тіло й шле його боту через service binding", async () => {
    const fetchMock = vi.fn(async (_request: Request) => answer({ ok: true, message: { id: 1 } }));
    const result = await callBotChannel(env({ fetch: fetchMock }), {
      action: "delete",
      chatId: 7,
      messageId: 100,
    });

    expect(result).toMatchObject({ ok: true, message: { id: 1 } });
    const request = fetchMock.mock.calls[0][0] as unknown as Request;
    expect(request.url).toBe(`https://bot${BOT_CHANNEL_PATH}`);
    const body = await request.clone().text();
    expect(JSON.parse(body)).toEqual({ action: "delete", chatId: 7, messageId: 100 });
    expect(
      await verifyBotChannel(TOKEN, {
        method: "POST",
        path: BOT_CHANNEL_PATH,
        body,
        header: request.headers.get(BOT_CHANNEL_HEADER),
      }),
    ).toEqual({ ok: true });
  });

  it("без біндингу або токена — 503, без мережі", async () => {
    expect(
      await callBotChannel(env(undefined), { action: "delete", chatId: 7, messageId: 1 }),
    ).toMatchObject({
      ok: false,
      status: 503,
      error: "channel_missing",
    });
    expect(
      await callBotChannel({ BOT: { fetch: vi.fn() } } as unknown as Env, {
        action: "delete",
        chatId: 7,
        messageId: 1,
      }),
    ).toMatchObject({ ok: false, error: "channel_missing" });
  });

  it("відмову бота повертає з кодом і поясненням", async () => {
    const fetcher = {
      fetch: vi.fn(async () => answer({ ok: false, error: "too_old" }, 409)),
    };
    expect(
      await callBotChannel(env(fetcher), { action: "delete", chatId: 7, messageId: 1 }),
    ).toMatchObject({ ok: false, status: 409, error: "too_old" });
  });

  it("мережевий збій — 502, а не виняток у хендлері", async () => {
    const fetcher = {
      fetch: vi.fn(async () => {
        throw new Error("binding down");
      }),
    };
    expect(
      await callBotChannel(env(fetcher), { action: "delete", chatId: 7, messageId: 1 }),
    ).toMatchObject({ ok: false, status: 502, error: "channel_failed" });
  });
});
