/**
 * Правила «Ну, погоди!» — партія: вовк, кошик, життя, рівень.
 *
 * Партія йде **кадрами**, тож кожне рішення («упіймав», «розбилось», «новий
 * рівень») приходить тоді, коли яйце дійшло до кошика: помилка тут не ламає ні
 * збірку, ні вигляд — вона тихо міняє гру. Що дає курник — `henhouse.test.ts`.
 *
 * @module web-platform-dev/src/pages/games/nupogodi.test
 */

import { describe, expect, it } from "vitest";
import { LANES, fallMs, type Egg } from "./henhouse";
import {
  EGGS_PER_LEVEL,
  EGG_POINTS,
  MAX_LEVEL,
  START_LIVES,
  moveTo,
  startNupogodi,
  step,
  tick,
  walkMs,
  type NupogodiState,
} from "./nupogodi";

/** Жереб із наперед відомою відповіддю: скрипт замість `Math.random`. */
function scripted(values: readonly number[]): () => number {
  let at = 0;
  return () => {
    const value = values[Math.min(at, values.length - 1)] ?? 0;
    at += 1;
    return value;
  };
}

/** Яйце вже на підльоті: `drop` близько 1 — щоб один крок його завершив. */
function nearBasket(egg: Partial<Egg> & { lane: number }): Egg {
  return { id: 1, drop: 0.99, ...egg };
}

/** Партія з одним яйцем на доріжці й вовком на заданій. */
function board(egg: Egg, wolf: number): NupogodiState {
  return { ...startNupogodi(), wolf, target: wolf, eggs: [egg] };
}

/** Крок, який гарантовано доводить яйце до кошика (і не кличе нового). */
function land(state: NupogodiState, random: () => number = scripted([0])) {
  return tick(state, fallMs(state.level) / 2, random);
}

/** Накопичені яйця на вході в рівень — щоб перевіряти ріст і його межу. */
function withCaught(eggs: number, level = 1): NupogodiState {
  return { ...board(nearBasket({ lane: 0 }), 0), caught: eggs, level };
}

describe("початкова партія", () => {
  it("вовк посередині, кошик порожній, життів три", () => {
    const state = startNupogodi();
    expect(state).toMatchObject({ lives: START_LIVES, score: 0, level: 1, over: false, eggs: [] });
    expect(state.wolf).toBe(Math.floor(LANES / 2));
  });
});

describe("вовк іде, а не стрибає", () => {
  it("дотик по далекій доріжці лише ставить ціль", () => {
    const state = moveTo(startNupogodi(), LANES - 1);
    expect(state.target).toBe(LANES - 1);
    expect(state.wolf).toBe(Math.floor(LANES / 2));
  });

  it("за кадр — частина доріжки, доріжка за `walkMs`, а за ціллю вовк не їде далі", () => {
    const state = moveTo(startNupogodi(), 0);
    const part = tick(state, 40, scripted([1])).state;
    expect(part.wolf).toBeGreaterThan(0);
    expect(part.wolf).toBeLessThan(state.wolf);

    const one = tick(state, walkMs(1), scripted([1])).state;
    expect(one.wolf).toBe(state.wolf - 1);
    const two = tick(one, walkMs(1) * 2, scripted([1])).state;
    expect(two.wolf).toBe(0);
    expect(tick(two, walkMs(1), scripted([1])).state.wolf).toBe(0);
  });

  it("стрілки ведуть ціль, а не вовка, і не виходять за доріжки", () => {
    expect(step(startNupogodi(), 1).target).toBe(Math.floor(LANES / 2) + 1);
    expect(step({ ...startNupogodi(), target: LANES - 1 }, 1).target).toBe(LANES - 1);
    expect(step({ ...startNupogodi(), target: 0 }, -1).target).toBe(0);
    // Та сама ціль не народжує нового стану — інакше екран малювався б дарма
    const same = startNupogodi();
    expect(moveTo(same, same.target)).toBe(same);
  });
});

describe("яйце й кошик", () => {
  it("яйце в доріжці кошика — спіймане", () => {
    const result = land(board(nearBasket({ lane: 2 }), 2));

    expect(result.state.score).toBe(EGG_POINTS);
    expect(result.state.caught).toBe(1);
    expect(result.state.lives).toBe(START_LIVES);
    expect(result.state.eggs).toEqual([]);
    expect(result.events).toContainEqual({ type: "caught", lane: 2, points: EGG_POINTS });
  });

  it("яйце в чужій доріжці — розбилось, і це коштує життя", () => {
    const result = land(board(nearBasket({ lane: 0 }), 3));

    expect(result.state.lives).toBe(START_LIVES - 1);
    expect(result.state.score).toBe(0);
    expect(result.events).toContainEqual({ type: "missed", lane: 0 });
  });

  it("яйце на середині шляху не вирішується", () => {
    const result = land(board(nearBasket({ lane: 2, drop: 0.3 }), 2));

    expect(result.state.score).toBe(0);
    expect(result.state.eggs).toHaveLength(1);
    expect(result.events).toEqual([]);
  });

  it("яйце, що докотилось, поки вовк ішов, — промах: кошик уже зійшов з тієї доріжки", () => {
    const walking: NupogodiState = { ...board(nearBasket({ lane: 2 }), 2), target: 0 };
    const events = tick(walking, fallMs(1) / 2, scripted([0])).events;

    expect(events).toContainEqual({ type: "missed", lane: 2 });
  });
});

describe("рівні", () => {
  it("пʼяте яйце дає рівень, шосте — ще ні: обидві події одного кроку", () => {
    const fifth = land(withCaught(EGGS_PER_LEVEL - 1));
    expect(fifth.state.caught).toBe(EGGS_PER_LEVEL);
    expect(fifth.state.level).toBe(2);
    expect(fifth.events.map((event) => event.type)).toEqual(["caught", "level"]);

    const sixth = land(withCaught(EGGS_PER_LEVEL, 2));
    expect(sixth.state.level).toBe(2);
    expect(sixth.events.map((event) => event.type)).toEqual(["caught"]);
  });

  it("вище за `MAX_LEVEL` рівень не росте: далі швидкість перестає читатись", () => {
    const capped = land(withCaught(EGGS_PER_LEVEL * MAX_LEVEL, MAX_LEVEL));

    expect(capped.state.level).toBe(MAX_LEVEL);
    expect(capped.events.map((event) => event.type)).toEqual(["caught"]);
  });

  it("рівень робить усе швидшим — інакше він би нічого не значив", () => {
    expect(fallMs(2)).toBeLessThan(fallMs(1));
    expect(walkMs(2)).toBeLessThan(walkMs(1));
    // Хід мусить лишатись можливим: три доріжки встигають, поки яйце котиться
    expect(3 * walkMs(MAX_LEVEL)).toBeLessThan(fallMs(MAX_LEVEL));
  });
});

describe("кінець партії", () => {
  it("на нулі життів партія скінчена, і курник порожній", () => {
    const state = land({ ...board(nearBasket({ lane: 3 }), 0), lives: 1 }).state;

    expect(state.lives).toBe(0);
    expect(state.over).toBe(true);
    expect(state.eggs).toEqual([]);
  });

  it("у скінченій партії час нічого не міняє, і нульовий кадр — не кадр", () => {
    const over: NupogodiState = { ...startNupogodi(), over: true, lives: 0 };
    const frozen = tick(over, 500, scripted([0.5]));
    expect(frozen.state).toBe(over);
    expect(frozen.events).toEqual([]);

    const fresh = startNupogodi();
    expect(tick(fresh, 0, scripted([0.5])).state).toBe(fresh);
  });
});

describe("жереб у партії", () => {
  it("нове яйце приходить у вибрану доріжку, а кожне дістає власний номер", () => {
    const idle: NupogodiState = { ...startNupogodi(), nextIn: 10, eggs: [] };
    // Два питання жереба: доріжка → пауза
    const first = tick(idle, 20, scripted([0.6, 0.5])).state;
    expect(first.eggs[0]?.lane).toBe(Math.floor(0.6 * LANES));

    const again = tick({ ...first, nextIn: 0 }, 1, scripted([0.25, 1])).state;
    expect(again.eggs.map((egg) => egg.id)).toEqual([1, 2]);
    expect(again.nextId).toBe(3);
  });
});
