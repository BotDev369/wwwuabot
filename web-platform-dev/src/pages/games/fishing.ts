/**
 * Правила «Веселої рибалки» — партія: вовк, ведро, життя, рівень.
 *
 * **Гра йде в часі, а правило — ні.** `tick` дістає стан і відрізок часу й
 * повертає новий стан: таймерів і кадрів тут немає (вони в хуку), тож «риба
 * втекла», «чобіт у ведрі» й «рівень виріс» перевіряються тестами без екрана.
 *
 * **Вовк іде, а не стрибає на місце.** Позиція вовка — **дробова** смуга: якби
 * дотик телепортував ведро, партія звелась би до «торкнись, коли риба вже
 * падає» — а це не рибалка. Хід — це коли його почати, тож місце треба
 * **передбачити**.
 *
 * **Промах риби коштує життя, промах чобота — ні.** Риба, що вернулась у
 * воду, втекла (у класиці Електроніки промах завжди коштує), а чобіт, якого
 * не спіймав, просто не заважав — карати за нього означало б карати за
 * правильну гру.
 *
 * Що дає сама вода — смуги, політ і жереб — живе в `fishing-pond.ts`: там
 * немає жодного рішення, яке залежить від ходу людини.
 *
 * @module web-platform-dev/src/pages/games/fishing
 */

import { FIRST_GAP_MS, LANES, cast, laneOf, type ItemKind, type Leap } from "./fishing-pond";

/** Три промахи — і ведро порожнє: та сама ціна помилки, що в класиці. */
export const START_LIVES = 3;

/** Одна рибина — одне очко: рахунок тут лічильник, а не сума. */
export const FISH_POINTS = 1;

/** П'ять риб — новий рівень, і разом із ним швидше все. */
export const FISH_PER_LEVEL = 5;

/** П'ятий рівень останній: далі риба летить швидше, ніж око читає екран. */
export const MAX_LEVEL = 5;

/**
 * Скільки предмет тримається в повітрі, а вовк іде одну смугу (мс).
 *
 * Рівень скорочує обидва: довший політ — довший час на хід, і саме це є
 * складність. Числа підібрані так, щоб на останньому рівні вовк усе ще
 * встигав перейти три смуги (3 × `walkMs` < `leapMs`).
 */
export function leapMs(level: number): number {
  return 1700 - (level - 1) * 180;
}

export function walkMs(level: number): number {
  return 240 - (level - 1) * 18;
}

export interface FishingState {
  /** Де вовк: дробова смуга, бо він **іде**. */
  wolf: number;
  /** Куди йде: смуга, яку вибрав гравець. */
  target: number;
  leaps: readonly Leap[];
  score: number;
  lives: number;
  /** Спіймані риби за партію — з них рахується рівень. */
  caught: number;
  level: number;
  /** Скільки лишилось до наступного стрибка, мс. */
  nextIn: number;
  nextId: number;
  over: boolean;
}

/** Те, що сталось за один крок часу — його показує екран. */
export type FishingEvent =
  | { type: "caught"; kind: ItemKind; lane: number; points: number }
  | { type: "missed"; lane: number }
  | { type: "level"; level: number };

export interface FishingTick {
  state: FishingState;
  events: readonly FishingEvent[];
}

/** Партія з нуля: вовк посередині, ведро порожнє. */
export function startFishing(): FishingState {
  const middle = Math.floor(LANES / 2);
  return {
    wolf: middle,
    target: middle,
    leaps: [],
    score: 0,
    lives: START_LIVES,
    caught: 0,
    level: 1,
    nextIn: FIRST_GAP_MS,
    nextId: 1,
    over: false,
  };
}

/** Вовк пішов у цю смугу. Дотик замінює ціль, а не переносить вовка. */
export function moveTo(state: FishingState, lane: number): FishingState {
  if (state.over) return state;
  const target = Math.min(LANES - 1, Math.max(0, Math.round(lane)));
  if (target === state.target) return state;
  return { ...state, target };
}

/** Крок на смугу — для стрілок: вони ведуть не вовка, а його ціль. */
export function step(state: FishingState, direction: -1 | 1): FishingState {
  return moveTo(state, Math.round(state.target) + direction);
}

/** Скільки смуг вовк проходить за кадр — і чи вже дійшов. */
function walk(from: number, to: number, dtMs: number, perLaneMs: number): number {
  const delta = to - from;
  const stride = dtMs / perLaneMs;
  if (Math.abs(delta) <= stride) return to;
  return from + Math.sign(delta) * stride;
}

/**
 * Один крок часу: вовк іде, предмети летять, вода вирішує.
 *
 * За один виклик усе рухається рівно на `dtMs` — і саме тому порядок дій тут
 * важливий: спійманим вважається той предмет, що дійшов до води **після**
 * кроку вовка, а не до нього.
 */
export function tick(state: FishingState, dtMs: number, random: () => number): FishingTick {
  if (state.over || dtMs <= 0) return { state, events: [] };

  const events: FishingEvent[] = [];
  let { score, caught, level, nextIn, nextId } = state;
  let lives = state.lives;

  const wolf = walk(state.wolf, state.target, dtMs, walkMs(level));

  // Предмети летять; хто дійшов до води — вирішується тут і один раз
  const flight = dtMs / leapMs(level);
  const leaps: Leap[] = [];
  for (const leap of state.leaps) {
    const air = leap.air + flight;
    if (air < 1) {
      leaps.push({ ...leap, air });
      continue;
    }

    const mine = laneOf(wolf) === leap.lane;
    if (mine && leap.kind === "fish") {
      caught += 1;
      score += FISH_POINTS;
      events.push({ type: "caught", kind: "fish", lane: leap.lane, points: FISH_POINTS });
    } else if (mine) {
      lives -= 1;
      events.push({ type: "caught", kind: "boot", lane: leap.lane, points: 0 });
    } else if (leap.kind === "fish") {
      lives -= 1;
      events.push({ type: "missed", lane: leap.lane });
    }
  }

  // Рівень росте разом зі спійманим, і про це каже подія: усе навколо стає
  // швидшим, а без слова це виглядало б як збій
  const grown = Math.min(MAX_LEVEL, 1 + Math.floor(caught / FISH_PER_LEVEL));
  if (grown > level) {
    level = grown;
    events.push({ type: "level", level });
  }

  nextIn -= dtMs;
  if (nextIn <= 0) {
    const fresh = cast(level, nextId, random);
    leaps.push(fresh.leap);
    nextId += 1;
    nextIn = fresh.nextIn;
  }

  // Ополонка лишається порожньою: завмерла в повітрі рибина на скінченій
  // партії виглядала б як збій, а не як кінець
  if (lives <= 0) lives = 0;
  const over = lives === 0;

  return {
    state: {
      ...state,
      wolf,
      leaps: over ? [] : leaps,
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
