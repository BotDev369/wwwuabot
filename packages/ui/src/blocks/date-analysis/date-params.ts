/**
 * Параметри адреси екрана аналізу: дати, системи й параметри.
 * Стан їде параметрами, а не сегментом шляху: `ScenarioPage` бере весь splat
 * як slug (`docs/CONTENT_MODEL.md`).
 *
 * @module packages/ui/src/blocks/date-analysis/date-params
 */

import {
  SELF_QUERY,
  SUBJECT_LABELS_QUERY,
  SUBJECT_QUERY,
  parseLabels,
  parseScopes,
  scopeOf,
  type AnalysisScope,
  type SubjectKind,
} from "@wwwuabot/shared/content";
import { isValidDate } from "@wwwuabot/shared/utils/mydate-helpers";

/** Перелік із параметра адреси; порожній рядок — це порожній перелік. */
export function listFrom(value: string | null): string[] {
  return (value ?? "").split(",").filter(Boolean);
}

/**
 * Дати з адреси: `?dates=` — одна або більше. `?date=` читається поруч, бо
 * стільки несе адреса одного датового екрана: посилання, збережене до
 * об'єднання, не має втратити свою дату. Дублі прибираються: два однакові
 * стовпці — це та сама дата, показана двічі.
 */
export function readDates(search: string): string[] {
  const params = new URLSearchParams(search);
  const raw = [params.get("dates") ?? "", params.get("date") ?? ""].join(",");
  return Array.from(new Set(raw.split(",").filter((value) => isValidDate(value))));
}

/** Кого читаємо — разом із підписами й ознакою власного аналізу. */
export interface AnalysisSubject {
  /** Вид на кожну дату, у тому ж порядку, що й `dates`. */
  kinds: SubjectKind[];
  /** Спільний вид для підписів; різні види — `mixed`. */
  scope: AnalysisScope;
  /** Імена суб'єктів: `labels[i]` підписує `dates[i]`. */
  labels: string[];
  /** Аналіз себе: результат говорить «ви», а не «людина». */
  self: boolean;
}

/**
 * Вид суб'єкта з адреси.
 *
 * Підписів може бути менше, ніж дат (людина додала дату й не назвала її), і
 * більше (адресу правили руками): беремо рівно стільки, скільки дат.
 */
export function readSubject(search: string, count: number): AnalysisSubject {
  const params = new URLSearchParams(search);
  const kinds = parseScopes(params.get(SUBJECT_QUERY), count);
  const labels = parseLabels(params.get(SUBJECT_LABELS_QUERY)).slice(0, count);
  return {
    kinds,
    scope: scopeOf(kinds),
    labels,
    self: params.get(SELF_QUERY) === "1",
  };
}
