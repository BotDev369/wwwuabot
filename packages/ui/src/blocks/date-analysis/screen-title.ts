/**
 * Підпис над досьє: значення приходить із `props.title` рядка контенту, але в
 * `page_data` рядків, створених раніше, лежать назви попередніх кроків — тож
 * нормалізація тут, і свій підпис людини при цьому лишається недоторканим.
 *
 * @module packages/ui/src/blocks/date-analysis/screen-title
 */

const TITLES = {
  analysis: {
    fallback: "Досьє:",
    legacy: [
      "Аналіз дат",
      "Аналіз Дат",
      "Аналіз дати",
      "Аналіз за датою народження",
      "Порівняння дат",
      "Порівняння за датами",
      "Співставлення дат",
      "Результат аналізу",
      "Результат аналізу:",
    ],
  },
} as const;

export type AnalysisScreenTitle = keyof typeof TITLES;

export function analysisScreenTitle(screen: AnalysisScreenTitle, raw: string | undefined): string {
  const title = raw?.trim() ?? "";
  const { fallback, legacy } = TITLES[screen];
  if (!title || (legacy as readonly string[]).includes(title)) return fallback;
  return title;
}
