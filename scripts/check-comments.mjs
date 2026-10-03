#!/usr/bin/env node
/**
 * Гейт коментарів — правило «пояснення живе в `docs/`, у коді лишається
 * тільки те, без чого агент помилиться».
 *
 * Пояснення в коді коштують подвійно: воно не має власника (хтось має
 * тримати його актуальним), дублює документ і коштує контекст у кожному
 * читанні файлу. Тому перевіряються дві речі:
 *
 *   1. **Коментарний блок довший за `LONG_LINES` рядків — це документація.**
 *      Рахується скільки їх лишилося і порівнюється з `scripts/comment-baseline.mjs`:
 *      більше ніж у леджері — помилка. Леджер уміє лише меншати, тому
 *      правило не можна виконати «раз і забути».
 *   2. **Шлях, згаданий у коментарі, мусить існувати.** Коментар із назвою
 *      файлу — це та сама обіцянка, що й посилання в документі: файлу
 *      перейменували, а коментар лишився і бреше.
 *
 * Чого гейт **не** ловить і не може: коментар, який переказує код, чи той,
 * що дублює документ. Сутність коментаря людський текст — перевіряється те,
 * що перевірити можна: довжина й живість посилань.
 *
 * Запуск: `npm run check:comments` (той самий крок у CI).
 *
 * @module scripts/check-comments
 */

import { allSourceFiles, readLines, repoPathExists } from "./lib/files.mjs";
import { BASELINE } from "./comment-baseline.mjs";

/** Блок коментаря довший за це — вже не підказка агентові, а розділ документа. */
const LONG_LINES = 8;

const errors = [];

/**
 * Коментарні блоки файлу: `/* … *\/` та послідовні `//`-рядки. Повертає
 * `{ start, lines }` — 1-індексний рядок початку й кількість рядків блоку.
 */
function commentBlocks(lines) {
  const blocks = [];
  for (let i = 0; i < lines.length;) {
    const trimmed = lines[i].trim();
    if (trimmed.startsWith("/*")) {
      let end = i;
      while (end < lines.length && !lines[end].includes("*/")) end++;
      end = Math.min(end + 1, lines.length);
      blocks.push({ start: i + 1, lines: end - i });
      i = end;
      continue;
    }
    if (trimmed.startsWith("//")) {
      let end = i;
      while (end < lines.length && lines[end].trim().startsWith("//")) end++;
      blocks.push({ start: i + 1, lines: end - i });
      i = end;
      continue;
    }
    i++;
  }
  return blocks;
}

/** Ті самий фільтр, що й у `check-docs`: лише шлях до файлу, не довільне слово. */
const PATH_TOKEN = /^[\w.-]+(?:\/[\w.-]+)*\/?$/;
const CODE_EXT = /\.(?:ts|tsx|mjs|js|css|md|sql|toml|json|html|yml|yaml)$/;
const TOOL_DIRS = /^(?:packages|docs|scripts|bot-dev|api-dev|web-platform-dev|web-admin-dev)\//;

const files = allSourceFiles();
let longBlocks = 0;

for (const file of files) {
  const lines = readLines(file);
  for (const block of commentBlocks(lines)) {
    if (block.lines > LONG_LINES) longBlocks++;

    for (let i = block.start - 1; i < Math.min(block.start - 1 + block.lines, lines.length); i++) {
      for (const m of lines[i].matchAll(/`([^`\n]+)`/g)) {
        const token = m[1];
        if (!token.includes("/") || !PATH_TOKEN.test(token)) continue;
        if (token.startsWith("@") || token.startsWith(".") || token.startsWith("http")) continue;
        if (!TOOL_DIRS.test(token) && !CODE_EXT.test(token)) continue;
        if (!repoPathExists(token)) {
          errors.push(`${file}:${i + 1} — коментар згадує «${token}», а такого файлу немає.`);
        }
      }
    }
  }
}

if (longBlocks > BASELINE.longBlocks) {
  errors.push(
    `Коментарних блоків довших за ${LONG_LINES} рядків — ${longBlocks}, у базі ${BASELINE.longBlocks}: ` +
      `пояснення їде в документ теми, у коді лишається рядок-адреса. Не піднімай базу — зменшуй.`,
  );
} else if (longBlocks < BASELINE.longBlocks) {
  errors.push(
    `Коментарних блоків довших за ${LONG_LINES} рядків — ${longBlocks}, у базі ${BASELINE.longBlocks}: ` +
      `винесено пояснення в документи, тож базу треба зменшити (scripts/comment-baseline.mjs).`,
  );
}

if (errors.length) {
  console.error("✗ Коментарі не пройшли перевірку:\n");
  for (const e of errors) console.error(`  ${e}`);
  console.error(
    "\nКоментар лишається тільки там, де код не показує намір: інваріант, пастка,\n" +
      "«чому саме так» одним реченням або адреса документа. Розгорнуте пояснення —\n" +
      "у документі теми (див. docs/COMMENTS.md).\n",
  );
  process.exitCode = 1;
} else {
  console.log(
    `✓ Коментарі: файлів ${files.length}, блоків довших за ${LONG_LINES} рядків — ` +
      `${longBlocks} (база ${BASELINE.longBlocks}, тільки меншає); мертвих шляхів у коментарях 0.`,
  );
}
