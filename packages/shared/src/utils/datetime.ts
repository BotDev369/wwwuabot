/**
 * Форматує поточну дату (або передану) у формат SQLite YYYY-MM-DD HH:MM:SS.
 *
 * Використовується всюди, де потрібен timestamp для D1-колонок.
 * Не використовувати `new Date().toISOString().replace(...)` — це
 * дублювалось у 7+ місцях до винесення сюди (задача P1-3).
 */
export function formatSqliteDatetime(date?: Date): string {
  const d = date ?? new Date();
  return d.toISOString().replace("T", " ").slice(0, 19);
}

/**
 * Час із колонки D1 — у мілісекунди; невалідне значення — `0`.
 *
 * Час лежить як UTC без позначки зони (`YYYY-MM-DD HH:MM:SS`), тож розбір
 * живе **одним правилом** на весь UI: рядок без зони частина рушіїв читає як
 * локальний (зсув на кілька годин), а частина — як `Invalid Date`. Друга копія
 * цього розбору десь у списку показувала б інший час, ніж сортування, яке
 * читає той самий рядок.
 */
export function sqliteTimestamp(value: string): number {
  if (!value) return 0;
  const date = new Date(`${value.replace(" ", "T")}Z`);
  return Number.isNaN(date.getTime()) ? 0 : date.getTime();
}

/** Дата й час із колонки у вигляді, зрозумілому людині: «16.09.2026, 15:19». */
export function formatStamp(value: string): string {
  const time = sqliteTimestamp(value);
  if (!time) return value;
  return new Date(time).toLocaleString("uk-UA", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
