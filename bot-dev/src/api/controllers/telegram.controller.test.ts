/**
 * Webhook: перевірка секрету, перехоплення `widget_query` і шлях grammY.
 *
 * @module bot-dev/src/api/controllers/telegram.controller.test
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Env } from "../../shared/types/env";

const mocks = vi.hoisted(() => ({ widget: vi.fn(), handler: vi.fn() }));

vi.mock("../../core/widget-query", () => ({ handleWidgetQuery: mocks.widget }));
vi.mock("../../core/bot", () => ({ createBot: () => ({}) }));
vi.mock("grammy", () => ({
  webhookCallback: () => mocks.handler,
}));

const { handleTelegramWebhook } = await import("./telegram.controller");

function request(body: unknown, secret = "s3"): Request {
  return new Request("https://bot.example.com/webhook", {
    method: "POST",
    headers: { "X-Telegram-Bot-Api-Secret-Token": secret },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.handler.mockResolvedValue(new Response("ok", { status: 200 }));
});

describe("handleTelegramWebhook", () => {
  it("⛔ чужий секрет — 401", async () => {
    const env = { SECRET_TOKEN: "s3" } as Env;
    const res = await handleTelegramWebhook(request({ update_id: 1 }, "wrong"), env);
    expect(res.status).toBe(401);
  });

  it("тап у віджеті обробляється до grammY", async () => {
    const env = { SECRET_TOKEN: "s3" } as Env;
    const res = await handleTelegramWebhook(
      request({ update_id: 2, widget_query: { id: "q", data: "about" } }),
      env,
    );

    expect(mocks.widget).toHaveBeenCalledWith(env, { id: "q", data: "about" });
    expect(mocks.handler).not.toHaveBeenCalled();
    expect(res.status).toBe(200);
  });

  it("звичайний апдейт іде в grammY", async () => {
    const env = { SECRET_TOKEN: "s3" } as Env;
    const res = await handleTelegramWebhook(request({ update_id: 3, message: {} }), env);

    expect(mocks.handler).toHaveBeenCalled();
    expect(res.status).toBe(200);
  });

  it("⛔ збій grammY не робить retry у Telegram", async () => {
    mocks.handler.mockRejectedValue(new Error("boom"));
    const env = { SECRET_TOKEN: "s3" } as Env;
    const res = await handleTelegramWebhook(request({ update_id: 4 }), env);
    expect(res.status).toBe(200);
  });
});
