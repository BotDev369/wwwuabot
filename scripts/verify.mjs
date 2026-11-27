#!/usr/bin/env node
/**
 * Гейт одною командою: склад і порядок — як у трьох гейт-джобах
 * `.github/workflows/deploy.yml` (`checks-static` → `checks-tests` →
 * `checks-browser`), зупинка на першому падінні, у кінці — крок для повтору.
 * `--only=<частина>` жене частину кроків, `--group=<група>` — одну групу,
 * `--no-audit` — без `npm audit` (потрібен інтернет). Локально кроки завжди
 * послідовні: у CI групи біжать на різних раннерах, а тут ядер менше, ніж
 * роботи. Деталі: `docs/QUALITY_GATE.md`.
 *
 * @module scripts/verify
 */

import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { writeStamp } from "./verify-stamp.mjs";

const WORKFLOW = ".github/workflows/deploy.yml";

/** Гейт-джоби в тому порядку, у якому вони йдуть у робочому процесі. */
const GATE_JOBS = ["checks-static", "checks-tests", "checks-browser"];

/**
 * Кроки гейта. `group` — джоба CI, у якій крок живе; `audit` позначено, щоб
 * `--no-audit` його знімав.
 */
const STEPS = [
  // Той аудит, що їде на прод, — гейт; аудит інструментів розробки — звіт
  // (`soft`), як `continue-on-error` у CI: `picomatch` (CVE-2026-112366) не має
  // жодного виправленого релізу, і повний аудит не буває зеленим у принципі.
  {
    group: "static",
    name: "audit (shipped)",
    cmd: "npm audit --omit=dev --audit-level=high",
    audit: true,
  },
  {
    group: "static",
    name: "audit (dev tools)",
    cmd: "npm audit --audit-level=high",
    audit: true,
    soft: true,
  },
  { group: "static", name: "lint", cmd: "npm run lint" },
  { group: "static", name: "typecheck", cmd: "npm run typecheck" },
  { group: "static", name: "prettier", cmd: "npx prettier --check ." },
  { group: "static", name: "check:css", cmd: "npm run check:css" },
  { group: "static", name: "check:inline", cmd: "npm run check:inline" },
  { group: "static", name: "check:style", cmd: "npm run check:style" },
  { group: "static", name: "check:quality", cmd: "npm run check:quality" },
  { group: "static", name: "check:docs", cmd: "npm run check:docs" },
  { group: "static", name: "check:db", cmd: "npm run check:db" },
  { group: "static", name: "check:comments", cmd: "npm run check:comments" },
  { group: "static", name: "check:texts", cmd: "npm run check:texts" },
  // Реєстр екранів: один список адрес, назв і батьків. Гейт ловить і розбіжність
  // registry.json із згенерованою міграцією — інакше база й код розійшлися б тихо.
  { group: "static", name: "check:screens", cmd: "npm run check:screens" },
  // Тести біжать один раз — із покриттям: той самий набір, що й `npm test`.
  { group: "tests", name: "test:coverage", cmd: "npm run test:coverage" },
  { group: "tests", name: "check:coverage", cmd: "npm run check:coverage" },
  // Бюджет бандла читає `dist/`, тож обидві збірки стоять перед ним.
  {
    group: "browser",
    name: "build:web-platform",
    cmd: "npm run build --workspace web-platform-dev",
  },
  {
    group: "browser",
    name: "build:web-admin",
    cmd: "npm run build --workspace web-admin-dev",
  },
  // Перший кадр у справжньому Chromium: інлайновий гейт CSP блокує, і це
  // видно лише в браузері — тому крок стоїть після збірок, як і бюджет.
  { group: "browser", name: "check:gate", cmd: "npm run check:gate" },
  { group: "browser", name: "check:bundle", cmd: "npm run check:bundle" },
];

const args = process.argv.slice(2);
const only = args.find((a) => a.startsWith("--only="))?.slice("--only=".length);
const group = args.find((a) => a.startsWith("--group="))?.slice("--group=".length);
const noAudit = args.includes("--no-audit");

/** Скрипти з тексту: і `npm run x`, і голий `npm test`; `npm ci` — не гейт. */
const scriptsOf = (text) =>
  [...text.matchAll(/npm (?:run )?([\w:.-]+)/g)].map((m) => m[1]).filter((s) => s !== "ci");

/** Одна джоба YAML: від `\n  імʼя:` до наступного рядка того самого відступу. */
function jobBlock(yaml, name) {
  const start = yaml.indexOf(`\n  ${name}:`);
  if (start < 0) return null;
  const rest = yaml.slice(start + 1);
  const next = rest.slice(1).search(/\n {2}[a-z][\w-]*:/);
  return next < 0 ? rest : rest.slice(0, next + 1);
}

/**
 * Скрипти трьох гейт-джоб у YAML, у порядку джоб. Список тут — **копія**, тож
 * він мусить падати на розбіжності: крок, доданий у CI й забутий тут, інакше дає
 * зелене «локально все добре» при червоному деплої.
 */
function ciScripts() {
  const yaml = readFileSync(WORKFLOW, "utf8");
  const blocks = GATE_JOBS.map((name) => jobBlock(yaml, name));
  if (blocks.some((block) => block === null)) return null;
  return blocks.flatMap((block) => scriptsOf(block));
}

const mine = STEPS.flatMap((step) => scriptsOf(step.cmd));
const theirs = ciScripts();
const drift =
  theirs === null ||
  theirs.length !== mine.length ||
  theirs.some((script, i) => script !== mine[i]);

if (drift) {
  console.error(
    `✗ Список кроків розійшовся з ${WORKFLOW}:\n` +
      `  тут: ${mine.join(" → ")}\n` +
      `  CI:  ${theirs ? theirs.join(" → ") : "не прочитано — перевір назви джоб у WORKFLOW"}\n` +
      `  онови STEPS у scripts/verify.mjs, інакше локальний прогін не про той деплой.`,
  );
  process.exitCode = 1;
}

const steps = STEPS.filter(
  (step) =>
    !(noAudit && step.audit) &&
    (!only || step.name.includes(only)) &&
    (!group || step.group.includes(group)),
);

const time = (ms) => (ms < 1000 ? `${ms} мс` : `${(ms / 1000).toFixed(1)} с`);

if (!drift) {
  if (steps.length === 0) {
    console.error(
      `✗ Немає кроку з «${only ?? group}». Групи: ${[...new Set(STEPS.map((s) => s.group))].join(", ")}; кроки: ${STEPS.map((s) => s.name).join(", ")}.`,
    );
    process.exitCode = 1;
  }

  const startedAt = Date.now();
  let done = 0;
  let failed = null;

  for (const [i, step] of steps.entries()) {
    console.log(`\n▶ ${i + 1}/${steps.length}  ${step.group} · ${step.name}`);
    const at = Date.now();
    const ok = spawnSync(step.cmd, { stdio: "inherit", shell: true }).status === 0;
    const spent = Date.now() - at;
    if (!ok && step.soft) {
      console.log(`! ${step.name} — червоний, але деплой не блокує (звіт)`);
    }
    if (!ok && !step.soft) {
      failed = { step, spent };
      break;
    }
    done += 1;
    console.log(`✓ ${step.name} — ${time(spent)}`);
  }

  if (failed) {
    console.error(
      `\n✗ Упав крок «${failed.step.name}» (${done + 1}/${steps.length}, ${time(failed.spent)}).\n` +
        `  повторити: ${failed.step.cmd}\n` +
        `  решта ${steps.length - done - 1} кроків не запускались — CI впав би тут само.`,
    );
    process.exitCode = 1;
  } else if (steps.length) {
    console.log(`\n✓ Усі ${done} кроків зелені за ${time(Date.now() - startedAt)}.`);
    // Штамп — лише за **повний** прогін без `--only`/`--group`/`--no-audit`:
    // частковий зелений прогін не про той деплой, що поїде (`scripts/verify-stamp.mjs`).
    if (!only && !group && !noAudit && done === STEPS.length) {
      console.log(`✓ Штамп verify: ${writeStamp().tree}`);
    } else {
      console.log("! Штамп не записано: це частковий прогін, пуш він не відкриває.");
    }
  }
}
