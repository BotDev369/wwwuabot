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
 * Дві перевірки, і друга — головна:
 *
 *   1. підлога для всього коду (`BASELINE`) — вона падає, коли покриття
 *      просіло;
 *   2. підлога для **нового коду** (`NEW_CODE_SINCE` + `NEW_CODE_FLOOR`) — кожен
 *      файл, що змінився після цього коміту, мусить бути покритий. Загальна
 *      підлога цього не ловить: коли додають 200 рядків коду й один тест, середнє
 *      знижується на трохи — і ніхто це не бачить.
 *
 * Запуск: `npm run test:coverage && npm run check:coverage` (крок у CI).
 * Потрібна історія git: у CI крок `checks` робить checkout із `fetch-depth: 0`.
 *
 * @module scripts/check-coverage
 */

import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import {
  BASELINE,
  NEW_CODE_FLOOR,
  NEW_CODE_MIN_STATEMENTS,
  NEW_CODE_SINCE,
} from "./coverage-baseline.mjs";
import { ROOT } from "./lib/files.mjs";

const SUMMARY = "coverage/coverage-summary.json";

/**
 * Файли джерела, змінені після `since`: робоче дерево, індекс і `HEAD`.
 *
 * Береться саме `git diff <since>` (без `..HEAD`), щоб гейт бачив новий файл
 * ще до коміту, і окремо — непростежені файли, яких `git diff` не показує.
 */
function changedSince(since) {
  const git = (...args) =>
    execFileSync("git", args, { cwd: ROOT, encoding: "utf8", maxBuffer: 8 << 20 });
  let names;
  try {
    git("cat-file", "-e", `${since}^{commit}`);
  } catch {
    throw new Error(
      `Коміт ${since} не знайдено — гейт не знає, що вважати новим кодом. ` +
        `Перевір історію: у CI крок \`checks\` мусить робити checkout із fetch-depth: 0.`,
    );
  }
  names = git("diff", "--name-only", since).split("\n");
  names.push(...git("ls-files", "--others", "--exclude-standard").split("\n"));
  return [...new Set(names.filter(Boolean))];
}

/** Покриття одного файлу у відсотках; файл без рядків вважаємо повністю живим. */
const pct = (entry) =>
  entry.statements.total === 0
    ? 100
    : Math.floor((entry.statements.covered / entry.statements.total) * 100);

if (!existsSync(SUMMARY)) {
  console.error(`✗ Немає ${SUMMARY}: спершу \`npm run test:coverage\`.`);
  process.exitCode = 1;
} else {
  const report = JSON.parse(readFileSync(join(process.cwd(), SUMMARY), "utf8"));
  const summary = report.total;
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

  // Новий код: кожен файл після NEW_CODE_SINCE мусить бути покритий.
  let newCode;
  try {
    newCode = changedSince(NEW_CODE_SINCE);
  } catch (error) {
    console.error(`✗ ${error.message}`);
    process.exitCode = 1;
  }
  const newErrors = [];
  let counted = 0;
  if (newCode) {
    for (const file of newCode.sort()) {
      if (!/\.tsx?$/.test(file) || /\.(test|spec)\.tsx?$/.test(file)) continue;
      if (!existsSync(join(ROOT, file))) continue;
      const entry = report[join(ROOT, file)];
      if (!entry) {
        newErrors.push(
          `${file}: немає в звіті покриття — файл поза vitest.config.ts → coverage.include`,
        );
        continue;
      }
      if (entry.statements.total < NEW_CODE_MIN_STATEMENTS) continue;
      counted += 1;
      const actual = pct(entry);
      if (actual < NEW_CODE_FLOOR) {
        newErrors.push(
          `${file}: ${actual}% < ${NEW_CODE_FLOOR}% — новий код мусить прийти з тестом ` +
            `(або з аргументом, чому саме цей файл не варто тестувати).`,
        );
      }
    }
  }

  if (errors.length || newErrors.length) {
    if (errors.length) {
      console.error("✗ Покриття впало нижче підлоги:\n");
      for (const e of errors) console.error(`  ${e}`);
    }
    if (newErrors.length) {
      console.error(`\n✗ Новий код без покриття (після ${NEW_CODE_SINCE}):\n`);
      for (const e of newErrors) console.error(`  ${e}`);
    }
    process.exitCode = 1;
  } else {
    console.log(`✓ Покриття: ${lines.join("; ")}.`);
    if (counted)
      console.log(
        `  Новий код (після ${NEW_CODE_SINCE}): ${counted} файлів, усі ≥ ${NEW_CODE_FLOOR}%.`,
      );
  }
}
