/**
 * Аналітика трекерів — зведення записів у день. Модель (типи, каталог,
 * валідація) — у `../trackers`, періоди графіків — у `./buckets`.
 *
 * @module @wwwuabot/shared/trackers/analytics
 */

import { compareTrackerEntries, type TrackerDayValue } from "../trackers";

/**
 * Сума дня — для режиму `sum`: скільки разів людина не записала би мірку,
 * день лишається одним числом (вода, кроки, витрати).
 */
export function trackerDayTotals(entries: readonly TrackerDayValue[]): Map<string, number> {
  const totals = new Map<string, number>();
  for (const entry of entries) {
    totals.set(entry.day, (totals.get(entry.day) ?? 0) + entry.value);
  }
  return totals;
}

/**
 * Останній вимір дня — для режиму `read`. Сумувати виміри не можна (два
 * настрої по 4 — не 8), тож день показує те, що виміряли останнім.
 */
export function trackerDayLast(entries: readonly TrackerDayValue[]): Map<string, number> {
  const last = new Map<string, number>();
  for (const entry of [...entries].sort(compareTrackerEntries)) last.set(entry.day, entry.value);
  return last;
}
