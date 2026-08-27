/**
 * Форматує поточну дату (або передану) у формат SQLite YYYY-MM-DD HH:MM:SS.
 *
 * Використовується всюди, де потрібен timestamp для D1-колонок.
 */
export function formatSqliteDatetime(date?: Date): string {
  const d = date ?? new Date();
  return d.toISOString().replace("T", " ").slice(0, 19);
}
