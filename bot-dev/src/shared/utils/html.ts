/**
 * Екранування тексту для rich-розмітки: значення ззовні (тема коміта, код
 * помилки) інакше міняло б розмітку звіту своїми `<b>`.
 *
 * @module bot-dev/src/shared/utils/html
 */

const MAP: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
};

export function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (char) => MAP[char] ?? char);
}
