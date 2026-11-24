/**
 * Тон розділу — один на весь продукт: плитка рядка на головній і графіка
 * верхівки екрана беруть голос із тієї самої таблиці. Це вигляд, а не дані:
 * реєстр несе назву, знак і адресу, колір лишається в коді.
 *
 * @module web-platform-dev/src/layout/screen-tone
 */

/** Голоси розділів: індекс — смуга палітри `--data-*`. */
const SECTION_TONES: Readonly<Record<string, number>> = {
  day: 3,
  analysis: 4,
  trackers: 2,
  notes: 6,
  shops: 1,
  orders: 5,
  favorites: 5,
  users: 2,
  messages: 4,
  contacts: 6,
  ads: 3,
  games: 5,
  research: 4,
  services: 6,
  account: 3,
  pages: 3,
};

/** Тон за ключем екрана або адресою: `analysis.hub.1` і `/analysis/hub/1` — один розділ. */
export function sectionTone(key: string): number {
  const root = key.replace(/^\/+/, "").split(/[./]/)[0];
  return SECTION_TONES[root] ?? 3;
}
