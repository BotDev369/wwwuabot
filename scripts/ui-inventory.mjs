/**
 * Генератор переліку елементів єдиного UI для `/style`.
 *
 * **Лічильники — з коду, а не з голови.** Для кожного класу з
 * `ui-inventory-elements.mjs` скрипт рахує, у скількох файлах його вжито в
 * кожній частині продукту, і за цим ставить присуд: шаблон в обох оболонках,
 * лише одна, лише спільний код, не вживається.
 *
 * `node scripts/ui-inventory.mjs` пише файл, `--check` лише звіряє його з
 * кодом — так само, як `doc:style` / `check:style`.
 *
 * @module scripts/ui-inventory
 */

import { writeFileSync } from "node:fs";
import { join } from "node:path";

import { ROOT, isSource, read, walk } from "./lib/files.mjs";
import { GROUPS, PAGE, VERDICTS } from "./ui-inventory-elements.mjs";

const OUT = "web-admin-dev/src/pages/style/ui-inventory.json";

const SCOPES = {
  platform: "web-platform-dev",
  admin: "web-admin-dev",
  ui: "packages/ui",
  shared: "packages/shared",
};

/** Файли кожної частини продукту — один обхід на весь генератор. */
/* Сама сторінка переліку — не споживач: її зразки вживають майже кожен клас, і
   без цього винятку лічильники показували б вимір самої себе. */
const EXCLUDED = "web-admin-dev/src/pages/style/";

const FILES = Object.fromEntries(
  Object.entries(SCOPES).map(([key, dir]) => [
    key,
    walk(join(dir, "src"), isSource)
      .filter((file) => !file.startsWith(EXCLUDED))
      .map((file) => read(file)),
  ]),
);

function count(className) {
  const pattern = new RegExp(
    `(^|[^\\w-])${className.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&")}([^\\w-]|$)`,
  );
  const usage = {};
  for (const [key, files] of Object.entries(FILES)) {
    usage[key] = files.filter((text) => pattern.test(text)).length;
  }
  return usage;
}

function verdictOf(usage) {
  if (usage.platform > 0 && usage.admin > 0) return "both";
  if (usage.platform > 0 || usage.admin > 0) return "one";
  if (usage.ui > 0 || usage.shared > 0) return "shared";
  return "unused";
}

function build() {
  const version = JSON.parse(read("packages/shared/src/styles/catalog.json")).version;
  const groups = GROUPS.map((group) => ({
    id: group.id,
    label: group.label,
    note: group.note,
    elements: group.elements.map((element) => {
      const usage = count(element.className);
      return {
        id: element.id,
        name: element.name,
        className: element.className,
        sample: element.sample,
        sampleText: element.sampleText,
        note: element.note,
        usage,
        verdict: verdictOf(usage),
      };
    }),
  }));
  const all = groups.flatMap((group) => group.elements);
  const summary = {
    total: all.length,
    both: all.filter((element) => element.verdict === "both").length,
    one: all.filter((element) => element.verdict === "one").length,
    shared: all.filter((element) => element.verdict === "shared").length,
    unused: all.filter((element) => element.verdict === "unused").length,
  };
  return { version, page: PAGE, verdicts: VERDICTS, summary, groups };
}

const json = `${JSON.stringify(build(), null, 2)}\n`;
const target = join(ROOT, OUT);
const check = process.argv.includes("--check");

if (!check) {
  writeFileSync(target, json);
  console.log(`✓ ${OUT}: ${build().summary.total} елементів єдиного UI.`);
} else {
  let current = "";
  try {
    current = read(OUT);
  } catch {
    current = "";
  }
  if (current !== json) {
    console.error(`✗ ${OUT} застарів: код змінився, файл — ні.`);
    console.error("  Перегенеруй: npm run doc:ui");
    process.exit(1);
  }
  console.log(`✓ ${OUT} збігається з кодом.`);
}
