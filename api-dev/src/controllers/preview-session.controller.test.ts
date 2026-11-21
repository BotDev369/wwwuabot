/**
 * Ендпоінт прев'ю: **поза `dev` його немає**, а підписується лише власник.
 *
 * @module api-dev/src/controllers/preview-session.controller.test
 */

import { describe, expect, it } from "vitest";
import type { Env } from "../shared/types";
import { verifyInitDataPayload } from "@wwwuabot/shared/security/telegram";
import { handlePreviewSession } from "./preview-session.controller";

const TOKEN = "123456:TEST-BOT-TOKEN";
const OWNER = 372567448;

function env(overrides: Partial<Env> = {}): Env {
  return {
    ENVIRONMENT: "dev",
    BOT_TOKEN: TOKEN,
    ADMIN_TELEGRAM_ID: String(OWNER),
    ...overrides,
  } as Env;
}

describe("сесія прев'ю", () => {
  it("у dev віддає підпис власника", async () => {
    const response = await handlePreviewSession(env());
    const body = (await response.json()) as { ok: boolean; initData: string };

    expect(response.status).toBe(200);
    expect(body.ok).toBe(true);
    expect((await verifyInitDataPayload(body.initData, TOKEN))?.userId).toBe(OWNER);
  });

  it("⛔ поза dev — 404, навіть із токеном", async () => {
    const response = await handlePreviewSession(env({ ENVIRONMENT: "production" }));

    expect(response.status).toBe(404);
  });

  it("⛔ без токена чи власника нічого не підписує", async () => {
    expect((await handlePreviewSession(env({ BOT_TOKEN: undefined }))).status).toBe(503);
    expect((await handlePreviewSession(env({ ADMIN_TELEGRAM_ID: undefined }))).status).toBe(503);
  });
});
