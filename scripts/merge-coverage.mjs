#!/usr/bin/env node
/**
 * CLI злиття покриття з шардів: читає `coverage-final.json` кожного шарда і
 * пише один `coverage/coverage-summary.json` — саме його читає `check:coverage`.
 *
 * Без цього кроку шардинг «проходив» би через те, що впав один шард: підсумок
 * був би від решти, і підлога цього не помітила б. Тому дві жорсткі умови:
 * кількість шардів дорівнює очікуваній (`SHARD_COUNT`), і кожен дав файли.
 *
 * Залежностей немає навмисно (лише `node:` і `./lib/*`): джоба злиття в CI іде
 * без `node_modules`, тож не платить ні `npm ci`, ні відновлення кешу.
 *
 * Запуск: `node scripts/merge-coverage.mjs [тека …]`
 * (типово — усе в `coverage/`, де лежить `coverage-final.json`).
 *
 * @module scripts/merge-coverage
 */

import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { mergeShards } from "./lib/coverage-merge.mjs";
import { ROOT } from "./lib/files.mjs";

const COVERAGE = join(ROOT, "coverage");
const SUMMARY = join(COVERAGE, "coverage-summary.json");
const FINAL = "coverage-final.json";

/**
 * Теки шардів: аргументи, а типово — усе в `coverage/`, де лежить
 * `coverage-final.json` (артефакт `coverage-shard-N` розпаковується саме так).
 */
function shardDirs() {
  const fromArgs = process.argv.slice(2);
  if (fromArgs.length > 0) return fromArgs;
  if (!existsSync(COVERAGE)) return [];
  return readdirSync(COVERAGE, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && existsSync(join(COVERAGE, entry.name, FINAL)))
    .map((entry) => entry.name)
    .sort()
    .map((name) => join(COVERAGE, name));
}

const dirs = shardDirs();
const expected = Number(process.env.SHARD_COUNT ?? 0);
if (dirs.length === 0) {
  console.error(`✗ Немає шардів покриття: ні аргументів, ні ${COVERAGE}/*/${FINAL}`);
  process.exit(1);
}
if (expected > 0 && dirs.length !== expected) {
  console.error(`✗ Шардів ${dirs.length}, а очікували ${expected}: звіт був би неповним.`);
  process.exit(1);
}

const shards = [];
for (const dir of dirs) {
  const path = join(dir, FINAL);
  if (!existsSync(path)) {
    console.error(`✗ Шард без ${FINAL}: ${dir}`);
    process.exit(1);
  }
  const data = JSON.parse(readFileSync(path, "utf8"));
  if (Object.keys(data).length === 0) {
    console.error(`✗ Порожній шард: ${dir}`);
    process.exit(1);
  }
  shards.push(data);
}

const summary = mergeShards(shards);
writeFileSync(SUMMARY, `${JSON.stringify(summary, null, 2)}\n`);
console.log(
  `✓ Покриття злито: шардів ${shards.length}, файлів ${Object.keys(summary).length - 1} → ${SUMMARY.slice(ROOT.length + 1)}`,
);
