/**
 * Доказ, що злиття шардів рахує те саме, що рахував би один прогін: локації
 * обʼєднуються, влучання додаються, а рядок без влучань не зникає зі
 * знаменника. Останнє — не теорія: саме так зливач і помилився першого разу,
 * і підлога покриття почала б бачити кращий відсоток, ніж є.
 *
 * @module scripts/lib/coverage-merge.test
 */

import { describe, expect, it } from "vitest";
import { locKey, mergeShards, percent } from "./coverage-merge.mjs";

/** Локація рядка у формі v8-to-istanbul: кінець без колонки. */
const loc = (line: number) => ({ start: { line, column: 0 }, end: { line, column: null } });

/** Один файл у форматі `coverage-final.json`: рядок `i` — це стейтмент `i`. */
function file(statements: number[], branches: number[][], fns: number[]) {
  const statementMap: Record<string, unknown> = {};
  const s: Record<string, number> = {};
  statements.forEach((hits, index) => {
    statementMap[String(index)] = loc(index + 1);
    s[String(index)] = hits;
  });
  const branchMap: Record<string, unknown> = {};
  const b: Record<string, number[]> = {};
  branches.forEach((hits, index) => {
    branchMap[String(index)] = { locations: [loc(1), loc(1)] };
    b[String(index)] = hits;
  });
  const fnMap: Record<string, unknown> = {};
  const f: Record<string, number> = {};
  fns.forEach((hits, index) => {
    fnMap[String(index)] = { loc: loc(1), decl: loc(1) };
    f[String(index)] = hits;
  });
  return { statementMap, s, branchMap, b, fnMap, f };
}

const A = "/repo/src/a.ts";
const B = "/repo/src/b.ts";

describe("mergeShards", () => {
  it("рядок без влучань лишається в знаменнику", () => {
    const summary = mergeShards([
      { [A]: file([1, 0, 0], [], []) },
      { [A]: file([0, 2, 0], [], []) },
    ]);
    // Три рядки, покриті два: якби непокриті губились, було б 2/2 = 100%.
    expect(summary[A].lines).toEqual({ total: 3, covered: 2, skipped: 0, pct: 66.66 });
    expect(summary[A].statements).toEqual({ total: 3, covered: 2, skipped: 0, pct: 66.66 });
  });

  it("та сама локація з двох шардів не подвоює знаменник", () => {
    const summary = mergeShards([{ [A]: file([1, 1], [], []) }, { [A]: file([5, 0], [], []) }]);
    expect(summary[A].statements).toEqual({ total: 2, covered: 2, skipped: 0, pct: 100 });
  });

  it("файл з одного шарда не губиться", () => {
    const summary = mergeShards([{ [A]: file([1], [], []) }, { [B]: file([0, 1], [], []) }]);
    expect(Object.keys(summary)).toEqual([A, B, "total"]);
    expect(summary[B].lines.total).toBe(2);
  });

  it("гілки рахуються по кожній локації, а не по блоці", () => {
    const summary = mergeShards([
      { [A]: file([1], [[1, 0]], []) },
      { [A]: file([1], [[0, 1]], []) },
    ]);
    expect(summary[A].branches).toEqual({ total: 2, covered: 2, skipped: 0, pct: 100 });
  });

  it("функції додаються за локацією", () => {
    const summary = mergeShards([{ [A]: file([1], [], [0]) }, { [A]: file([1], [], [3]) }]);
    expect(summary[A].functions).toEqual({ total: 1, covered: 1, skipped: 0, pct: 100 });
  });

  it("total — сума по файлах, а не середнє", () => {
    const summary = mergeShards([{ [A]: file([1, 1, 1, 1], [], []), [B]: file([0, 0], [], []) }]);
    expect(summary.total.statements).toEqual({ total: 6, covered: 4, skipped: 0, pct: 66.66 });
    expect(summary.total.branchesTrue).toEqual({ total: 0, covered: 0, skipped: 0, pct: 100 });
  });
});

describe("дрібні правила istanbul", () => {
  it("відсоток відсікається, а не округлюється", () => {
    // 14429/17628 = 81.8556…; у звіті vitest — 81.85, а не 81.86.
    expect(percent(14429, 17628)).toBe(81.85);
    expect(percent(0, 0)).toBe(100);
  });

  it("ключ локації не залежить від порядку стейтментів", () => {
    expect(locKey(loc(7))).toBe("7:0:7:null");
  });
});
