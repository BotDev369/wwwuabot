/**
 * Формат часу нотатки — спільний для списку й перегляду.
 *
 * Час у `notes` лежить як UTC без позначки зони (`YYYY-MM-DD HH:MM:SS` —
 * формат `formatSqliteDatetime`). Тому розбір живе **одним** правилом: і
 * сортування, і показ дати мусять читати той самий рядок однаково, інакше
 * список сортувався б за одним часом, а показував інший.
 *
 * @module @wwwuabot/ui/notes
 */

/** Розбирає час із колонки в мілісекунди; невалідне значення — `0`. */
export function noteTimestamp(value: string): number {
  if (!value) return 0;
  // Пробіл → `T`, і явний `Z`: рядок без зони частина рушіїв читає як
  // локальний (зсув на кілька годин), а частина — як `Invalid Date`.
  const date = new Date(`${value.replace(" ", "T")}Z`);
  return Number.isNaN(date.getTime()) ? 0 : date.getTime();
}

/** Дата нотатки у вигляді, зрозумілому людині: «16.09.2026, 15:19». */
export function formatNoteStamp(value: string): string {
  const time = noteTimestamp(value);
  if (!time) return value;
  return new Date(time).toLocaleString("uk-UA", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
