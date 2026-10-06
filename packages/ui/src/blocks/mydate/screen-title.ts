/**
 * Заголовки екранів mydate: змінений дефолт лишається в `page_data` рядків,
 * створених раніше, а міграцію в дев-базі запускає людина — тож нормалізація тут,
 * і свій підпис людини при цьому лишається недоторканим.
 *
 * @module packages/ui/src/blocks/mydate/screen-title
 */

const TITLES = {
  analysis: { fallback: "Аналіз дати", legacy: ["Аналіз за датою народження"] },
  compareTable: {
    fallback: "Порівняння дат",
    legacy: ["Співставлення дат", "Порівняння за датами"],
  },
} as const;

export type MydateScreenTitle = keyof typeof TITLES;

export function mydateTitle(screen: MydateScreenTitle, raw: string | undefined): string {
  const title = raw?.trim() ?? "";
  const { fallback, legacy } = TITLES[screen];
  if (!title || (legacy as readonly string[]).includes(title)) return fallback;
  return title;
}
