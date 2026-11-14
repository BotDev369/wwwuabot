/**
 * Звіти в D1: один рядок на деплой плюс читання історії.
 *
 * `run_id` унікальний, тож повторний прогін пайплайна оновлює звіт, а не
 * додає другий: історія лишається списком деплоїв, а не списком спроб.
 *
 * @module bot-dev/src/modules/reports/repository
 */

import { ensureTables } from "@wwwuabot/shared/database/ensure-tables";
import { DatabaseRepository } from "../../core/database.repository";
import type { Env } from "../../shared/types/env";
import type { DeployReport, EnvironmentStats, ReportStatus } from "./types";

export interface StoredReport {
  runId: string;
  createdAt: string;
  status: ReportStatus;
  sha: string;
  html: string;
  messageId: number | null;
}

interface Row {
  run_id: string;
  created_at: string;
  status: string;
  sha: string | null;
  html: string;
  message_id: number | null;
}

function toStored(row: Row): StoredReport {
  return {
    runId: row.run_id,
    createdAt: row.created_at,
    status: row.status as ReportStatus,
    sha: row.sha ?? "",
    html: row.html,
    messageId: typeof row.message_id === "number" ? row.message_id : null,
  };
}

export class ReportRepository extends DatabaseRepository {
  constructor(env: Env) {
    super(env);
  }

  async save(report: DeployReport, html: string, createdAt: string): Promise<void> {
    await ensureTables(this.db, ["agent_reports"]);
    await this.db
      .prepare(
        `INSERT INTO agent_reports (run_id, created_at, status, sha, branch, html)
         VALUES (?, ?, ?, ?, ?, ?)
         ON CONFLICT(run_id) DO UPDATE SET
           status = excluded.status,
           sha = excluded.sha,
           branch = excluded.branch,
           html = excluded.html`,
      )
      .bind(report.runId, createdAt, report.status, report.sha, report.branch, html)
      .run();
  }

  async setMessageId(runId: string, messageId: number): Promise<void> {
    await this.db
      .prepare("UPDATE agent_reports SET message_id = ? WHERE run_id = ?")
      .bind(messageId, runId)
      .run();
  }

  async getByRunId(runId: string): Promise<StoredReport | null> {
    await ensureTables(this.db, ["agent_reports"]);
    const row = await this.db
      .prepare(
        "SELECT run_id, created_at, status, sha, html, message_id FROM agent_reports WHERE run_id = ?",
      )
      .bind(runId)
      .first<Row>();
    return row ? toStored(row) : null;
  }

  async list(limit: number): Promise<StoredReport[]> {
    await ensureTables(this.db, ["agent_reports"]);
    const { results } = await this.db
      .prepare(
        `SELECT run_id, created_at, status, sha, html, message_id
           FROM agent_reports ORDER BY id DESC LIMIT ?`,
      )
      .bind(limit)
      .all<Row>();
    return (results ?? []).map(toStored);
  }

  /** Скільки звітів прийнято від `since` — ковпак проти потоку з чужим ключем. */
  async countSince(since: string): Promise<number> {
    await ensureTables(this.db, ["agent_reports"]);
    const row = await this.db
      .prepare("SELECT COUNT(*) AS n FROM agent_reports WHERE created_at >= ?")
      .bind(since)
      .first<{ n: number }>();
    return Number(row?.n ?? 0);
  }

  /**
   * Стан середовища, який бачить лише база: скільки помилок у журналі за добу
   * і який код останньої. Сам CI цього не знає, а звіт без цього — лише про
   * деплой, а не про те, як бот себе почуває.
   */
  async environment(since: string): Promise<EnvironmentStats> {
    await ensureTables(this.db, ["user_events"]);
    const total = await this.db
      .prepare("SELECT COUNT(*) AS n FROM user_events WHERE status = 'error' AND created_at >= ?")
      .bind(since)
      .first<{ n: number }>();
    const last = await this.db
      .prepare("SELECT details FROM user_events WHERE status = 'error' ORDER BY id DESC LIMIT 1")
      .first<{ details: string | null }>();
    const code = /[A-Z][A-Z0-9_]{5,}/.exec(last?.details ?? "")?.[0] ?? null;
    return { errors: Number(total?.n ?? 0), lastCode: code };
  }
}
