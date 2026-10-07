/**
 * Параметри адреси екрана аналізу: дати, системи й параметри.
 * Стан їде параметрами, а не сегментом шляху: `ScenarioPage` бере весь splat
 * як slug (`docs/CONTENT_MODEL.md`).
 *
 * @module packages/ui/src/blocks/date-analysis/date-params
 */

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
