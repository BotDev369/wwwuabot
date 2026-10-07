/**
 * Підпис над таблицею аналізу: значення приходить із `props.title` рядка
 * контенту, але назви попередніх кроків лишаються в `page_data` рядків,
 * створених раніше, а міграцію в дев-базі запускає людина — тож нормалізація тут,
 * і свій підпис людини при цьому лишається недоторканим.
 *
 * @module packages/ui/src/blocks/mydate/screen-title
 */

const TITLES = {
  analysis: {
    fallback: "Результат аналізу:",
    legacy: [
      "Аналіз Дат",
      "Аналіз дати",
      "Аналіз за датою народження",
      "Порівняння дат",
      "Порівняння за датами",
      "Співставлення дат",
    ],
  },
} as const;

export type MydateScreenTitle = keyof typeof TITLES;

export function mydateTitle(screen: MydateScreenTitle, raw: string | undefined): string {
  const title = raw?.trim() ?? "";
  const { fallback, legacy } = TITLES[screen];
  if (!title || (legacy as readonly string[]).includes(title)) return fallback;
  return title;
}
