/**
 * Налаштування бота — тест маршрутів, винесених із роутера.
 *
 * Самі обробники мають власні перевірки; тут важливо, що кожен шлях
 * **знаходиться**, а чужий — не перехоплюється.
 *
 * @module api-dev/src/routes/bot-settings.test
 */

import { describe, expect, it } from "vitest";
import { matchBotSettingsRoute } from "./bot-settings";
import type { Env } from "../shared/types";

function makeEnv(): Env {
  return {
    DB: { prepare: () => ({ bind: () => ({ first: async () => null }) }) } as unknown as D1Database,
    CONTENT_KV: {} as unknown as KVNamespace,
  } as unknown as Env;
}

function request(method: string, path: string): Request {
  return new Request(`https://api.example.com${path}`, { method });
}

describe("маршрути налаштувань бота", () => {
  it("знаходить усі чотири шляхи", async () => {
    const env = makeEnv();
    const routes: Array<[string, string]> = [
      ["GET", "/api/bot/webhook-info"],
      ["POST", "/api/bot/setup-webhook"],
      ["POST", "/api/bot/delete-webhook"],
      ["GET", "/api/bot/info"],
    ];

    for (const [method, path] of routes) {
      const matched = matchBotSettingsRoute(request(method, path), env, path);
      expect(matched, path).toBeInstanceOf(Promise);
      await matched; // обробник відповідає сам; тут важлива лише маршрутизація
    }
  });

  it("⛔ чужий шлях і не той метод не перехоплюються", () => {
    const env = makeEnv();
    expect(
      matchBotSettingsRoute(request("GET", "/api/bot/other"), env, "/api/bot/other"),
    ).toBeNull();
    expect(
      matchBotSettingsRoute(
        request("GET", "/api/bot/setup-webhook"),
        env,
        "/api/bot/setup-webhook",
      ),
    ).toBeNull();
  });
});
