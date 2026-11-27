import { describe, expect, it, vi } from "vitest";
import type { Env } from "../shared/types/env";

const handlers = vi.hoisted(() => ({
  handleTelegramWebhook: vi.fn(),
  handleReportsRequest: vi.fn(),
  handleBotChannel: vi.fn(),
}));

vi.mock("./controllers/telegram.controller", () => ({
  handleTelegramWebhook: handlers.handleTelegramWebhook,
}));

vi.mock("./controllers/reports.controller", () => ({
  handleReportsRequest: handlers.handleReportsRequest,
}));

vi.mock("./controllers/bot-channel.controller", () => ({
  handleBotChannel: handlers.handleBotChannel,
}));

import { handleRequest } from "./router";

const env = {} as Env;
const ctx = {} as ExecutionContext;

describe("bot http router", () => {
  it("sends the telegram webhook to the bot", async () => {
    handlers.handleTelegramWebhook.mockResolvedValue(new Response("hook"));
    const response = await handleRequest(
      new Request("https://bot.test/webhook", { method: "POST" }),
      env,
      ctx,
    );
    expect(await response.text()).toBe("hook");
  });

  it("sends /reports to the report handlers", async () => {
    handlers.handleReportsRequest.mockResolvedValue(new Response("report"));
    const response = await handleRequest(
      new Request("https://bot.test/reports", { method: "GET" }),
      env,
      ctx,
    );
    expect(await response.text()).toBe("report");
  });

  it("sends the signed admin channel to its handler", async () => {
    handlers.handleBotChannel.mockResolvedValue(new Response("channel"));
    const response = await handleRequest(
      new Request("https://bot.test/internal/message", { method: "POST" }),
      env,
      ctx,
    );
    expect(await response.text()).toBe("channel");
  });

  it("answers /health without touching dependencies", async () => {
    const response = await handleRequest(new Request("https://bot.test/health"), env, ctx);
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(await response.json()).toMatchObject({ status: "ok", worker: "wwwuabot-bot" });
  });

  it("answers /health/ with the trailing slash too", async () => {
    const response = await handleRequest(new Request("https://bot.test/health/"), env, ctx);
    expect(response.status).toBe(200);
  });

  it("answers 404 for an unknown path", async () => {
    const response = await handleRequest(new Request("https://bot.test/nope"), env, ctx);
    expect(response.status).toBe(404);
  });
});
