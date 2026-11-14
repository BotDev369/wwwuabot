/**
 * Історія звітів у чаті: `/reports` — останні десять, `/report <id>` — один.
 *
 * Обидва — лише для власника: викликає їх роутер після `hasAccess`, і жодного
 * слова тут немає — розмітку звіту вже містить його власний HTML із бази.
 *
 * @module bot-dev/src/modules/reports/history
 */

import { deliverRichScreen } from "../../shared/utils/scenario-screen";
import { escapeHtml } from "../../shared/utils/html";
import type { AppContext } from "../../shared/types/env";
import { ReportRepository, type StoredReport } from "./repository";

const HISTORY_LIMIT = 10;
const GLYPHS: Record<string, string> = { success: "✓", skipped: "–" };

function glyph(status: string): string {
  return GLYPHS[status] ?? "✗";
}

function summary(report: StoredReport): string {
  const sha = escapeHtml(report.sha.slice(0, 7));
  return `<summary>${glyph(report.status)} <code>${sha}</code> · ${escapeHtml(report.createdAt)}</summary>`;
}

/** Один звіт у тому вигляді, у якому він прийшов у чат. */
async function showOne(ctx: AppContext, runId: string): Promise<boolean> {
  if (!/^[0-9]{1,20}$/.test(runId)) return false;
  const report = await new ReportRepository(ctx.env).getByRunId(runId);
  if (!report) return false;
  return (await deliverRichScreen(ctx, report.html)) !== null;
}

async function showHistory(ctx: AppContext): Promise<boolean> {
  const reports = await new ReportRepository(ctx.env).list(HISTORY_LIMIT);
  const html =
    reports.length === 0
      ? "<p>—</p>"
      : reports.map((report) => `<details>${summary(report)}${report.html}</details>`).join("");
  return (await deliverRichScreen(ctx, html)) !== null;
}

/**
 * `/reports` і `/report <id>`. `false` — це не наша команда, і роутер має
 * право обробити текст далі.
 */
export async function handleReportCommand(ctx: AppContext, text: string): Promise<boolean> {
  if (!ctx.chat?.id) return false;
  const [command, arg] = text.trim().split(/\s+/);
  if (command === "/report" && arg) return showOne(ctx, arg);
  if (command === "/reports") return showHistory(ctx);
  return false;
}
