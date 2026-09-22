/**
 * Правила «Ну, погоди!» — партія: вовк, кошик, життя, рівень.
 *
 * **Гра йде в часі, а правило — ні.** `tick` дістає стан і відрізок часу й
 * повертає новий стан: таймерів і кадрів тут немає (вони в хуку), тож «яйце
 * розбилось» і «рівень виріс» перевіряються тестами без екрана.
 *
 * **Вовк іде, а не стрибає на місце.** Позиція вовка — **дробова** доріжка:
 * якби дотик телепортував кошик, партія звелась би до «торкнись, коли яйце
 * вже падає» — а це не гра. Хід — це коли його почати, тож місце треба
 * **передбачити**.
 *
 * **Промах коштує життя.** Яйце, що докотилось повз кошик, розбилось (у
 * класиці Електроніки промах завжди коштує), і саме тому в партії є кінець:
 * без нього це був би лічильник, а не партія.
 *
 * Що дає сам курник — доріжки, шлях яйця й жереб — живе в `henhouse.ts`:
 * там немає жодного рішення, яке залежить від ходу людини.
 *
 * @module web-platform-dev/src/pages/games/nupogodi
 */

import { FIRST_GAP_MS, LANES, fallMs, laneOf, lay, type Egg } from "./henhouse";

/** Три промахи — і кошик порожній: та сама ціна помилки, що в класиці. */
export const START_LIVES = 3;

/** Одне яйце — одне очко: рахунок тут лічильник, а не сума. */
export const EGG_POINTS = 1;

/** П'ять яєць — новий рівень, і разом із ним швидше все. */
export const EGGS_PER_LEVEL = 5;

/** П'ятий рівень останній: далі курки несуться швидше, ніж око читає екран. */
export const MAX_LEVEL = 5;

/**
 * Скільки вовк іде одну доріжку (мс).
 *
 * Рівень скорочує і це, і шлях яйця: коротший шлях вимагає ходити швидше, а
 * коротший крок — встигати. Числа узгоджені з `fallMs` (див. `henhouse.ts`).
 */
export function walkMs(level: number): number {
  return 240 - (level - 1) * 18;
}

export interface NupogodiState {
  /** Де вовк: дробова доріжка, бо він **іде**. */
  wolf: number;
  /** Куди йде: доріжка, яку вибрав гравець. */
  target: number;
  eggs: readonly Egg[];
  score: number;
  lives: number;
  /** Спіймані яйця за партію — з них рахується рівень. */
  caught: number;
  level: number;
  /** Скільки лишилось до наступного яйця, мс. */
  nextIn: number;
  nextId: number;
  over: boolean;
}

/** Те, що сталось за один крок часу — його показує екран. */
export type NupogodiEvent =
  | { type: "caught"; lane: number; points: number }
  | { type: "missed"; lane: number }
  | { type: "level"; level: number };

export interface NupogodiTick {
  state: NupogodiState;
  events: readonly NupogodiEvent[];
}

/** Партія з нуля: вовк посередині, кошик порожній. */
export function startNupogodi(): NupogodiState {
  const middle = Math.floor(LANES / 2);
  return {
    wolf: middle,
    target: middle,
    eggs: [],
    score: 0,
    lives: START_LIVES,
    caught: 0,
    level: 1,
    nextIn: FIRST_GAP_MS,
    nextId: 1,
    over: false,
  };
}

/** Вовк пішов у цю доріжку. Дотик замінює ціль, а не переносить вовка. */
export function moveTo(state: NupogodiState, lane: number): NupogodiState {
  if (state.over) return state;
  const target = Math.min(LANES - 1, Math.max(0, Math.round(lane)));
  if (target === state.target) return state;
  return { ...state, target };
}

/** Крок на доріжку — для стрілок: вони ведуть не вовка, а його ціль. */
export function step(state: NupogodiState, direction: -1 | 1): NupogodiState {
  return moveTo(state, Math.round(state.target) + direction);
}

/** Скільки доріжок вовк проходить за кадр — і чи вже дійшов. */
function walk(from: number, to: number, dtMs: number, perLaneMs: number): number {
  const delta = to - from;
  const stride = dtMs / perLaneMs;
  if (Math.abs(delta) <= stride) return to;
  return from + Math.sign(delta) * stride;
}

/**
 * Один крок часу: вовк іде, яйця котяться, підлога вирішує.
 *
 * За один виклик усе рухається рівно на `dtMs` — і саме тому порядок дій тут
 * важливий: спійманим вважається те яйце, що дійшло до кошика **після** кроку
 * вовка, а не до нього.
 */
export function tick(state: NupogodiState, dtMs: number, random: () => number): NupogodiTick {
  if (state.over || dtMs <= 0) return { state, events: [] };

  const events: NupogodiEvent[] = [];
  let { score, caught, level, nextIn, nextId } = state;
  let lives = state.lives;

  const wolf = walk(state.wolf, state.target, dtMs, walkMs(level));

  // Яйця котяться; хто дійшов до кошика — вирішується тут і один раз
  const rolled = dtMs / fallMs(level);
  const eggs: Egg[] = [];
  for (const egg of state.eggs) {
    const drop = egg.drop + rolled;
    if (drop < 1) {
      eggs.push({ ...egg, drop });
      continue;
    }

    if (laneOf(wolf) === egg.lane) {
      caught += 1;
      score += EGG_POINTS;
      events.push({ type: "caught", lane: egg.lane, points: EGG_POINTS });
    } else {
      lives -= 1;
      events.push({ type: "missed", lane: egg.lane });
    }
  }

  // Рівень росте разом зі спійманим, і про це каже подія: усе навколо стає
  // швидшим, а без слова це виглядало б як збій
  const grown = Math.min(MAX_LEVEL, 1 + Math.floor(caught / EGGS_PER_LEVEL));
  if (grown > level) {
    level = grown;
    events.push({ type: "level", level });
  }

  nextIn -= dtMs;
  if (nextIn <= 0) {
    const fresh = lay(level, nextId, random);
    eggs.push(fresh.egg);
    nextId += 1;
    nextIn = fresh.nextIn;
  }

  // Порожній курник — це кінець, а не пауза: яйце, завмерле на доріжці,
  // виглядало б як збій
  if (lives <= 0) lives = 0;
  const over = lives === 0;

  return {
    state: {
      ...state,
      wolf,
      eggs: over ? [] : eggs,
      score,
      lives,
      caught,
      level,
      nextIn,
      nextId,
      over,
    },
    events,
  };
}
