/**
 * Сторож набору знаків.
 *
 * **Навіщо.** Набір знаків ламається мовчки, і саме так він уже зламався:
 *
 *   * три імені (`grid`, `blocks`, `scenarios`) мали **піксель у піксель** той
 *     самий гліф, тож «Хрестики-нулики», «2048» і «Сценарії» виглядали
 *     однаково, а різницю можна було побачити лише очима;
 *   * картка блоку «Кнопки» стояла в пікері **без знака** — імені `buttons` у
 *     наборі не існувало, а поле знака було звичайним рядком;
 *   * п'ять знаків (`more`, `chevron-left`, `play`, `button`, та ще пара
 *     залитих близнюків) не рендерились ніде — вони вже були мертві, і ніщо
 *     про це не казало.
 *
 * **Що перевіряється** (правило 26, `docs/DESIGN_SYSTEM.md`):
 *
 *   1. Список імен і реєстр гліфів — це **один і той самий набір**.
 *   2. Двоє імен не мають однієї картинки: один знак = одне значення.
 *   3. Кожен залитий близнюк має контурну пару (`feed` ↔ `feed-solid`).
 *   4. Кожне ім'я вживається в продукті: знак без місця видаляють.
 *
 * Вихідники читаються як текст — так само, як у `styles/*.test.ts` і
 * `games.test.ts`: тестове середовище тут `node`, без DOM.
 *
 * @module packages/shared/src/components/icons.test
 */

/// <reference types="node" />

import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import type { ReactElement } from "react";
import { describe, expect, it } from "vitest";
import { ICON_NAMES } from "./icon-names";
import { icons } from "./icons";

const REPO_ROOT = fileURLToPath(new URL("../../../../", import.meta.url));

/** Дані й самі приклади в докблоці — не «вживання» знака. */
const SKIP_FILES = [
  "packages/shared/src/components/icons.tsx",
  "packages/shared/src/components/icon-names.ts",
  "packages/shared/src/components/Icon.tsx",
];

/** Де шукати вживання: спільний код і обидві оболонки. */
const SCANNED_ROOTS = ["packages", "web-platform-dev/src", "web-admin-dev/src"];

const SKIPPED_DIRS = new Set(["node_modules", "dist", "build", "coverage", ".git"]);

function sourceFiles(dir = REPO_ROOT): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (SKIPPED_DIRS.has(entry.name)) continue;
    const full = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...sourceFiles(full));
    else if (/\.tsx?$/.test(entry.name) && !/\.test\.tsx?$/.test(entry.name)) out.push(full);
  }
  return out;
}

/** Коментарі не рахуються: згадка знака в прозі — не його вжиток. */
function stripComments(text: string): string {
  return text.replace(/\/\*[\s\S]*?\*\//g, " ").replace(/^\s*\/\/.*$/gm, " ");
}

/**
 * Картинка знака одним рядком — для порівняння гліфів між собою.
 *
 * Порівнюються `type` і властивості кожного вузла, крім `children`: два SVG з
 * тими самими шляхами дають той самий рядок, і саме це потрібно зловити.
 */
function shape(node: unknown): string {
  if (node === null || typeof node !== "object") return JSON.stringify(node) ?? "null";
  const element = node as ReactElement<{ children?: unknown }>;
  const props = (element.props ?? {}) as Record<string, unknown>;
  const { children, ...rest } = props;
  const kids: unknown[] = Array.isArray(children)
    ? children
    : children === undefined
      ? []
      : [children];
  return `${String(element.type)}${JSON.stringify(rest)}[${kids.map(shape).join("|")}]`;
}

describe("набір знаків", () => {
  it("список імен і реєстр гліфів — один набір, без зайвих і без забутих", () => {
    // Компілятор ловить це ж саме через `Record<IconName, …>`, але тут видно
    // **обидві** різниці за раз: і зайве ім'я, і гліф без імені.
    const declared = [...ICON_NAMES].sort();
    const painted = Object.keys(icons).sort();
    expect(painted).toEqual(declared);
  });

  it("двоє імен не мають однієї картинки: один знак = одне значення", () => {
    const byShape = new Map<string, string[]>();
    for (const name of ICON_NAMES) {
      const key = shape(icons[name]);
      byShape.set(key, [...(byShape.get(key) ?? []), name]);
    }
    const duplicates = [...byShape.values()].filter((names) => names.length > 1);
    // Повідомлення мусить назвати винних: «двійників» може бути й кілька пар.
    expect(duplicates, `однакова картинка: ${JSON.stringify(duplicates)}`).toEqual([]);
  });

  it("кожен залитий близнюк має контурну пару", () => {
    // Близнюк — це той самий знак фарбою (правило 25), тож пункт футера без
    // пари смикає картинку при виборі, а близнюк без пункту — мертва картинка.
    const twins = ICON_NAMES.filter((name) => name.endsWith("-solid"));
    expect(twins.length).toBeGreaterThan(0);
    for (const twin of twins) {
      const base = twin.replace(/-solid$/, "");
      expect(ICON_NAMES, `${twin} без контурної пари`).toContain(base);
    }
  });

  it("кожне ім'я вживається в продукті: знак без місця видаляють", () => {
    const used = new Set<string>();
    // Строгий вигляд: знак названий там, де його рендерять.
    const explicit =
      /(?:<Icon\s+name=\{?\s*|\bicon(?:Active)?[:=]\s*|\bicons\[\s*|\bico\(\s*)["'`]([a-z-]+)["'`]/g;

    for (const file of sourceFiles()) {
      const relative = file.slice(REPO_ROOT.length).split("\\").join("/");
      if (SKIP_FILES.includes(relative)) continue;
      const text = stripComments(readFileSync(file, "utf8"));
      for (const match of text.matchAll(explicit)) used.add(match[1]);
      // Вільний вигляд: знак ховається в мапі або тернарнику (`rock: "rock"`,
      // `cell === "x" ? "mark-x"`). Такій файл уже тримає набір у руках — він
      // рендерить `<Icon />` або бере тип `IconName`.
      if (/\bIconName\b|\bicons\b|<Icon\b/.test(text)) {
        for (const match of text.matchAll(/["'`]([a-z-]+)["'`]/g)) {
          if ((ICON_NAMES as readonly string[]).includes(match[1])) used.add(match[1]);
        }
      }
    }

    const unused = ICON_NAMES.filter((name) => !used.has(name));
    expect(unused, `ніде не вживається: ${unused.join(", ")}`).toEqual([]);
  });
});
