import { describe, expect, it, vi } from "vitest";
import type { Env } from "../../shared/types/env";

const handlers = vi.hoisted(() => ({ acceptReport: vi.fn(), listReports: vi.fn() }));

vi.mock("../../modules/reports/ingest", () => ({ acceptReport: handlers.acceptReport }));
vi.mock("../../modules/reports/read", () => ({ listReports: handlers.listReports }));

import { handleReportsRequest } from "./reports.controller";

const env = {} as Env;

describe("handleReportsRequest", () => {
  it("routes a post to the ingest", async () => {
    handlers.acceptReport.mockResolvedValue(new Response("ok"));
    const response = await handleReportsRequest(
      new Request("https://bot.test/reports", { method: "POST" }),
      env,
    );
    expect(await response.text()).toBe("ok");
  });

  it("routes a get to the history", async () => {
    handlers.listReports.mockResolvedValue(new Response("list"));
    const response = await handleReportsRequest(
      new Request("https://bot.test/reports", { method: "GET" }),
      env,
    );
    expect(await response.text()).toBe("list");
  });

  it("answers 405 for anything else", async () => {
    const response = await handleReportsRequest(
      new Request("https://bot.test/reports", { method: "PUT" }),
      env,
    );
    expect(response.status).toBe(405);
  });
});
