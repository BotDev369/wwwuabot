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

/** Акценти розділів: саме цей колір фарбує шапку Telegram і верхівку. */
const SECTION_ACCENTS: Readonly<Record<string, string>> = {
  day: "#9c4a2a",
  analysis: "#4f4a8f",
  trackers: "#2f6b63",
  notes: "#46683f",
  shops: "#9c4f5c",
  orders: "#7a4460",
  favorites: "#8a4c68",
  users: "#3f6279",
  messages: "#4a5580",
  contacts: "#4f6a4c",
  ads: "#8a5236",
  games: "#7d4a72",
  research: "#47558a",
  services: "#3f6b58",
  account: "#7a5a3f",
  pages: "#7a5a3f",
};

/** Акцент за ключем екрана: у кожного екрана свій, у межах гами розділу. */
export function screenAccent(key: string): string {
  const root = key.replace(/^\/+/, "").split(/[./]/)[0];
  return SECTION_ACCENTS[root] ?? SECTION_ACCENTS.pages;
}

/** Зсув тону фото: обкладинка головної тепла (~25°), решта їде за акцентом. */
export function accentHue(accent: string): number {
  const value = accent.replace("#", "");
  const r = parseInt(value.slice(0, 2), 16) / 255;
  const g = parseInt(value.slice(2, 4), 16) / 255;
  const b = parseInt(value.slice(4, 6), 16) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const delta = max - min;
  if (delta === 0) return 0;
  let hue: number;
  if (max === r) hue = ((g - b) / delta) % 6;
  else if (max === g) hue = (b - r) / delta + 2;
  else hue = (r - g) / delta + 4;
  hue *= 60;
  if (hue < 0) hue += 360;
  return Math.round(hue - 25);
}

/** Тон за ключем екрана або адресою: `analysis.hub.1` і `/analysis/hub/1` — один розділ. */
export function sectionTone(key: string): number {
  const root = key.replace(/^\/+/, "").split(/[./]/)[0];
  return SECTION_TONES[root] ?? 3;
}
