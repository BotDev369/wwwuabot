/**
 * Rich-звіт із шаблону й даних: розмітка в базі, значення — з CI. Рядки
 * таблиць будуються тут, у шаблоні стоять лише місця під них.
 *
 * @module bot-dev/src/modules/reports/render
 */

import { escapeHtml } from "../../shared/utils/html";
import type { ReportTemplate } from "./template";
import type { DeployReport, EnvironmentStats } from "./types";

const GLYPHS: Record<string, string> = { success: "✓", skipped: "–" };

function glyph(status: string): string {
  return GLYPHS[status] ?? "✗";
}

function tableRows(items: { name: string; status: string }[]): string {
  return items
    .map((item) => `<tr><td>${escapeHtml(item.name)}</td><td>${glyph(item.status)}</td></tr>`)
    .join("");
}

function gateRows(gates: string[]): string {
  return gates.map((gate) => `<tr><td>${escapeHtml(gate)}</td><td>✓</td></tr>`).join("");
}

/** Список рядків; порожньо — прочерк, а не вигаданий текст. */
function bulletList(items: string[]): string {
  if (items.length === 0) return "<p>—</p>";
  return `<ul>${items.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>`;
}

function environment(stats: EnvironmentStats): string {
  if (stats.errors === 0) return "<p>0</p>";
  const code = stats.lastCode ? ` · <code>${escapeHtml(stats.lastCode)}</code>` : "";
  return `<p><b>${stats.errors}</b>${code}</p>`;
}

function fill(html: string, values: Record<string, string>): string {
  return html.replace(/\{\{\s*([A-Za-z0-9]+)\s*\}\}/g, (_match, key: string) => values[key] ?? "");
}

export interface RenderEnv extends EnvironmentStats {
  date: string;
  platformUrl: string;
}

export function renderReport(
  template: ReportTemplate,
  report: DeployReport,
  env: RenderEnv,
): string {
  const { commit } = report;
  const values: Record<string, string> = {
    repo: escapeHtml(report.repo),
    statusIcon: glyph(report.status),
    statusWord: escapeHtml(template.statusWords[report.status] ?? ""),
    branch: escapeHtml(report.branch),
    shaShort: escapeHtml(report.sha.slice(0, 7)),
    date: escapeHtml(env.date),
    jobs: tableRows(report.jobs),
    gates: gateRows(report.gates),
    gateCount: String(report.gates.length),
    commitSubject: escapeHtml(commit.subject),
    author: escapeHtml(commit.author),
    added: String(commit.added),
    removed: String(commit.removed),
    files: String(commit.files),
    notes: bulletList(report.notes),
    limitations: bulletList(report.limitations),
    env: environment(env),
    runUrl: escapeHtml(report.runUrl),
    commitUrl: escapeHtml(report.commitUrl),
    platformUrl: escapeHtml(env.platformUrl || report.platformUrl),
  };
  return fill(template.html, values);
}
