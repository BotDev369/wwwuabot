/**
 * Читабельність палітри людини: AA як число, а не як надія.
 * Фіксований відсоток мішанини не буває правильним для будь-якого фону (на кремовому 48%
 * давали 2.8:1), тож відтінок тексту й статусу розв'язується під цей фон. `readablePalette()`
 * віддає те, що `applyColors()` ставить інлайном; CSS — фолбек без JS. Пороги — `docs/TOKENS.md`.
 *
 * @module packages/shared/src/styles/readable
 */

import { contrastRatio, isDarkColor, mixHex } from "./color";
import type { UserColors } from "./user-colors.types";

/** AA для звичайного тексту (WCAG 2.2, 1.4.3). */
export const AA_TEXT = 4.5;

/** AAA для звичайного тексту: його тримає другий рівень основного кольору. */
export const AAA_TEXT = 7;

/** Сходинки поверхонь із `user-colors.css`: екран, `--bg-2`, `--bg-3`, `--bg-4`. */
export const SURFACE_STEPS = [1, 0.95, 0.9, 0.86] as const;

/** Статусні кольори світлої й темної схеми — ті самі, що в `user-colors.css`. */
const STATUS_LIGHT = { green: "#16a34a", red: "#dc2626", yellow: "#ca8a04" } as const;
const STATUS_DARK = { green: "#4ade80", red: "#f87171", yellow: "#facc15" } as const;

/** Палітра, виведена з трьох кольорів людини, — у тому вигляді, як її ставить `applyColors`. */
export interface ReadablePalette {
  /** Другий рівень основного кольору (`--text-secondary`). */
  secondary: string;
  /** Підказка (`--text-muted`). */
  muted: string;
  /** Успіх (`--green`). */
  green: string;
  /** Небезпека (`--red`). */
  red: string;
  /** Попередження (`--yellow`). */
  yellow: string;
}

/** Усі поверхні, на яких стоїть текст: екран і підняті сходинки над ним. */
export function surfaceSteps(colors: UserColors): string[] {
  return SURFACE_STEPS.map((share) => mixHex(colors.bg, colors.text, share));
}

/** Найгірший контраст кольору з поверхнями — саме він вирішує, чи текст читається. */
function worstRatio(color: string, surfaces: readonly string[]): number {
  return Math.min(...surfaces.map((surface) => contrastRatio(color, surface)));
}

/**
 * Найслабший відтінок основного кольору, що ще тримає `target` на всіх поверхнях.
 * Спуск іде кроком 2%, а контраст падає монотонно, тож перший провал і є межа;
 * якщо не проходить навіть сам колір — повертаємо його, бо більше немає чого.
 */
export function dimmestReadable(colors: UserColors, target: number): string {
  const surfaces = surfaceSteps(colors);
  let best = colors.text;
  for (let share = 100; share >= 0; share -= 2) {
    const candidate = mixHex(colors.text, colors.bg, share / 100);
    if (worstRatio(candidate, surfaces) < target) break;
    best = candidate;
  }
  return best;
}

/**
 * Статусний колір, який читається на цьому фоні.
 *
 * Смисл кольору (зелений / червоний / жовтий) лишається, змінюється лише
 * світлота: на світлому фоні колір темнішає до чорного, на темному — світлішає
 * до білого. Це той самий відтінок, а не другий набір статусів.
 */
export function readableStatus(seed: string, colors: UserColors): string {
  const surfaces = surfaceSteps(colors);
  if (worstRatio(seed, surfaces) >= AA_TEXT) return seed;

  const pole = isDarkColor(colors.bg) ? "#ffffff" : "#000000";
  for (let share = 96; share >= 0; share -= 4) {
    const candidate = mixHex(seed, pole, share / 100);
    if (worstRatio(candidate, surfaces) >= AA_TEXT) return candidate;
  }
  return pole;
}

/**
 * Палітра людини з гарантією AA.
 *
 * Другий рівень цілиться в AAA: між основним і підказкою мусить бути видно
 * різницю, інакше «другорядний» і «приглушений» — це два однакові сірі.
 */
export function readablePalette(colors: UserColors): ReadablePalette {
  const surfaces = surfaceSteps(colors);
  const muted = dimmestReadable(colors, AA_TEXT);
  const strong = dimmestReadable(colors, AAA_TEXT);
  // Рівень не буває слабшим за підказку: інакше підказка читалась би краще.
  const secondary = worstRatio(strong, surfaces) > worstRatio(muted, surfaces) ? strong : muted;

  const seeds = isDarkColor(colors.bg) ? STATUS_DARK : STATUS_LIGHT;
  return {
    secondary,
    muted,
    green: readableStatus(seeds.green, colors),
    red: readableStatus(seeds.red, colors),
    yellow: readableStatus(seeds.yellow, colors),
  };
}
