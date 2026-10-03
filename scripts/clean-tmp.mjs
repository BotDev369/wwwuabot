#!/usr/bin/env node
/**
 * Прибирання кешу `vite-node` у `/tmp`.
 *
 * Кожен прогін vitest залишає в системній теці тимчасову каталог із
 * скомпільованими SSR-модулями, і **не прибирає її**. За кілька сотень прогонів
 * це десятки гігабайт непомітного сміття: диск заповнюється, і наступне
 * `npm i` падає з ENOSPC — не через код, а через тимчасові файли.
 *
 * Прибираються лише каталоги, які відповідають сигнатурі vite-node (містять
 * `ssr/`) **і** старші за добу: свіжий може належати запущеному дев-серверу.
 *
 * Запуск: `npm run clean:tmp`.
 *
 * @module scripts/clean-tmp
 */

import { readdirSync, rmSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const MAX_AGE_MS = 24 * 60 * 60 * 1000;
const now = Date.now();
let removed = 0;
let freed = 0;

function sizeOf(dir) {
  let total = 0;
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    try {
      const stat = statSync(full);
      total += stat.isDirectory() ? sizeOf(full) : stat.size;
    } catch {
      // Файл зник під час обходу — просто пропускаємо.
    }
  }
  return total;
}

for (const name of readdirSync(tmpdir())) {
  const dir = join(tmpdir(), name);
  try {
    if (!statSync(dir).isDirectory()) continue;
    // Сигнатура vite-node: каталог містить лише `ssr/` з хешами модулів.
    const entries = readdirSync(dir);
    if (!entries.includes("ssr")) continue;
    if (now - statSync(dir).mtimeMs < MAX_AGE_MS) continue;

    freed += sizeOf(dir);
    rmSync(dir, { recursive: true, force: true });
    removed++;
  } catch {
    // Не наш каталог або немає прав — лишаємо.
  }
}

console.log(
  removed
    ? `✓ Прибрано тимчасових каталогів vite-node: ${removed}, звільнено ${(freed / 1024 / 1024).toFixed(1)} MB.`
    : "✓ Тимчасових каталогів vite-node старших за добу немає.",
);
