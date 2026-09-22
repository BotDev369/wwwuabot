/**
 * Правила «Веселої рибалки» — партія: вовк, ведро, життя, рівень.
 *
 * Партія йде **кадрами**, тож кожне рішення («упіймав», «утекла», «новий
 * рівень») приходить тоді, коли предмет дійшов до води: помилка тут не ламає ні
 * збірку, ні вигляд — вона тихо міняє гру. Що дає вода — `fishing-pond.test.ts`.
 *
 * @module web-platform-dev/src/pages/games/fishing.test
 */

import { describe, expect, it } from "vitest";
import {
  FISH_PER_LEVEL,
  MAX_LEVEL,
  START_LIVES,
  leapMs,
  moveTo,
  startFishing,
  step,
  tick,
  walkMs,
  type FishingState,
} from "./fishing";
import { LANES, type Leap } from "./fishing-pond";

/** Жереб із наперед відомою відповіддю: скрипт замість `Math.random`. */
function scripted(values: readonly number[]): () => number {
  let at = 0;
  return () => {
    const value = values[Math.min(at, values.length - 1)] ?? 0;
    at += 1;
    return value;
  };
}

/** Предмет уже на підльоті: `air` близько 1 — щоб один крок його завершив. */
function nearWater(leap: Partial<Leap> & { lane: number }): Leap {
  return { id: 1, kind: "fish", air: 0.99, ...leap };
}

/** Партія з одним предметом у повітрі й вовком на заданій смузі. */
function board(leap: Leap, wolf: number): FishingState {
  return { ...startFishing(), wolf, target: wolf, leaps: [leap] };
}

/** Крок, який гарантовано доводить предмет до води (і не кличе нового). */
function land(state: FishingState, random: () => number = scripted([0])) {
  return tick(state, leapMs(state.level) / 2, random);
}

/** Накопичені риби на вході в рівень — щоб перевіряти ріст і його межу. */
function withCaught(fish: number, level = 1): FishingState {
  return { ...board(nearWater({ lane: 0 }), 0), caught: fish, level };
}

describe("початкова партія", () => {
  it("вовк посередині, ведро порожнє, життів три", () => {
    const state = startFishing();
    expect(state).toMatchObject({ lives: START_LIVES, score: 0, level: 1, over: false, leaps: [] });
    expect(state.wolf).toBe(Math.floor(LANES / 2));
  });
});

describe("вовк іде, а не стрибає", () => {
  it("дотик по далекій смузі лише ставить ціль", () => {
    const state = moveTo(startFishing(), LANES - 1);
    expect(state.target).toBe(LANES - 1);
    expect(state.wolf).toBe(Math.floor(LANES / 2));
  });

  it("за кадр — частина смуги, смуга за `walkMs`, а за ціллю вовк не їде далі", () => {
    const state = moveTo(startFishing(), 0);
    const part = tick(state, 40, scripted([1])).state;
    expect(part.wolf).toBeGreaterThan(0);
    expect(part.wolf).toBeLessThan(state.wolf);

    const one = tick(state, walkMs(1), scripted([1])).state;
    expect(one.wolf).toBe(state.wolf - 1);
    const two = tick(one, walkMs(1) * 2, scripted([1])).state;
    expect(two.wolf).toBe(0);
    expect(tick(two, walkMs(1), scripted([1])).state.wolf).toBe(0);
  });

  it("стрілки ведуть ціль, а не вовка, і не виходять за смуги", () => {
    expect(step(startFishing(), 1).target).toBe(Math.floor(LANES / 2) + 1);
    expect(step({ ...startFishing(), target: LANES - 1 }, 1).target).toBe(LANES - 1);
    expect(step({ ...startFishing(), target: 0 }, -1).target).toBe(0);
    // Та сама ціль не народжує нового стану — інакше екран малювався б дарма
    const same = startFishing();
    expect(moveTo(same, same.target)).toBe(same);
  });
});

describe("зустріч із водою", () => {
  it("риба в смузі ведра — спіймана", () => {
    const result = land(board(nearWater({ lane: 2 }), 2));

    expect(result.state.score).toBe(1);
    expect(result.state.caught).toBe(1);
    expect(result.state.lives).toBe(START_LIVES);
    expect(result.state.leaps).toEqual([]);
    expect(result.events).toContainEqual({ type: "caught", kind: "fish", lane: 2, points: 1 });
  });

  it("риба в чужій смузі — утекла, і це коштує життя", () => {
    const result = land(board(nearWater({ lane: 0 }), 3));

    expect(result.state.lives).toBe(START_LIVES - 1);
    expect(result.state.score).toBe(0);
    expect(result.events).toContainEqual({ type: "missed", lane: 0 });
  });

  it("чобіт у ведрі — втрата без очок, а повз ведро — нічого", () => {
    const caught = land(board(nearWater({ lane: 1, kind: "boot" }), 1));
    expect(caught.state.lives).toBe(START_LIVES - 1);
    expect(caught.state.score).toBe(0);
    expect(caught.state.caught).toBe(0);
    expect(caught.events).toContainEqual({ type: "caught", kind: "boot", lane: 1, points: 0 });

    const missed = land(board(nearWater({ lane: 1, kind: "boot" }), 3));
    expect(missed.state.lives).toBe(START_LIVES);
    expect(missed.events).toEqual([]);
  });

  it("предмет у польоті не вирішується на середині дуги", () => {
    const result = land(board(nearWater({ lane: 2, air: 0.3 }), 2));

    expect(result.state.score).toBe(0);
    expect(result.state.leaps).toHaveLength(1);
    expect(result.events).toEqual([]);
  });

  it("риба, що впала, поки вовк ішов, — промах: ведро вже зійшло з тієї смуги", () => {
    const walking: FishingState = { ...board(nearWater({ lane: 2 }), 2), target: 0 };
    const events = tick(walking, leapMs(1) / 2, scripted([0])).events;

    expect(events).toContainEqual({ type: "missed", lane: 2 });
  });
});

describe("рівні", () => {
  it("пʼята риба дає рівень, шоста — ще ні: обидві події одного кроку", () => {
    const fifth = land(withCaught(FISH_PER_LEVEL - 1));
    expect(fifth.state.caught).toBe(FISH_PER_LEVEL);
    expect(fifth.state.level).toBe(2);
    expect(fifth.events.map((event) => event.type)).toEqual(["caught", "level"]);

    const sixth = land(withCaught(FISH_PER_LEVEL, 2));
    expect(sixth.state.level).toBe(2);
    expect(sixth.events.map((event) => event.type)).toEqual(["caught"]);
  });

  it("вище за `MAX_LEVEL` рівень не росте: далі швидкість перестає читатись", () => {
    const capped = land(withCaught(FISH_PER_LEVEL * MAX_LEVEL, MAX_LEVEL));

    expect(capped.state.level).toBe(MAX_LEVEL);
    expect(capped.events.map((event) => event.type)).toEqual(["caught"]);
  });

  it("рівень робить усе швидшим — інакше він би нічого не значив", () => {
    expect(leapMs(2)).toBeLessThan(leapMs(1));
    expect(walkMs(2)).toBeLessThan(walkMs(1));
  });
});

describe("кінець партії", () => {
  it("на нулі життів партія скінчена, і ополонка порожня", () => {
    const state = land({ ...board(nearWater({ lane: 3 }), 0), lives: 1 }).state;

    expect(state.lives).toBe(0);
    expect(state.over).toBe(true);
    expect(state.leaps).toEqual([]);
  });

  it("у скінченій партії час нічого не міняє, і нульовий кадр — не кадр", () => {
    const over: FishingState = { ...startFishing(), over: true, lives: 0 };
    const frozen = tick(over, 500, scripted([0.5]));
    expect(frozen.state).toBe(over);
    expect(frozen.events).toEqual([]);

    const fresh = startFishing();
    expect(tick(fresh, 0, scripted([0.5])).state).toBe(fresh);
  });
});

describe("жереб у партії", () => {
  it("нова риба приходить у вибрану смугу, а кожен стрибок дістає власний номер", () => {
    const idle: FishingState = { ...startFishing(), nextIn: 10, leaps: [] };
    // Три питання жереба: смуга → вид → пауза
    const first = tick(idle, 20, scripted([0.6, 0.9, 0.5])).state;
    expect(first.leaps[0]?.lane).toBe(Math.floor(0.6 * LANES));
    expect(first.leaps[0]?.kind).toBe("fish");

    const again = tick({ ...first, nextIn: 0 }, 1, scripted([0.25, 0.9, 1])).state;
    expect(again.leaps.map((leap) => leap.id)).toEqual([1, 2]);
    expect(again.nextId).toBe(3);
  });
});
