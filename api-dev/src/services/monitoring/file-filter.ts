/**
 * Що з репозиторію взагалі бере участь у показниках коду.
 *
 * **Це рішення, а не деталь.** У метрики входять файли, які **ми написали**:
 * `.ts`, `.tsx`, `.css`, `.md`, `.sql`, конфіги. Не входять: `node_modules`,
 * збірки (`dist`), lock-файли, мініфіковані бандли, двійкові файли. Причина
 * одна: показник мусить показувати **нашу** роботу, а не `npm install`. Якщо
 * рахувати `package-lock.json`, динаміка «код виріс на 40 000 рядків»
 * приходитиме від оновлення залежності — і жоден зріз не буде вартий довіри.
 *
 * Окремо від підсумків (`code-stats.ts`), бо це **правила відбору**, а не
 * арифметика: їх читають, коли питають «чому число саме таке».
 *
 * @module api-dev/src/services/monitoring/file-filter
 */

import type { CommentStyle } from "./line-counter";

/** Група файлів, які лежать у корені репозиторію. */
export const ROOT_GROUP = "root";

/** Теки, які не є частиною нашого коду ніколи. */
const SKIPPED_SEGMENTS = new Set([
  "node_modules",
  "dist",
  "build",
  "coverage",
  ".git",
  ".wrangler",
  ".vite",
  ".next",
]);

/** Файли-зліпки й ліцензія: їхній розмір вимірює не наша робота. */
const SKIPPED_FILES = new Set([
  "package-lock.json",
  "npm-shrinkwrap.json",
  "yarn.lock",
  "pnpm-lock.yaml",
  "bun.lock",
  "bun.lockb",
  "LICENSE",
]);

/** Текст, який ми пишемо: за розширенням. */
const TEXT_EXTENSIONS = new Set([
  "ts",
  "tsx",
  "mts",
  "cts",
  "js",
  "jsx",
  "mjs",
  "cjs",
  "json",
  "css",
  "html",
  "md",
  "txt",
  "yml",
  "yaml",
  "toml",
  "sql",
  "sh",
  "svg",
  "xml",
]);

/** Файли без розширення, які справді текст. */
const TEXT_NAMES = new Set([
  "Dockerfile",
  "Makefile",
  "Procfile",
  ".editorconfig",
  ".gitignore",
  ".prettierignore",
  ".prettierrc",
]);

/** Теки першого рівня, які стають окремими групами показників. */
const KNOWN_GROUPS = new Set([
  "api-dev",
  "bot-dev",
  "web-admin-dev",
  "web-platform-dev",
  "packages",
  "docs",
  "scripts",
  ".github",
]);

/** Мова файлу за розширенням — від неї залежить, що вважати коментарем. */
export function commentStyleFor(path: string): CommentStyle {
  const ext = path.slice(path.lastIndexOf(".") + 1).toLowerCase();
  if (["ts", "tsx", "mts", "cts", "js", "jsx", "mjs", "cjs", "css", "json", "svg"].includes(ext)) {
    return "slash";
  }
  if (["yml", "yaml", "sh", "toml", "env"].includes(ext)) return "hash";
  if (ext === "sql") return "dash";
  // `.md`, `.html`, `.txt`, `.xml`: коментарі є, але маркери різні — вважати
  // щось коментарем означало б вигадувати правило, якого в мові немає.
  return "none";
}

/** Чи входить файл у показники коду. */
export function isCountedPath(path: string): boolean {
  const segments = path.split("/");
  const name = segments[segments.length - 1];
  if (segments.some((segment) => SKIPPED_SEGMENTS.has(segment))) return false;
  if (SKIPPED_FILES.has(name) || name.endsWith(".min.js") || name.endsWith(".min.css")) {
    return false;
  }
  if (name.includes(".map")) return false;

  if (TEXT_NAMES.has(name)) return true;
  const dot = name.lastIndexOf(".");
  if (dot <= 0) return false;
  return TEXT_EXTENSIONS.has(name.slice(dot + 1).toLowerCase());
}

/** Група (воркспейс) файлу — перша тека, якщо вона відома. */
export function workspaceOf(path: string): string {
  const slash = path.indexOf("/");
  if (slash < 0) return ROOT_GROUP;
  const first = path.slice(0, slash);
  return KNOWN_GROUPS.has(first) ? first : ROOT_GROUP;
}
