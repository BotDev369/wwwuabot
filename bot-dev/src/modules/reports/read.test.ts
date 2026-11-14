import { describe, expect, it, vi } from "vitest";
import type { Env } from "../../shared/types/env";

const repo = vi.hoisted(() => ({ list: vi.fn() }));

vi.mock("./repository", () => ({
  ReportRepository: class {
    list = repo.list;
  },
}));

import { listReports } from "./read";

const KEY = "secret-key";

function request(options: { key?: string | null; limit?: string } = {}): Request {
  const headers: Record<string, string> = {};
  if (options.key !== null) headers["X-Report-Key"] = options.key ?? KEY;
  const query = options.limit ? `?limit=${options.limit}` : "";
  return new Request(`https://bot.test/reports${query}`, { method: "GET", headers });
}

function env(overrides: Partial<Env> = {}): Env {
  return { DB: {} as D1Database, AGENT_REPORT_KEY: KEY, ...overrides } as Env;
}

describe("listReports", () => {
  it("answers 503 without a configured key", async () => {
    expect((await listReports(request(), env({ AGENT_REPORT_KEY: undefined }))).status).toBe(503);
  });

  it("answers 401 for a foreign key", async () => {
    expect((await listReports(request({ key: "other" }), env())).status).toBe(401);
  });

  it("returns run ids without html", async () => {
    repo.list.mockResolvedValue([
      {
        runId: "42",
        createdAt: "2026-11-14 05:00:00",
        status: "success",
        sha: "abcdef1",
        html: "<p>x</p>",
        messageId: 7,
      },
    ]);
    const body = (await (await listReports(request(), env())).json()) as { reports: unknown };
    expect(body.reports).toEqual([
      {
        run_id: "42",
        created_at: "2026-11-14 05:00:00",
        status: "success",
        sha: "abcdef1",
        message_id: 7,
      },
    ]);
  });

  it("clamps the limit to the allowed range", async () => {
    repo.list.mockResolvedValue([]);
    await listReports(request({ limit: "999" }), env());
    expect(repo.list).toHaveBeenCalledWith(50);
  });
});
