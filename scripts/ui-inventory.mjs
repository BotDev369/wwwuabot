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
import { BLOCK_WRAPPER, GROUPS, PAGE, VERDICTS } from "./ui-inventory-elements.mjs";

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

/* Знаки: імена — з єдиного списку `ICON_NAMES` (тип `IconName`), ужиток —
   скільки файлів кожної частини звуть `name="…"`. */
const ICONS = [
  ...read("packages/shared/src/components/icon-names.ts").matchAll(/"([a-z0-9-]+)",/g),
].map(([, name]) => name);

function iconUsage(icon) {
  /* Той самий погляд, що в `icons.test.ts`: знак ужито, якщо файл тримає набір
     (`<Icon>`, `IconName`, мапа `icons`) і згадує ім'я. */
  const pattern = new RegExp(`["'\`]${escape(icon)}["'\`]`);
  const usage = {};
  for (const [key, files] of Object.entries(FILES)) {
    usage[key] = files.filter(
      (text) => /<Icon\b|IconName|\bicons\b/.test(text) && pattern.test(text),
    ).length;
  }
  return usage;
}

/* Блоки Page Builder читаються з реєстру `block-definitions`, а не зі списку,
   написаного руками: інакше перелік відставав би від реєстру мовчки. */
const BLOCK_MODULES = [
  "content",
  "layout",
  "navigation",
  "data",
  "commerce",
  "forms",
  "bot-domain",
  "analytics",
  "raw",
];

/** Поле визначення блока: перше `ключ: "…"` у відрізку файлу з одним блоком. */
function blockField(chunk, key) {
  const match = chunk.match(new RegExp(`${key}: "((?:[^"\\\\]|\\\\.)*)"`));
  return match ? JSON.parse(`"${match[1]}"`) : "";
}

function readBlocks() {
  return BLOCK_MODULES.flatMap((module) =>
    read(`packages/shared/src/constants/block-definitions/${module}.ts`)
      .split("\n  block({")
      .slice(1)
      .map((chunk) => ({
        type: blockField(chunk, "type"),
        label: blockField(chunk, "label"),
        icon: blockField(chunk, "icon"),
        note: blockField(chunk, "description"),
      }))
      .filter((block) => block.type && block.label),
  );
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
        verdict: element.via === "page-builder" ? "builder" : verdictOf(usage),
        ...(element.via ? { via: element.via } : {}),
      };
    }),
  }));
  groups.push({
    id: "blocks",
    label: PAGE.blockGroup,
    note: PAGE.blockGroupNote,
    elements: [
      ...readBlocks().map((block) => ({
        id: `block-${block.type}`,
        name: block.label,
        /* Не клас, а тип: сторінка вживає блок саме так — у `page_data`. */
        className: `type: "${block.type}"`,
        sample: "icon",
        sampleText: "",
        note: block.note,
        icon: block.icon || "info",
        usage: { platform: 0, admin: 0, ui: 0, shared: 0 },
        verdict: "builder",
        via: "page-builder",
      })),
      {
        ...BLOCK_WRAPPER,
        usage: count(BLOCK_WRAPPER.className),
        verdict: "builder",
        via: "page-builder",
      },
    ],
  });
  groups.push({
    id: "icons",
    label: PAGE.iconGroup,
    note: PAGE.iconGroupNote,
    elements: ICONS.map((icon) => {
      const usage = iconUsage(icon);
      return {
        id: `icon-${icon}`,
        name: icon,
        className: `Icon name="${icon}"`,
        sample: "icon",
        sampleText: "",
        note: "",
        icon,
        usage,
        verdict: verdictOf(usage),
      };
    }),
  });
  const all = groups.flatMap((group) => group.elements);
  const summary = {
    total: all.length,
    both: all.filter((element) => element.verdict === "both").length,
    one: all.filter((element) => element.verdict === "one").length,
    shared: all.filter((element) => element.verdict === "shared").length,
    builder: all.filter((element) => element.verdict === "builder").length,
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
