import { afterEach, describe, expect, it, vi } from "vitest";
import type { Env } from "../shared/types";
import { handleBotUsername } from "./bot-username.controller";

afterEach(() => {
  vi.unstubAllGlobals();
});

/** Оточення з KV, що віддає задане значення (або нічого). */
function makeEnv(cached: string | null, botToken?: string): Env {
  return {
    DB: { prepare: vi.fn() } as unknown as D1Database,
    CONTENT_KV: {
      get: vi.fn().mockResolvedValue(cached),
      put: vi.fn().mockResolvedValue(undefined),
    } as unknown as KVNamespace,
    BOT_TOKEN: botToken,
  } as Env;
}

/** Тіло відповіді як те, що справді приходить платформі. */
async function body(response: Response): Promise<unknown> {
  return response.json();
}

describe("ім'я бота для платформи", () => {
  it("віддає ім'я з кеша, не ходячи в Telegram", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const response = await handleBotUsername(makeEnv("wwwuabot", "token"));

    expect(await body(response)).toEqual({ username: "wwwuabot" });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("порожній кеш і немає токена — `null`, а не помилка", async () => {
    const response = await handleBotUsername(makeEnv(null));

    expect(await body(response)).toEqual({ username: null });
  });

  it("кеш порожній — питає Telegram і запам'ятовує ім'я", async () => {
    const env = makeEnv(null, "token");
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        json: vi.fn().mockResolvedValue({ ok: true, result: { username: "wwwuabot" } }),
      }),
    );

    const response = await handleBotUsername(env);

    expect(await body(response)).toEqual({ username: "wwwuabot" });
    expect(vi.mocked(env.CONTENT_KV.put)).toHaveBeenCalledWith("bot:username", "wwwuabot", {
      expirationTtl: 86_400,
    });
  });
});
