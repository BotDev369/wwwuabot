/**
 * Підсумки показників коду: групи, суми, значення зрізу.
 *
 * Відбір файлів (що взагалі рахується) — у `file-filter.ts`, розбір рядків —
 * у `line-counter.ts`. Тут лишається арифметика: скласти файли в групи
 * (воркспейси) і у `total`.
 *
 * **Розбивка — за першою текою** (`api-dev`, `packages`, `docs`…): це та межа,
 * за якою в проєкті вже все поділено (AGENTS.md §1), тож на питання «де саме
 * виросло» відповідає сам зріз, а не окремий екран.
 *
 * Модуль чистий: жодної мережі, лише функції над уже прочитаним.
 *
 * @module api-dev/src/services/monitoring/code-stats
 */

import { TOTAL_GROUP, type MetricValue } from "@wwwuabot/shared/monitoring";
import { workspaceOf } from "./file-filter";

/** Один урахований файл: розмір із `tar` плюс рядки з лічильника. */
export interface CountedFile {
  path: string;
  bytes: number;
  lines: number;
  blank: number;
  comment: number;
}

/** Сума по групі (або по всьому проєкту). */
export interface CodeTotals {
  files: number;
  bytes: number;
  lines: number;
  code: number;
  comment: number;
  blank: number;
}

function emptyTotals(): CodeTotals {
  return { files: 0, bytes: 0, lines: 0, code: 0, comment: 0, blank: 0 };
}

function addInto(totals: CodeTotals, file: CountedFile): void {
  totals.files += 1;
  totals.bytes += file.bytes;
  totals.lines += file.lines;
  totals.code += file.lines - file.blank - file.comment;
  totals.comment += file.comment;
  totals.blank += file.blank;
}

/** Суми по групах і по всьому проєкту. */
export function aggregate(files: readonly CountedFile[]): {
  groups: Record<string, CodeTotals>;
  total: CodeTotals;
} {
  const groups: Record<string, CodeTotals> = {};
  const total = emptyTotals();

  for (const file of files) {
    const group = workspaceOf(file.path);
    const bucket = (groups[group] ??= emptyTotals());
    addInto(bucket, file);
    addInto(total, file);
  }

  return { groups, total };
}

/** Той самий підсумок, але у вигляді значень зрізу. */
export function toMetricValues(files: readonly CountedFile[]): MetricValue[] {
  const { groups, total } = aggregate(files);
  const values: MetricValue[] = [];

  const emit = (group: string, totals: CodeTotals): void => {
    values.push(
      { group, metric: "code.size_bytes", value: totals.bytes },
      { group, metric: "code.lines", value: totals.lines },
      { group, metric: "code.code_lines", value: totals.code },
      { group, metric: "code.comment_lines", value: totals.comment },
      { group, metric: "code.blank_lines", value: totals.blank },
      { group, metric: "code.files", value: totals.files },
    );
  };

  emit(TOTAL_GROUP, total);
  for (const [group, totals] of Object.entries(groups)) emit(group, totals);

  return values;
}
