#!/usr/bin/env node
/**
 * Гейт бюджету бандла — «скільки ваги тягне телефон».
 *
 * Обидві оболонки живуть у Telegram Mini App: клієнтський JS+CSS приходить
 * **до першого кадру**, тому вага бандла — це час до рендеру, а не рядок у
 * звіті. Ліміти й причина до кожного — в `scripts/bundle-baseline.mjs`.
 *
 * Вага рахується у **gzip**: те, що реально йде по мережі. Сирий розмір
 * враховує 服务源-мапи й не має сенсу.
 *
 * Гейт працює **після `npm run build`** у відповідній оболонці: без `dist/`
 * немає чого міряти, тож це помилка з командою, а не тихий пропуск.
 *
 * Запуск: `npm run check:bundle` (крок у CI будує перед собою).
 *
 * @module scripts/check-bundle
 */

import { gzipSync } from "node:zlib";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { BASELINE } from "./bundle-baseline.mjs";

const ROOT = new URL("..", import.meta.url).pathname;

/** Усі файли з extensions під текою — рекурсивно, бо `dist` має підтеки. */
function collect(dir, ext, out = []) {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) collect(full, ext, out);
    else if (name.endsWith(ext)) out.push(full);
  }
  return out;
}

/** Сума ваги у gzip у кілобайтах — саме те, що летить по мережі. */
function gzipKb(files) {
  const bytes = files.reduce((sum, file) => sum + gzipSync(readFileSync(file)).length, 0);
  return Math.round(bytes / 1024);
}

const errors = [];
const report = [];

for (const [workspace, budget] of Object.entries(BASELINE)) {
  const dist = join(ROOT, workspace, "dist");
  let files;
  try {
    files = collect(dist, ".js").concat(collect(dist, ".css"));
  } catch {
    errors.push(`${workspace}: немає dist/ — спершу \`npm run build\` у цій оболонці.`);
    continue;
  }

  const js = gzipKb(files.filter((f) => f.endsWith(".js")));
  const css = gzipKb(files.filter((f) => f.endsWith(".css")));
  report.push(
    `${workspace}: JS ${js} KB (ліміт ${budget.jsKb}), CSS ${css} KB (ліміт ${budget.cssKb})`,
  );

  if (js > budget.jsKb)
    errors.push(`${workspace}: JS ${js} KB > ${budget.jsKb} — ${budget.reason}`);
  if (css > budget.cssKb)
    errors.push(`${workspace}: CSS ${css} KB > ${budget.cssKb} — ${budget.reason}`);
}

if (errors.length) {
  console.error("✗ Бюджет бандла перевищено:\n");
  for (const e of errors) console.error(`  ${e}`);
  console.error(
    "\nЛіміт піднімається свідомо: у scripts/bundle-baseline.mjs разом із причиною.\n" +
      "Перед цим — чи не приносить нову вагу те, що можна зробити ліниво (data,\n" +
      "немає потреби в бандлі на сервері, спільний код уже винесено).\n",
  );
  process.exitCode = 1;
} else {
  console.log(`✓ Бюджет бандла: ${report.join("; ")}.`);
}
