/**
 * Історія звітів для агента: JSON за тим самим ключем, що й прийом — щоб
 * історія була в одному запиті, а не в трьох вкладках. HTML тут не їде:
 * перегляд — окремий випадок (`/report <id>`).
 *
 * @module bot-dev/src/modules/reports/read
 */

import type { Env } from "../../shared/types/env";
import { sameKey } from "./ingest";
import { ReportRepository } from "./repository";

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 50;

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" },
  });
}

export async function listReports(request: Request, env: Env): Promise<Response> {
  if (!env.AGENT_REPORT_KEY) return json({ error: "not_configured" }, 503);
  if (!sameKey(request.headers.get("X-Report-Key"), env.AGENT_REPORT_KEY)) {
    return json({ error: "unauthorized" }, 401);
  }

  const requested = Number(new URL(request.url).searchParams.get("limit") ?? DEFAULT_LIMIT);
  const limit = Number.isFinite(requested)
    ? Math.min(Math.max(Math.trunc(requested), 1), MAX_LIMIT)
    : DEFAULT_LIMIT;

  const reports = await new ReportRepository(env).list(limit);
  return json({
    reports: reports.map((report) => ({
      run_id: report.runId,
      created_at: report.createdAt,
      status: report.status,
      sha: report.sha,
      message_id: report.messageId,
    })),
  });
}
