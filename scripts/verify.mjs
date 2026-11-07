#!/usr/bin/env node
/**
 * Джоба `checks` одною командою: склад і порядок — як у
 * `.github/workflows/deploy.yml`, зупинка на першому падінні, у кінці — крок
 * для повтору. `--only=<частина>` жене частину кроків, `--no-audit` — без
 * `npm audit` (потрібен інтернет). Деталі: `docs/QUALITY_GATE.md`.
 *
 * @module scripts/verify
 */

import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";

const WORKFLOW = ".github/workflows/deploy.yml";

/** Кроки джоби `checks`. `audit` позначено, щоб `--no-audit` його знімав. */
const STEPS = [
  { name: "audit", cmd: "npm audit --audit-level=high", audit: true },
  { name: "lint", cmd: "npm run lint" },
  { name: "typecheck", cmd: "npm run typecheck" },
  { name: "prettier", cmd: "npx prettier --check ." },
  { name: "check:css", cmd: "npm run check:css" },
  { name: "check:inline", cmd: "npm run check:inline" },
  { name: "check:style", cmd: "npm run check:style" },
  { name: "check:quality", cmd: "npm run check:quality" },
  { name: "check:docs", cmd: "npm run check:docs" },
  { name: "check:db", cmd: "npm run check:db" },
  { name: "check:comments", cmd: "npm run check:comments" },
  { name: "check:texts", cmd: "npm run check:texts" },
  // Покриття — перед збірками: забутий тест нового файлу червоніє першим.
  { name: "test:coverage", cmd: "npm run test:coverage" },
  { name: "check:coverage", cmd: "npm run check:coverage" },
  // Бюджет бандла читає `dist/`, тож обидві збірки стоять перед ним.
  { name: "build:web-platform", cmd: "npm run build --workspace web-platform-dev" },
  { name: "build:web-admin", cmd: "npm run build --workspace web-admin-dev" },
  { name: "check:bundle", cmd: "npm run check:bundle" },
  { name: "test", cmd: "npm test" },
];

const args = process.argv.slice(2);
const only = args.find((a) => a.startsWith("--only="))?.slice("--only=".length);
const noAudit = args.includes("--no-audit");

/** Скрипти з тексту: і `npm run x`, і голий `npm test`; `npm ci` — не гейт. */
const scriptsOf = (text) =>
  [...text.matchAll(/npm (?:run )?([\w:.-]+)/g)].map((m) => m[1]).filter((s) => s !== "ci");

/**
 * Скрипти з джоби `checks` у YAML. Список тут — **копія**, тож він мусить
 * падати на розбіжності: крок, доданий у CI й забутий тут, інакше дає зелене
 * «локально все добре» при червоному деплої.
 */
function ciScripts() {
  const yaml = readFileSync(WORKFLOW, "utf8");
  const start = yaml.indexOf("\n  checks:");
  const end = yaml.indexOf("\n  deploy-bot:");
  if (start < 0 || end < start) return null;
  return scriptsOf(yaml.slice(start, end));
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
      `  CI:  ${theirs ? theirs.join(" → ") : "не прочитано — перевір шлях джоби checks"}\n` +
      `  онови STEPS у scripts/verify.mjs, інакше локальний прогін не про той деплой.`,
  );
  process.exitCode = 1;
}

const steps = STEPS.filter(
  (step) => !(noAudit && step.audit) && (!only || step.name.includes(only)),
);

const time = (ms) => (ms < 1000 ? `${ms} мс` : `${(ms / 1000).toFixed(1)} с`);

if (!drift) {
  if (steps.length === 0) {
    console.error(`✗ Немає кроку з «${only}». Є: ${STEPS.map((s) => s.name).join(", ")}.`);
    process.exitCode = 1;
  }

  const startedAt = Date.now();
  let done = 0;
  let failed = null;

  for (const [i, step] of steps.entries()) {
    console.log(`\n▶ ${i + 1}/${steps.length}  ${step.name}`);
    const at = Date.now();
    const ok = spawnSync(step.cmd, { stdio: "inherit", shell: true }).status === 0;
    const spent = Date.now() - at;
    if (!ok) {
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
  }
}
