/**
 * Курник — те, що гра дає: доріжки, шлях яйця й жереб.
 *
 * Ці правила не залежать від вовка, тож і перевіряються без партії: важливо
 * лише те, що доріжка ніколи не буває поза полем, шлях яйця має початок і
 * кінець, а жереб питають рівно двічі й у тому ж порядку, на який розрахована
 * партія.
 *
 * @module web-platform-dev/src/pages/games/henhouse.test
 */

import { describe, expect, it } from "vitest";
import { LANES, dropPercent, fallMs, gapMs, laneOf, lanePercent, lay } from "./henhouse";

/** Жереб із наперед відомою відповіддю: скрипт замість `Math.random`. */
function scripted(values: readonly number[]): () => number {
  let at = 0;
  return () => {
    const value = values[Math.min(at, values.length - 1)] ?? 0;
    at += 1;
    return value;
  };
}

describe("доріжки", () => {
  it("кошик ловить найближчою доріжкою, а не будь-якою", () => {
    expect(laneOf(1.4)).toBe(1);
    expect(laneOf(1.6)).toBe(2);
  });

  it("дробова позиція за межами поля не виводить за доріжки", () => {
    expect(laneOf(-3)).toBe(0);
    expect(laneOf(LANES + 3)).toBe(LANES - 1);
  });

  it("адреса доріжки на екрані — її середина", () => {
    expect(lanePercent(0)).toBe(12.5);
    expect(lanePercent(LANES - 1)).toBe(87.5);
    // Сусідні доріжки стоять рівно: 100% / LANES
    expect(lanePercent(1) - lanePercent(0)).toBe(100 / LANES);
  });
});

describe("шлях яйця", () => {
  it("0 — під куркою, 1 — у кошику, і нічого за межами", () => {
    expect(dropPercent(0)).toBe(0);
    expect(dropPercent(0.5)).toBe(50);
    expect(dropPercent(1)).toBe(100);
  });

  it("частка поза шляхом не ламає висоту", () => {
    expect(dropPercent(-1)).toBe(0);
    expect(dropPercent(2)).toBe(100);
  });

  it("рівень скорочує шлях — інакше рівень би нічого не значив", () => {
    expect(fallMs(2)).toBeLessThan(fallMs(1));
  });
});

describe("жереб", () => {
  it("доріжка береться з першого питання, номер — з партії", () => {
    const result = lay(1, 7, scripted([0.6, 0.5]));

    expect(result.egg.lane).toBe(Math.floor(0.6 * LANES));
    expect(result.egg.id).toBe(7);
    expect(result.egg.drop).toBe(0);
  });

  it("одиниця від жереба не виводить доріжку за поле", () => {
    expect(lay(1, 1, scripted([1, 1])).egg.lane).toBe(LANES - 1);
  });

  it("пауза хитається навколо рівня — рівний ритм вивчився б напамʼять", () => {
    const early = lay(1, 1, scripted([0, 0])).nextIn;
    const late = lay(1, 1, scripted([0, 1])).nextIn;

    expect(early).toBe(gapMs(1) * 0.75);
    expect(late).toBe(gapMs(1) * 1.25);
    expect(early).toBeLessThan(late);
  });

  it("рівень скорочує паузу між яйцями", () => {
    expect(gapMs(2)).toBeLessThan(gapMs(1));
  });
});
