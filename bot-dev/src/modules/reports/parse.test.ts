import { describe, expect, it } from "vitest";
import { parseDeployReport } from "./parse";

function payload(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    run_id: "43562508393",
    status: "success",
    sha: "621128b0000000000000000000000000000000ab",
    branch: "main",
    repo: "BotDev369/wwwuabot",
    run_url: "https://github.com/BotDev369/wwwuabot/actions/runs/43562508393",
    commit_url: "https://github.com/BotDev369/wwwuabot/commit/621128b",
    jobs: [{ name: "checks", status: "success" }],
    gates: ["check:css", "check:texts"],
    commit: { subject: "Fix", author: "Buffy", files: 2, added: 10, removed: 3 },
    notes: ["one"],
    limitations: ["none"],
    ...overrides,
  };
}

describe("parseDeployReport", () => {
  it("accepts a full CI payload", () => {
    const result = parseDeployReport(payload());
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.report.runId).toBe("43562508393");
    expect(result.report.gates).toEqual(["check:css", "check:texts"]);
  });

  it("rejects a run id that is not a number", () => {
    const result = parseDeployReport(payload({ run_id: "run-1" }));
    expect(result).toEqual({ ok: false, error: "run_id" });
  });

  it("rejects links outside github", () => {
    const result = parseDeployReport(payload({ run_url: "https://evil.test/run" }));
    expect(result).toEqual({ ok: false, error: "run_url" });
  });

  it("rejects a platform url that is not https", () => {
    const result = parseDeployReport(payload({ platform_url: "http://platform.test" }));
    expect(result).toEqual({ ok: false, error: "platform_url" });
  });

  it("rejects too many notes", () => {
    const result = parseDeployReport(payload({ notes: ["a", "b", "c", "d", "e", "f", "g"] }));
    expect(result).toEqual({ ok: false, error: "notes" });
  });

  it("rejects an unknown job status", () => {
    const result = parseDeployReport(payload({ jobs: [{ name: "checks", status: "boom" }] }));
    expect(result).toEqual({ ok: false, error: "jobs" });
  });

  it("rejects a missing body", () => {
    expect(parseDeployReport(null)).toEqual({ ok: false, error: "body" });
  });
});
