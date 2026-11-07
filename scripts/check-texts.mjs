#!/usr/bin/env node
/**
 * Гейт текстів: слово, яке бачить людина, живе в рядку `scenarios`, а не в коді.
 *
 * Рахує **літерали й JSX-текст із кирилицею** в UI-коді й порівнює з
 * `scripts/texts-baseline.mjs`. Більше за базу — падіння; менше — теж: база
 * зменшується тим самим комітом, інакше борг «зникає» з очей.
 *
 * Чого не ловить: слово, складене з частин (`"Серв" + "іси"`), і текст, що
 * приїхав із сервера. Перше — це вже обман, друге — і є мета.
 *
 * Запуск: `npm run check:texts`; оновити базу (лише коли борг справді менший):
 * `node scripts/check-texts.mjs --write`.
 *
 * @module scripts/check-texts
 */

import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { ROOT, allSourceFiles, read } from "./lib/files.mjs";
import { BASELINE } from "./texts-baseline.mjs";

const CYRILLIC = /[\u0400-\u04FF]/;
const LITERAL = /"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|`(?:[^`\\]|\\.)*`/g;
const JSX_TEXT = />([^<>{}]+)</g;

/** Текстова одиниця: літерал або те, що стоїть між тегами в JSX. */
function textUnits(source) {
  const code = stripComments(source);
  const units = [];
  for (const match of code.matchAll(LITERAL)) units.push(match[0]);
  for (const match of code.matchAll(JSX_TEXT)) units.push(match[1]);
  return units;
}

/**
 * Знімає коментарі, лишаючи літерали недоторканими: `//` у URL і крапки в
 * регулярках не мають ламати підрахунок.
 */
function stripComments(source) {
  let out = "";
  let quote = "";
  for (let i = 0; i < source.length; i++) {
    const ch = source[i];
    const next = source[i + 1];
    if (quote) {
      out += ch;
      if (ch === "\\") {
        out += next ?? "";
        i += 1;
      } else if (ch === quote) {
        quote = "";
      }
      continue;
    }
    if (ch === '"' || ch === "'" || ch === "`") {
      quote = ch;
      out += ch;
      continue;
    }
    if (ch === "/" && next === "/") {
      while (i < source.length && source[i] !== "\n") i += 1;
      out += "\n";
      continue;
    }
    if (ch === "/" && next === "*") {
      i += 2;
      while (i < source.length && !(source[i] === "*" && source[i + 1] === "/")) i += 1;
      i += 1;
      continue;
    }
    out += ch;
  }
  return out;
}

const perFile = [];
let total = 0;

for (const file of allSourceFiles()) {
  let count = 0;
  for (const unit of textUnits(read(file))) {
    if (CYRILLIC.test(unit)) count += 1;
  }
  if (count === 0) continue;
  total += count;
  perFile.push({ file, count });
}

if (process.argv.includes("--write")) {
  const body = `/**
 * Відомий борг текстів у коді, який \`scripts/check-texts.mjs\` поки що терпить.
 *
 * Правило те саме, що в \`scripts/comment-baseline.mjs\`: число тут — тільки те,
 * що вже описано як відкрита робота (\`docs/SCREEN_TEXTS.md\`). Кожен екран, чиї
 * слова переїхали в рядок \`scenarios\`, зменшує його; більше за базу — нова
 * помилка, і гейт її зупинить.
 */
export const BASELINE = {
  /** Текстових одиниць із кирилицею в UI-коді: **мета — нуль**. */
  texts: ${total},
};
`;
  writeFileSync(join(ROOT, "scripts/texts-baseline.mjs"), body, "utf8");
  console.log(`✓ База текстів записана: ${total} одиниць у ${perFile.length} файлах.`);
  process.exit(0);
}

const top = [...perFile].sort((a, b) => b.count - a.count).slice(0, 8);
const list = top.map((entry) => `    ${entry.file} — ${entry.count}`).join("\n");

if (total > BASELINE.texts) {
  console.error("✗ Текстів у коді стало більше, ніж у базі:\n");
  console.error(`  зараз ${total}, у базі ${BASELINE.texts}.\n`);
  console.error(`  Найбільше в:\n${list}\n`);
  console.error(
    "  Слово, яке бачить людина, має ключ у рядку `scenarios` і читається\n" +
      "  `readScreenTexts`; див. docs/SCREEN_TEXTS.md.\n",
  );
  process.exitCode = 1;
} else if (total < BASELINE.texts) {
  console.error(
    `✗ Текстів у коді ${total}, у базі ${BASELINE.texts}: борг зменшився, тож базу\n` +
      "  треба зменшити тим самим комітом: `node scripts/check-texts.mjs --write`.\n",
  );
  process.exitCode = 1;
} else {
  console.log(
    `✓ Тексти: ${total} одиниць із кирилицею в UI-коді (база ${BASELINE.texts}, тільки меншає); ` +
      `ключі екранів — у рядках \`scenarios\`.`,
  );
}
