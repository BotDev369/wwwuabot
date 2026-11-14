/**
 * Прийом звіту від CI: ключ, ліміти, один рядок на деплой, надсилання в чат.
 * Одержувач ніколи не приходить у запиті — це `ADMIN_TELEGRAM_ID`, тож
 * підроблене тіло не може написати комусь іншому.
 *
 * @module bot-dev/src/modules/reports/ingest
 */

import { parseOwnerTelegramId } from "@wwwuabot/shared/security/access";
import type { Env } from "../../shared/types/env";
import { log } from "../../shared/utils/debug";
import { sendRichMessage } from "../../shared/telegram/widgets";
import { parseDeployReport } from "./parse";
import { verifyGitHubToken } from "./verify";
import { renderReport } from "./render";
import { ReportRepository } from "./repository";
import { loadReportTemplate } from "./template";

/** Межа тіла: звіт — це кілька кілобайт, а не канал для файлів. */
export const MAX_BODY = 8192;
/** Ковпак прийнятих звітів за годину — на випадок, якщо ключ утече. */
export const MAX_PER_HOUR = 10;

export function sameKey(given: string | null, expected: string | undefined): boolean {
  if (!given || !expected || given.length !== expected.length) return false;
  let diff = 0;
  for (let i = 0; i < given.length; i += 1) diff |= given.charCodeAt(i) ^ expected.charCodeAt(i);
  return diff === 0;
}

/** `YYYY-MM-DD HH:MM:SS`, як у колонках `created_at`. */
function sqliteStamp(date: Date): string {
  return date.toISOString().replace("T", " ").slice(0, 19);
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" },
  });
}

/**
 * Два входи, обидва закриті: OIDC-токен GitHub (так пише CI — секрета в
 * репозиторії немає) і спільний ключ (ручний звіт або локальна перевірка).
 */
async function authorized(request: Request, env: Env, raw: unknown): Promise<boolean> {
  if (sameKey(request.headers.get("X-Report-Key"), env.AGENT_REPORT_KEY)) return true;
  const token = (raw as { token?: unknown } | null)?.token;
  return typeof token === "string" ? verifyGitHubToken(token) : false;
}

export async function acceptReport(request: Request, env: Env): Promise<Response> {
  const body = await request.text();
  if (body.length > MAX_BODY) return json({ error: "too_large" }, 413);

  let raw: unknown;
  try {
    raw = JSON.parse(body);
  } catch {
    return json({ error: "invalid_json" }, 400);
  }

  if (!(await authorized(request, env, raw))) {
    log("REPORTS", "ingest refused: no proof of origin");
    return json({ error: "unauthorized" }, 401);
  }

  const parsed = parseDeployReport(raw);
  if (!parsed.ok) return json({ error: `invalid:${parsed.error}` }, 400);
  const report = parsed.report;

  const owner = parseOwnerTelegramId(env.ADMIN_TELEGRAM_ID);
  if (owner === null) {
    log("REPORTS", "ingest failed: ADMIN_TELEGRAM_ID is not set");
    return json({ error: "no_recipient" }, 503);
  }

  const repo = new ReportRepository(env);
  const now = new Date();
  const existing = await repo.getByRunId(report.runId);
  if (existing?.messageId) {
    log("REPORTS", "duplicate run ignored", { run: report.runId });
    return json({ ok: true, duplicate: true, message_id: existing.messageId });
  }

  const recent = await repo.countSince(sqliteStamp(new Date(now.getTime() - 3600_000)));
  if (recent >= MAX_PER_HOUR) {
    log("REPORTS", "ingest rate limited", { recent });
    return json({ error: "rate_limited" }, 429);
  }

  const template = await loadReportTemplate(env);
  if (!template) {
    log("REPORTS", "template missing", { lookup: "/report" });
    return json({ error: "template_missing" }, 500);
  }

  const stats = await repo.environment(sqliteStamp(new Date(now.getTime() - 24 * 3600_000)));
  const html = renderReport(template, report, {
    ...stats,
    date: sqliteStamp(now),
    platformUrl: env.WEB_PLATFORM_URL ?? "",
  });

  await repo.save(report, html, sqliteStamp(now));

  try {
    const sent = await sendRichMessage(env.BOT_TOKEN, owner, html);
    await repo.setMessageId(report.runId, sent.message_id);
    log("REPORTS", "report sent", { run: report.runId, message_id: sent.message_id });
    return json({ ok: true, message_id: sent.message_id });
  } catch (error: unknown) {
    log("REPORTS", "send failed", { run: report.runId, error: String(error) });
    return json({ error: "send_failed" }, 502);
  }
}
