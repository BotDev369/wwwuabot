/**
 * Ополонка — те, що гра дає: смуги, дуга польоту й жереб.
 *
 * Ці правила не залежать від вовка, тож і перевіряються без партії: важливо
 * лише те, що смуга ніколи не буває поза полем, дуга має дві фази, а жереб
 * питають рівно тричі й у тому ж порядку, на який розрахована партія.
 *
 * @module web-platform-dev/src/pages/games/fishing-pond.test
 */

import { describe, expect, it } from "vitest";
import {
  BOOT_CHANCE,
  LANES,
  arcOf,
  cast,
  gapMs,
  laneOf,
  lanePercent,
  type ItemKind,
} from "./fishing-pond";

/** Жереб із наперед відомою відповіддю: скрипт замість `Math.random`. */
function scripted(values: readonly number[]): () => number {
  let at = 0;
  return () => {
    const value = values[Math.min(at, values.length - 1)] ?? 0;
    at += 1;
    return value;
  };
}

describe("смуги", () => {
  it("ведро ловить найближчою смугою, а не будь-якою", () => {
    expect(laneOf(1.4)).toBe(1);
    expect(laneOf(1.6)).toBe(2);
  });

  it("дробова позиція за межами поля не виводить за смуги", () => {
    expect(laneOf(-3)).toBe(0);
    expect(laneOf(LANES + 3)).toBe(LANES - 1);
  });

  it("адреса смуги на екрані — її середина", () => {
    expect(lanePercent(0)).toBe(12.5);
    expect(lanePercent(LANES - 1)).toBe(87.5);
    // Сусідні смуги стоять рівно: 100% / LANES
    expect(lanePercent(1) - lanePercent(0)).toBe(100 / LANES);
  });
});

describe("дуга польоту", () => {
  it("починається й кінчається у воді, а на середині — вершина", () => {
    expect(arcOf(0)).toBe(0);
    expect(arcOf(1)).toBe(0);
    expect(arcOf(0.5)).toBe(1);
  });

  it("симетрична: угору й униз риба проходить ту саму висоту", () => {
    expect(arcOf(0.25)).toBeCloseTo(arcOf(0.75), 10);
    expect(arcOf(0.25)).toBeLessThan(arcOf(0.5));
  });

  it("частка за межами не ламає висоту", () => {
    expect(arcOf(-1)).toBe(0);
    expect(arcOf(2)).toBe(0);
  });
});

describe("жереб", () => {
  it("смуга береться з першого питання, вид — з другого", () => {
    const result = cast(1, 7, scripted([0.6, 0.9, 0.5]));

    expect(result.leap.lane).toBe(Math.floor(0.6 * LANES));
    expect(result.leap.kind).toBe("fish");
    expect(result.leap.id).toBe(7);
    expect(result.leap.air).toBe(0);
  });

  it("усе, що нижче за `BOOT_CHANCE`, — чобіт", () => {
    const boot: ItemKind = cast(1, 1, scripted([0, BOOT_CHANCE / 2, 0.5])).leap.kind;
    const fish: ItemKind = cast(1, 1, scripted([0, BOOT_CHANCE, 0.5])).leap.kind;

    expect(boot).toBe("boot");
    expect(fish).toBe("fish");
  });

  it("одиниця від жереба не виводить смугу за поле", () => {
    expect(cast(1, 1, scripted([1, 0.9, 1])).leap.lane).toBe(LANES - 1);
  });

  it("пауза хитається навколо рівня — рівний ритм вивчився б напамʼять", () => {
    const early = cast(1, 1, scripted([0, 0.9, 0])).nextIn;
    const late = cast(1, 1, scripted([0, 0.9, 1])).nextIn;

    expect(early).toBe(gapMs(1) * 0.75);
    expect(late).toBe(gapMs(1) * 1.25);
    expect(early).toBeLessThan(late);
  });

  it("рівень скорочує паузу між стрибками", () => {
    expect(gapMs(2)).toBeLessThan(gapMs(1));
  });
});
