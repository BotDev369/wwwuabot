/**
 * Дані звіту агента про деплой: те, що приїжджає з CI і те, що лягає в базу.
 *
 * Це вже перевірена форма (`parse.ts`), а не те, що надіслали: решта модуля
 * працює з полями, чиї довжина й алфавіт відомі.
 *
 * @module bot-dev/src/modules/reports/types
 */

/** Ключ сценарію, у якому лежить шаблон звіту. */
export const REPORT_LOOKUP = "/report";

export const REPORT_STATUSES = ["success", "failure", "cancelled", "skipped"] as const;

export type ReportStatus = (typeof REPORT_STATUSES)[number];

export interface ReportJob {
  name: string;
  status: ReportStatus;
}

export interface DeployReport {
  runId: string;
  status: ReportStatus;
  sha: string;
  branch: string;
  repo: string;
  runUrl: string;
  commitUrl: string;
  jobs: ReportJob[];
  gates: string[];
  commit: {
    subject: string;
    author: string;
    files: number;
    added: number;
    removed: number;
  };
  notes: string[];
  limitations: string[];
  platformUrl: string;
}

/** Стан середовища, який сервер знає сам: журнал помилок за добу. */
export interface EnvironmentStats {
  errors: number;
  lastCode: string | null;
}
