import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Env } from "../../shared/types/env";

const store = vi.hoisted(() => ({
  getByRunId: vi.fn(),
  countSince: vi.fn(),
  environment: vi.fn(),
  save: vi.fn(),
  setMessageId: vi.fn(),
}));

const template = vi.hoisted(() => ({ loadReportTemplate: vi.fn() }));
const proof = vi.hoisted(() => ({ verifyGitHubToken: vi.fn() }));

vi.mock("./verify", () => ({ verifyGitHubToken: proof.verifyGitHubToken }));

vi.mock("./repository", () => ({
  ReportRepository: class {
    getByRunId = store.getByRunId;
    countSince = store.countSince;
    environment = store.environment;
    save = store.save;
    setMessageId = store.setMessageId;
  },
}));

vi.mock("./template", () => ({ loadReportTemplate: template.loadReportTemplate }));

import { acceptReport } from "./ingest";

const KEY = "secret-key";

function body(overrides: Record<string, unknown> = {}): string {
  return JSON.stringify({
    run_id: "42",
    status: "success",
    sha: "abcdef1234567",
    branch: "main",
    repo: "BotDev369/wwwuabot",
    run_url: "https://github.com/BotDev369/wwwuabot/actions/runs/42",
    commit_url: "https://github.com/BotDev369/wwwuabot/commit/abcdef1",
    jobs: [{ name: "checks", status: "success" }],
    gates: ["check:css"],
    commit: { subject: "Fix", author: "Buffy", files: 1, added: 2, removed: 0 },
    notes: ["one"],
    limitations: [],
    ...overrides,
  });
}

function request(options: { key?: string | null; payload?: string } = {}): Request {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  const key = options.key === undefined ? KEY : options.key;
  if (key !== null) headers["X-Report-Key"] = key;
  return new Request("https://bot.test/reports", {
    method: "POST",
    headers,
    body: options.payload ?? body(),
  });
}

function env(overrides: Partial<Env> = {}): Env {
  return {
    BOT_TOKEN: "token",
    DB: {} as D1Database,
    AGENT_REPORT_KEY: KEY,
    ADMIN_TELEGRAM_ID: "372567448",
    ...overrides,
  } as Env;
}

let sent: { url: string; body: string }[] = [];

beforeEach(() => {
  vi.clearAllMocks();
  sent = [];
  store.getByRunId.mockResolvedValue(null);
  proof.verifyGitHubToken.mockResolvedValue(false);
  store.countSince.mockResolvedValue(0);
  store.environment.mockResolvedValue({ errors: 0, lastCode: null });
  template.loadReportTemplate.mockResolvedValue({
    html: "<p>{{shaShort}}</p>",
    statusWords: { success: "ok" },
  });
  vi.stubGlobal("fetch", async (url: string, init: RequestInit) => {
    sent.push({ url: String(url), body: String(init.body) });
    return new Response(JSON.stringify({ ok: true, result: { message_id: 77 } }), { status: 200 });
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("acceptReport", () => {
  it("answers 401 when nothing proves the caller", async () => {
    const response = await acceptReport(
      request({ key: null }),
      env({ AGENT_REPORT_KEY: undefined }),
    );
    expect(response.status).toBe(401);
    expect(sent).toHaveLength(0);
  });

  it("accepts a verified GitHub token", async () => {
    proof.verifyGitHubToken.mockResolvedValue(true);
    const payload = JSON.stringify({ ...JSON.parse(body()), token: "signed.jwt.here" });
    const response = await acceptReport(request({ key: null, payload }), env());
    expect(response.status).toBe(200);
    expect(sent[0].url).toContain("/sendRichMessage");
  });

  it("answers 401 for a foreign key", async () => {
    const response = await acceptReport(request({ key: "other" }), env());
    expect(response.status).toBe(401);
    expect(sent).toHaveLength(0);
  });

  it("answers 413 for an oversized body", async () => {
    const response = await acceptReport(request({ payload: "x".repeat(9000) }), env());
    expect(response.status).toBe(413);
  });

  it("answers 400 for broken json", async () => {
    const response = await acceptReport(request({ payload: "{" }), env());
    expect(response.status).toBe(400);
  });

  it("sends the rich report and stores it", async () => {
    const response = await acceptReport(request(), env());
    expect(response.status).toBe(200);
    expect(sent[0].url).toContain("/sendRichMessage");
    expect(sent[0].body).toContain("abcdef1");
    expect(store.save).toHaveBeenCalled();
    expect(store.setMessageId).toHaveBeenCalledWith("42", 77);
  });

  it("does not send the same run twice", async () => {
    store.getByRunId.mockResolvedValue({
      runId: "42",
      messageId: 11,
      html: "",
      status: "success",
      sha: "",
      createdAt: "",
    });
    const response = await acceptReport(request(), env());
    expect(await response.json()).toMatchObject({ ok: true, duplicate: true, message_id: 11 });
    expect(sent).toHaveLength(0);
  });

  it("answers 429 above the hourly cap", async () => {
    store.countSince.mockResolvedValue(10);
    const response = await acceptReport(request(), env());
    expect(response.status).toBe(429);
  });

  it("answers 500 when the template row is missing", async () => {
    template.loadReportTemplate.mockResolvedValue(null);
    const response = await acceptReport(request(), env());
    expect(response.status).toBe(500);
  });

  it("answers 503 when there is no owner to send to", async () => {
    const response = await acceptReport(request(), env({ ADMIN_TELEGRAM_ID: undefined }));
    expect(response.status).toBe(503);
  });

  it("answers 502 when the bot cannot send", async () => {
    vi.stubGlobal(
      "fetch",
      async () => new Response(JSON.stringify({ ok: false }), { status: 400 }),
    );
    const response = await acceptReport(request(), env());
    expect(response.status).toBe(502);
  });
});
