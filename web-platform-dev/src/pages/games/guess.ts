/**
 * Вгадай число — правила гри від 1 до 100.
 *
 * **Порівняння — окрема функція, а не `if` у компоненті.** «Більше / менше /
 * вгадав» — це правило гри, і саме його хочеться перевірити тестом: у
 * розмітці його видно лише очима, а помилка в знаку читається як «гра
 * зламалась».
 *
 * **Межі — тут, а не в полях вводу.** Дві копії діапазону (у підписі й у
 * перевірці) розійшлися б першою ж правкою; тому `GUESS_MIN` / `GUESS_MAX`
 * використовує і розмітка, і розбір.
 *
 * @module web-platform-dev/src/pages/games/guess
 */

export const GUESS_MIN = 1;
export const GUESS_MAX = 100;

export type GuessVerdict = "lower" | "higher" | "hit";

/** Загадане число. `random` — аргумент, щоб тест знав відповідь наперед. */
export function randomSecret(random: () => number = Math.random): number {
  return GUESS_MIN + Math.floor(random() * (GUESS_MAX - GUESS_MIN + 1));
}

/** Що казати після спроби: загадане менше, більше — чи це воно. */
export function verdict(secret: number, guess: number): GuessVerdict {
  if (guess === secret) return "hit";
  return guess > secret ? "lower" : "higher";
}

/**
 * Розібрати введене. `null` — не число або поза діапазоном: порожній рядок,
 * «50,5», «1000» і «абв» — це одна відповідь «спробуй іще», а не пʼять різних
 * помилок, які людині нічого не додають.
 */
export function parseGuess(raw: string): number | null {
  const value = Number(raw.trim());
  if (!Number.isInteger(value)) return null;
  if (value < GUESS_MIN || value > GUESS_MAX) return null;
  return value;
}
