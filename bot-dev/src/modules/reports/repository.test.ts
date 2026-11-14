import { describe, expect, it } from "vitest";
import type { Env } from "../../shared/types/env";
import { ReportRepository } from "./repository";
import type { DeployReport } from "./types";

interface StoredRow {
  run_id: string;
  created_at: string;
  status: string;
  sha: string;
  html: string;
  message_id: number | null;
}

/** Мінімальна D1: розпізнає запити цього репозиторію, решта — порожньо. */
function fakeDb(seed: { rows?: StoredRow[]; errors?: number; details?: string | null } = {}) {
  const rows = [...(seed.rows ?? [])];
  const executed: { sql: string; args: unknown[] }[] = [];

  const db = {
    prepare(sql: string) {
      const stmt = {
        args: [] as unknown[],
        bind(...args: unknown[]) {
          stmt.args = args;
          return stmt;
        },
        async run() {
          executed.push({ sql, args: stmt.args });
          return { meta: { changes: 1 } };
        },
        async first() {
          if (sql.includes("COUNT(*) AS n FROM agent_reports")) {
            const since = String(stmt.args[0] ?? "");
            return { n: rows.filter((row) => row.created_at >= since).length };
          }
          if (sql.includes("SELECT details")) {
            return { details: seed.details ?? null };
          }
          if (sql.includes("FROM user_events")) {
            return { n: seed.errors ?? 0 };
          }
          if (sql.includes("WHERE run_id = ?")) {
            return rows.find((row) => row.run_id === stmt.args[0]) ?? null;
          }
          return null;
        },
        async all() {
          if (sql.includes("ORDER BY id DESC")) {
            return { results: rows.slice(0, Number(stmt.args[0] ?? 0)) };
          }
          return { results: [] };
        },
      };
      return stmt;
    },
  };

  return { db: db as unknown as D1Database, executed, rows };
}

function report(): DeployReport {
  return {
    runId: "42",
    status: "success",
    sha: "abcdef1234567",
    branch: "main",
    repo: "BotDev369/wwwuabot",
    runUrl: "https://github.com/BotDev369/wwwuabot/actions/runs/42",
    commitUrl: "https://github.com/BotDev369/wwwuabot/commit/abcdef1",
    jobs: [{ name: "checks", status: "success" }],
    gates: [],
    commit: { subject: "Fix", author: "Buffy", files: 1, added: 1, removed: 0 },
    notes: [],
    limitations: [],
    platformUrl: "",
  };
}

function env(db: D1Database): Env {
  return { DB: db } as Env;
}

const row: StoredRow = {
  run_id: "42",
  created_at: "2026-11-14 05:00:00",
  status: "success",
  sha: "abcdef1",
  html: "<p>report</p>",
  message_id: 7,
};

describe("ReportRepository", () => {
  it("saves a report with one row per run", async () => {
    const { db, executed } = fakeDb();
    await new ReportRepository(env(db)).save(report(), "<p>x</p>", "2026-11-14 05:00:00");
    const insert = executed.find((entry) => entry.sql.includes("INSERT INTO agent_reports"));
    expect(insert?.sql).toContain("ON CONFLICT(run_id)");
    expect(insert?.args[0]).toBe("42");
  });

  it("reads a report by run id", async () => {
    const { db } = fakeDb({ rows: [row] });
    const stored = await new ReportRepository(env(db)).getByRunId("42");
    expect(stored?.html).toBe("<p>report</p>");
    expect(stored?.messageId).toBe(7);
  });

  it("returns null for an unknown run", async () => {
    const { db } = fakeDb();
    expect(await new ReportRepository(env(db)).getByRunId("404")).toBeNull();
  });

  it("lists the newest reports first", async () => {
    const { db } = fakeDb({ rows: [row, { ...row, run_id: "41" }] });
    const list = await new ReportRepository(env(db)).list(10);
    expect(list.map((item) => item.runId)).toEqual(["42", "41"]);
  });

  it("counts accepted reports since a moment", async () => {
    const { db } = fakeDb({ rows: [row] });
    expect(await new ReportRepository(env(db)).countSince("2026-11-14 00:00:00")).toBe(1);
    expect(await new ReportRepository(env(db)).countSince("2026-11-15 00:00:00")).toBe(0);
  });

  it("pulls the error code out of the journal", async () => {
    const { db } = fakeDb({
      errors: 2,
      details: "prod: Error: sendWidget failed: INPUT_MEDIA_WIDGET_NOT_ALLOWED",
    });
    const stats = await new ReportRepository(env(db)).environment("2026-11-13 00:00:00");
    expect(stats).toEqual({ errors: 2, lastCode: "INPUT_MEDIA_WIDGET_NOT_ALLOWED" });
  });
});
