/**
 * Час звернення — з рядка D1 у те, що читається на екрані.
 *
 * У базі час лежить у форматі SQLite (`YYYY-MM-DD HH:MM:SS`) і без зони: це
 * **UTC**. Ми не переписуємо те, що вже записано, — лише показуємо його так,
 * щоб порядок «новіше вище» лишався видимим, а точність до секунд панелі не
 * потрібна.
 *
 * @module web-admin-dev/src/pages/messages/formatWhen
 */

const FORMAT = new Intl.DateTimeFormat("uk-UA", {
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
});

/** «1 жовтня, 09:00». Нерозпізнаний рядок повертається як є — краще, ніж нічого. */
export function formatWhen(value: string): string {
  const date = new Date(`${value.replace(" ", "T")}Z`);
  if (Number.isNaN(date.getTime())) return value;
  return FORMAT.format(date);
}

/** Одним рядком у заголовку модалки: «1 жовтня, 09:00» + сирий UTC для `title`. */
export function whenTitle(value: string): string {
  return value ? `${formatWhen(value)} (UTC)` : "";
}
