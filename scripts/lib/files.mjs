/**
 * Спільні дрібниці для скриптів-гейтів: корінь репозиторію, обхід файлів,
 * читання рядків.
 *
 * Винесено сюди за правилом «двічі — в спільне»: `check-css-classes.mjs` і
 * `check-quality.mjs` ходять тими самими деревами й фільтрують ті самі файли.
 * Копія `walk` у другому скрипті розійшлась би з першою на першій же правці
 * винятків (напр. `.wrangler`), і гейти почали б бачити різні дерева.
 *
 * @module scripts/lib/files
 */

import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

/** Корінь репозиторію (цей файл лежить у `scripts/lib/`). */
export const ROOT = join(fileURLToPath(new URL(".", import.meta.url)), "..", "..");

/** Теки, які не є кодом проєкту. `.wrangler` — кеш локального дев-сервера. */
const SKIP_DIRS = new Set(["node_modules", "dist", "build", ".wrangler"]);

/** Усіх шість воркспейсів із кодом у `src/`. */
export const WORKSPACES = [
  "packages/shared",
  "packages/ui",
  "bot-dev",
  "api-dev",
  "web-platform-dev",
  "web-admin-dev",
];

/** Дві оболонки одного продукту (див. `AGENTS.md` §3). */
export const SHELLS = ["web-platform-dev", "web-admin-dev"];

/**
 * Рекурсивний обхід теки з предикатом на шлях (шлях — відносний до кореня).
 * Недосяжна тека не є помилкою: воркспейс може бути відсутнім у чекауті.
 */
export function walk(dir, predicate) {
  const out = [];
  let entries;
  try {
    entries = readdirSync(join(ROOT, dir));
  } catch {
    return out;
  }
  for (const entry of entries) {
    if (SKIP_DIRS.has(entry) || entry.startsWith(".")) continue;
    const rel = join(dir, entry);
    if (statSync(join(ROOT, rel)).isDirectory()) out.push(...walk(rel, predicate));
    else if (predicate(rel)) out.push(rel);
  }
  return out;
}

export const isCss = (p) => p.endsWith(".css");

/** Код, а не тест: тести живуть за власними правилами й не рахуються в ліміти. */
export const isSource = (p) =>
  (p.endsWith(".ts") || p.endsWith(".tsx")) && !/\.(test|spec)\.tsx?$/.test(p);

/** Усі файли кодом у `src/` шести воркспейсів. */
export function allSourceFiles() {
  return WORKSPACES.flatMap((w) => walk(join(w, "src"), isSource));
}

export function read(rel) {
  return readFileSync(join(ROOT, rel), "utf8");
}

/** Рядки файлу без завершального порожнього. */
export function readLines(rel) {
  const text = read(rel);
  const lines = text.split("\n");
  if (lines.length && lines[lines.length - 1] === "") lines.pop();
  return lines;
}

/** Чи існує файл у чекауті (леджер боргу мусить посилатись на реальні шляхи). */
export function exists(rel) {
  try {
    return statSync(join(ROOT, rel)).isFile();
  } catch {
    return false;
  }
}

/**
 * Чи існує шлях у чекауті — як файл, як тека з файлами або як **хвіст**
 * наявного шляху.
 *
 * Спільно для `check-docs.mjs` (шлях у документі) і `check-comments.mjs`
 * (шлях у коментарі): правило «названий файл існує» одне, а копія в другому
 * гейті розійшлася б з першою на першій же перейменовці.
 */
export function repoPathExists(path) {
  const p = path.replace(/\/+$/, "");
  // `shared/…` — скорочення для `packages/shared/src/…`, яким користуються і документи, і код.
  const tails = p.startsWith("shared/")
    ? [p, `packages/shared/src/${p.slice("shared/".length)}`]
    : [p];
  return tails.some((tail) =>
    repoFiles().some(
      (file) =>
        file === tail ||
        file.endsWith(`/${tail}`) ||
        file.startsWith(`${tail}/`) ||
        file.includes(`/${tail}/`),
    ),
  );
}

/** Усі файли чекауту — один раз, далі з кешу: обхід дорогий. */
let repoFilesCache = null;
function repoFiles() {
  if (!repoFilesCache) repoFilesCache = [...walk(".", () => true), ...walk(".github", () => true)];
  return repoFilesCache;
}

/**
 * Вирізати коментарі, щоб `100vh` у поясненні не вважалося порушенням.
 * Свідомо грубо: рядкові літерали з `//` усередині не враховуємо — для
 * CSS-значень і шляхів це нешкідливо, а повний парсер тут не потрібен.
 */
export function stripComments(text) {
  return text.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
}
