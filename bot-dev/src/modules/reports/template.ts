/**
 * Шаблон звіту з бази: слова — контент, код лише підставляє дані.
 *
 * @module bot-dev/src/modules/reports/template
 */

import { ScenarioRepository } from "../../repositories/scenario.repository";
import type { Env } from "../../shared/types/env";
import { REPORT_LOOKUP } from "./types";

export interface ReportTemplate {
  html: string;
  /** Слова статусу: `{ success: "…", failure: "…" }` — з `widget_data` рядка. */
  statusWords: Record<string, string>;
}

function parseWords(raw: string | null): Record<string, string> | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const words: Record<string, string> = {};
    for (const [key, value] of Object.entries(parsed)) {
      if (typeof value === "string" && value.trim()) words[key] = value.trim();
    }
    return Object.keys(words).length > 0 ? words : null;
  } catch {
    return null;
  }
}

/** Шаблон або `null`: без рядка `/report` звіт не надсилається. */
export async function loadReportTemplate(env: Env): Promise<ReportTemplate | null> {
  const scenario = await new ScenarioRepository(env).findByLookup(REPORT_LOOKUP);
  const html = scenario?.rich_html?.trim();
  if (!html) return null;
  return { html, statusWords: parseWords(scenario?.widget_data ?? null) ?? {} };
}
