/**
 * Злиття покриття з шардів — та сама математика, що в `istanbul-lib-coverage`,
 * яким рахує й сам vitest. Винесено з CLI, щоб мати тест: помилка тут тиха —
 * підлога покриття почала б пропускати непокритий код.
 *
 * Формат входу — `coverage-final.json` (istanbul): `statementMap`/`s`,
 * `fnMap`/`f`, `branchMap`/`b`. Вихід — обʼєкт `coverage-summary.json`.
 *
 * Правила обʼєднання: одна локація = один рядок звіту; влучання додаються,
 * тому «покрито» означає «покрито хоч одним шардом». Рядок без влучань теж
 * лишається в звіті — інакше він зник би з знаменника.
 *
 * @module scripts/lib/coverage-merge
 */

/** Так само, як `percent()` в istanbul: відсікання до двох знаків (81.8556 → 81.85). */
export const percent = (covered, total) =>
  total > 0 ? Math.floor((1e5 * covered) / total / 10) / 100 : 100;

/** Ключ локації: за ним збігаються стейтменти, функції й гілки між шардами. */
export const locKey = (loc) =>
  `${loc.start.line}:${loc.start.column}:${loc.end.line}:${loc.end.column}`;

const metric = (total, covered) => ({ total, covered, skipped: 0, pct: percent(covered, total) });

/** Накопичувач одного файлу: локація → сума влучань (рядок — максимум). */
const blank = () => ({
  statements: new Map(),
  functions: new Map(),
  branches: new Map(),
  lines: new Map(),
});

function absorb(acc, coverage) {
  for (const [key, loc] of Object.entries(coverage.statementMap)) {
    const hits = coverage.s[key] ?? 0;
    acc.statements.set(locKey(loc), (acc.statements.get(locKey(loc)) ?? 0) + hits);
    const line = loc.start.line;
    if (!acc.lines.has(line) || hits > acc.lines.get(line)) acc.lines.set(line, hits);
  }
  for (const [key, fn] of Object.entries(coverage.fnMap)) {
    const id = locKey(fn.loc ?? fn.decl);
    acc.functions.set(id, (acc.functions.get(id) ?? 0) + (coverage.f[key] ?? 0));
  }
  for (const [key, branch] of Object.entries(coverage.branchMap)) {
    const id = locKey(branch.locations[0]);
    const hits = coverage.b[key] ?? [];
    const prev = acc.branches.get(id) ?? hits.map(() => 0);
    acc.branches.set(
      id,
      prev.map((value, index) => value + (hits[index] ?? 0)),
    );
  }
}

/** Підсумок файлу в тій самій формі, що пише репортер `json-summary`. */
function summarise(acc) {
  const simple = (map) => metric(map.size, [...map.values()].filter((hits) => hits > 0).length);
  let branchTotal = 0;
  let branchCovered = 0;
  for (const hits of acc.branches.values()) {
    branchTotal += hits.length;
    branchCovered += hits.filter((value) => value > 0).length;
  }
  return {
    lines: simple(acc.lines),
    functions: simple(acc.functions),
    statements: simple(acc.statements),
    branches: metric(branchTotal, branchCovered),
  };
}

/**
 * Зводить шарди в один звіт. `total` — сума по файлах, як у
 * `CoverageMap.getCoverageSummary()`, а не середнє: інакше великий файл важив би
 * стільки ж, скільки маленький.
 */
export function mergeShards(shards) {
  const files = new Map();
  for (const shard of shards) {
    for (const [file, coverage] of Object.entries(shard)) {
      if (!files.has(file)) files.set(file, blank());
      absorb(files.get(file), coverage);
    }
  }

  const summary = {};
  const sum = { lines: 0, functions: 0, statements: 0, branches: 0 };
  const got = { lines: 0, functions: 0, statements: 0, branches: 0 };
  for (const [file, acc] of [...files].sort(([a], [b]) => a.localeCompare(b))) {
    const one = summarise(acc);
    summary[file] = one;
    for (const key of Object.keys(sum)) {
      sum[key] += one[key].total;
      got[key] += one[key].covered;
    }
  }

  summary.total = {
    lines: metric(sum.lines, got.lines),
    statements: metric(sum.statements, got.statements),
    functions: metric(sum.functions, got.functions),
    branches: metric(sum.branches, got.branches),
    branchesTrue: metric(0, 0),
  };
  return summary;
}
