import { describe, expect, it } from "vitest";
import { matchBotMessagesRoute } from "./bot-messages";
import type { Env } from "../shared/types";

function env(): Env {
  const statement = {
    bind: () => statement,
    all: async () => ({ results: [] }),
  };
  return { DB: { prepare: () => statement } } as unknown as Env;
}

function request(method: string, url: string): Request {
  return new Request(`https://example.com${url}`, { method });
}

describe("matchBotMessagesRoute", () => {
  it("ловить GET переписки людини", async () => {
    const response = await matchBotMessagesRoute(
      request("GET", "/api/admin/users/7/messages"),
      env(),
      "/api/admin/users/7/messages",
    );

    expect(response).not.toBeNull();
    expect((response as Response).status).toBe(200);
  });

  it("чужий шлях не чіпає", () => {
    expect(
      matchBotMessagesRoute(
        request("GET", "/api/admin/users/read"),
        env(),
        "/api/admin/users/read",
      ),
    ).toBeNull();
    expect(
      matchBotMessagesRoute(
        request("GET", "/api/admin/users/7/messages/extra"),
        env(),
        "/api/admin/users/7/messages/extra",
      ),
    ).toBeNull();
  });

  it("інший метод і кривий id — не наш шлях", () => {
    expect(
      matchBotMessagesRoute(
        request("POST", "/api/admin/users/7/messages"),
        env(),
        "/api/admin/users/7/messages",
      ),
    ).toBeNull();
    expect(
      matchBotMessagesRoute(
        request("GET", "/api/admin/users/abc/messages"),
        env(),
        "/api/admin/users/abc/messages",
      ),
    ).toBeNull();
    expect(
      matchBotMessagesRoute(
        request("GET", "/api/admin/users//messages"),
        env(),
        "/api/admin/users//messages",
      ),
    ).toBeNull();
  });
});
