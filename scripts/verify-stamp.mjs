#!/usr/bin/env node
/**
 * Штамп повного `verify` — **замок на пуш**.
 *
 * Деплой падав не через хитрі баги, а через те, що локально ганяли *частину*
 * гейтів: `eslint` по одному файлу, `prettier` по редагованих, точкові тести.
 * CI ганяє весь набір і падає на тому, що локально не запускали. Тому тут
 * немає «нагадування»: пуш фізично не пройде, поки `npm run verify` не
 * завершився зеленим **на тому самому дереві**, яке пушиться.
 *
 * Дерево робочої копії рахується тимчасовим індексом (`GIT_INDEX_FILE`), щоб
 * не чіпати справжній: інакше перевірка сама змінювала б те, що перевіряє.
 * Коміт дерево не міняє — тож штамп, знятий до коміту, лишається чинним і
 * після нього, а будь-яка правка файлу робить його недійсним.
 *
 * Використання: `--write` (пише штамп, це робить `verify`), `--check`
 * (перевіряє, це робить `.githooks/pre-push`).
 *
 * @module scripts/verify-stamp
 */

import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

/**
 * Штамп лежить у git-каталозі, а не в робочій копії: він про цю машину, не про
 * код. Шлях береться в git, бо в робочих копіях `.git` — це файл-посилання.
 */
const showStamp = () =>
  join(
    execFileSync("git", ["rev-parse", "--git-dir"], { encoding: "utf8" }).trim(),
    "verify-stamp.json",
  );

/** Дерево робочої копії — те, що реально поїде в пуш. */
export function worktreeTree() {
  const dir = mkdtempSync(join(tmpdir(), "verify-index-"));
  const env = { ...process.env, GIT_INDEX_FILE: join(dir, "index") };
  execFileSync("git", ["add", "-A"], { env, stdio: "pipe" });
  return execFileSync("git", ["write-tree"], { env, encoding: "utf8" }).trim();
}

/** Записати штамп — кличе `scripts/verify.mjs` після повного зеленого прогону. */
export function writeStamp() {
  const stamp = { tree: worktreeTree(), at: new Date().toISOString() };
  writeFileSync(showStamp(), `${JSON.stringify(stamp, null, 2)}\n`);
  return stamp;
}

function readStamp() {
  try {
    return JSON.parse(readFileSync(showStamp(), "utf8"));
  } catch {
    return null;
  }
}

/** Перевірка для `pre-push`: `true` — дерево перевірене саме в цьому вигляді. */
export function stamped() {
  const stamp = readStamp();
  return stamp !== null && stamp.tree === worktreeTree();
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const mode = process.argv[2];
  if (mode === "--write") {
    const stamp = writeStamp();
    console.log(`✓ Штамп verify записано: ${stamp.tree}`);
    process.exit(0);
  }
  if (mode === "--check") {
    if (stamped()) process.exit(0);
    console.error(
      "✗ Пуш заблоковано: на цьому дереві не було зеленого `npm run verify`.\n" +
        "  Запусти `npm run verify` (усі 19 кроків, як у CI) — і пуш відкриється.\n" +
        "  Обхід навмисно не передбачений: саме через нього деплой падав.",
    );
    process.exit(1);
  }
  console.log(worktreeTree());
}
