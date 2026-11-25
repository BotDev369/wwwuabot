/**
 * Ендпоінт прев'ю: **поза `dev` його немає**, і навіть у `dev` він видає підпис
 * власника лише за секретом `PREVIEW_SESSION_KEY` у заголовку `X-Preview-Key`.
 *
 * @module api-dev/src/controllers/preview-session.controller.test
 */

import { describe, expect, it } from "vitest";
import type { Env } from "../shared/types";
import { verifyInitDataPayload } from "@wwwuabot/shared/security/telegram";
import { handlePreviewSession } from "./preview-session.controller";

const TOKEN = "123456:TEST-BOT-TOKEN";
const OWNER = 372567448;
const KEY = "0123456789abcdef0123456789abcdef";

function env(overrides: Partial<Env> = {}): Env {
  return {
    ENVIRONMENT: "dev",
    BOT_TOKEN: TOKEN,
    ADMIN_TELEGRAM_ID: String(OWNER),
    PREVIEW_SESSION_KEY: KEY,
    ...overrides,
  } as Env;
}

function request(key?: string): Request {
  return new Request("https://api-dev.example.com/api/dev/preview-session", {
    headers: key ? { "X-Preview-Key": key } : {},
  });
}

describe("сесія прев'ю", () => {
  it("у dev за ключем віддає підпис власника", async () => {
    const response = await handlePreviewSession(request(KEY), env());
    const body = (await response.json()) as { ok: boolean; initData: string };

    expect(response.status).toBe(200);
    expect(body.ok).toBe(true);
    expect((await verifyInitDataPayload(body.initData, TOKEN))?.userId).toBe(OWNER);
  });

  it("⛔ без ключа чи з чужим ключем — 404, як і без ендпоінта", async () => {
    expect((await handlePreviewSession(request(), env())).status).toBe(404);
    expect((await handlePreviewSession(request("x".repeat(KEY.length)), env())).status).toBe(404);
    expect((await handlePreviewSession(request(KEY.slice(0, -1)), env())).status).toBe(404);
  });

  it("⛔ без секрету в оточенні ендпоінта немає навіть із ключем", async () => {
    expect(
      (await handlePreviewSession(request(KEY), env({ PREVIEW_SESSION_KEY: undefined }))).status,
    ).toBe(404);
    expect(
      (await handlePreviewSession(request("short"), env({ PREVIEW_SESSION_KEY: "short" }))).status,
    ).toBe(404);
  });

  it("⛔ поза dev — 404, навіть із токеном і ключем", async () => {
    const response = await handlePreviewSession(request(KEY), env({ ENVIRONMENT: "production" }));

    expect(response.status).toBe(404);
  });

  it("⛔ без токена чи власника нічого не підписує", async () => {
    expect((await handlePreviewSession(request(KEY), env({ BOT_TOKEN: undefined }))).status).toBe(
      503,
    );
    expect(
      (await handlePreviewSession(request(KEY), env({ ADMIN_TELEGRAM_ID: undefined }))).status,
    ).toBe(503);
  });
});
