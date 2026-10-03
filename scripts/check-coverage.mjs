#!/usr/bin/env node
/**
 * Гейт покриття — щоб «покриття» означало число, а не «ми запустили тести».
 *
 * Без порога показник живуть у логу й не рухають ні одну рішення: він
 * завжди виглядає пристойно, поки не зменшиться на чверть. Тут він
 * порівнюється з підлогою, записаною в `scripts/coverage-baseline.mjs`, і
 * падає **в обидва боки**: і коли впало нижче, і коли зменшилося без
 * свідомого рішення.
 *
 * Рахуються лише рядки/гілки/функції з `vitest.config.ts` → `coverage.include`:
 * тести, типи й `dist` виключені там, інакше цифра була б красивою й
 * беззмістовною.
 *
 * Запуск: `npm run test:coverage && npm run check:coverage` (крок у CI).
 *
 * @module scripts/check-coverage
 */

import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { BASELINE } from "./coverage-baseline.mjs";

const SUMMARY = "coverage/coverage-summary.json";

if (!existsSync(SUMMARY)) {
  console.error(`✗ Немає ${SUMMARY}: спершу \`npm run test:coverage\`.`);
  process.exitCode = 1;
} else {
  const summary = JSON.parse(readFileSync(join(process.cwd(), SUMMARY), "utf8")).total;
  const errors = [];
  const lines = [];

  for (const [metric, floor] of Object.entries(BASELINE)) {
    const actual = Math.floor(summary[metric].pct);
    lines.push(`${metric}: ${actual}% (мінімум ${floor}%)`);
    if (actual < floor) {
      errors.push(
        `${metric}: ${actual}% < ${floor}% — покриття впало. або додай тест, або зупинися свідомо; ` +
          `підлогу можна підняти, але не опустити (scripts/coverage-baseline.mjs).`,
      );
    }
  }

  if (errors.length) {
    console.error("✗ Покриття впало нижче підлоги:\n");
    for (const e of errors) console.error(`  ${e}`);
    process.exitCode = 1;
  } else {
    console.log(`✓ Покриття: ${lines.join("; ")}.`);
  }
}
