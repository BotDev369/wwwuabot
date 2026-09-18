/**
 * Групування списку «за днями» — спільне правило для будь-якої колекції.
 *
 * Межі груп рахуються від **опівночі локального дня**, а не від «N діб тому»:
 * нотатка, змінена о 23:50, і нотатка, змінена о 00:10, лежать у різних днях —
 * і саме так їх читає око. Через це «вчора» не залежить від часу доби, коли
 * людина відкрила список.
 *
 * `now` — аргумент, а не `new Date()` усередині: інакше «Сьогодні» залежало б
 * від моменту виклику, і перевірити це тестом було б неможливо.
 *
 * @module @wwwuabot/ui/collection
 */

const DAY_MS = 86_400_000;

/** Групи «за днями», у сталому порядку — найсвіжіші згори. */
export const DAY_BUCKETS: readonly { key: string; label: string }[] = [
  { key: "today", label: "Сьогодні" },
  { key: "yesterday", label: "Вчора" },
  { key: "week", label: "Раніше цього тижня" },
  { key: "month", label: "Раніше цього місяця" },
  { key: "older", label: "Давніше" },
];

/** Опівніч **локального** дня — щоб межі груп не залежали від часу доби. */
export function startOfDay(time: number): number {
  const date = new Date(time);
  date.setHours(0, 0, 0, 0);
  return date.getTime();
}

/** Яка з груп-днів підходить часові. Рахуємо від опівночі, а не від «N діб». */
export function dayBucket(time: number, now: number): string {
  const days = Math.round((startOfDay(now) - startOfDay(time)) / DAY_MS);
  if (days <= 0) return "today";
  if (days === 1) return "yesterday";
  if (days < 7) return "week";
  if (days < 30) return "month";
  return "older";
}
