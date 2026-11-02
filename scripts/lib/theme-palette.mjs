/**
 * Палітра картки теми: ролі кольору → **різні** кольори цієї теми.
 *
 * Картка теми — це палітра, а не набір зразків «по одному на токен»: у межах
 * однієї теми частина ролей має той самий колір (`--accent` = `--data-1`,
 * `--bg-1` → `--bg-0`, у «Ночі» `--field-bg` = `--bg-4`), і два однакові
 * зразки читались як помилка. Тому ролі, чий колір уже показано, з картки
 * зникають: лишається один зразок на колір.
 *
 * Список тому **виводиться з CSS**, а не тримається руками: рукописна копія
 * розійшлася б із `tokens.css` на першій же правці, а картка почала б брехати
 * про тему. Пише його `npm run doc:style`, свіжість ловить `npm run check:style`.
 *
 * @module scripts/lib/theme-palette
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { ROOT } from "./files.mjs";

/** Куди пишеться палітра: її читає картка теми в обох оболонках. */
export const PALETTE_FILE = "packages/shared/src/styles/theme-palette.json";

/**
 * Ролі в тому порядку, у якому їх читає екран: тла, межі, текст, акцент, дані,
 * статуси, підкладки. Роль, яку вже показано іншим кольором, зі списку теми
 * зникає — порядок вирішує, хто з близнюків лишиться (тло й акцент як головні).
 */
export const PALETTE_ROLES = [
  "bg-0",
  "bg-1",
  "bg-2",
  "bg-3",
  "bg-4",
  "card-bg",
  "sidebar-bg",
  "field-bg",
  "field-bg-raised",
  "border",
  "border-hover",
  "border-subtle",
  "text-primary",
  "text-secondary",
  "text-muted",
  "text-inverse",
  "accent",
  "accent-hover",
  "data-1",
  "data-2",
  "data-3",
  "data-4",
  "data-5",
  "data-6",
  "green",
  "yellow",
  "red",
  "tint-1",
  "tint-2",
  "tint-3",
];

/** Блок теми: світла живе в `tokens.css` разом із `:root`, решта — у `themes.css`. */
const THEME_BLOCK =
  /(:root,\s*\[data-theme="light"\]|\[data-theme="([a-z-]+)"\])\s*\{([\s\S]*?)\n\}/g;

/** Оголошення блока: ім'я без `--` → значення як написано. */
function declarations(body) {
  const map = new Map();
  for (const match of body.matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)) {
    map.set(match[1].slice(2), match[2].trim());
  }
  return map;
}

/** Колір у порівнянному вигляді: `#FFF` і `#ffffff` — той самий колір. */
function colour(raw) {
  return raw
    .replace(/\s+/g, "")
    .toLowerCase()
    .replace(/^#([0-9a-f])([0-9a-f])([0-9a-f])$/, "#$1$1$2$2$3$3");
}

/**
 * Значення токена з розв'язаними `var()`.
 *
 * Посилання розв'язується до кінця: у світлій темі `--bg-1` — це
 * `var(--bg-home, …)`, а той — `var(--bg-0)`. Порівнювати сирі рядки означало б
 * вважати їх різними кольорами й лишити на картці два однакові зразки.
 */
function resolve(decls, name, depth = 0) {
  const raw = decls.get(name);
  if (raw === undefined) throw new Error(`немає оголошення --${name}`);
  if (depth > 8) throw new Error(`--${name}: var() посилається сам на себе`);

  const link = raw.match(/^var\((--[\w-]+)(?:\s*,\s*([^)]*))?\)$/);
  if (!link) return colour(raw);

  const target = link[1].slice(2);
  if (decls.has(target)) return resolve(decls, target, depth + 1);
  if (link[2]) return colour(link[2]);
  throw new Error(`--${name}: ${link[1]} не оголошений`);
}

/** Палітра картки: ролі-кандидати й зразки кожної теми без повторів кольору. */
export function buildThemePalette() {
  const styles = "packages/shared/src/styles";
  const css = ["tokens.css", "themes.css"]
    .map((file) => readFileSync(join(ROOT, styles, file), "utf8"))
    .join("\n");

  const themes = {};
  for (const match of css.matchAll(THEME_BLOCK)) {
    const id = match[2] ?? "light";
    const decls = declarations(match[3]);
    const seen = new Set();
    const swatches = [];

    for (const role of PALETTE_ROLES) {
      const value = resolve(decls, role);
      if (seen.has(value)) continue;
      seen.add(value);
      swatches.push(role);
    }
    themes[id] = swatches;
  }

  if (Object.keys(themes).length === 0) throw new Error("не знайдено жодного блока теми");

  return { roles: [...PALETTE_ROLES], themes };
}

/** Текст палітри — один і той самий для запису й для перевірки свіжості. */
export function renderThemePalette() {
  return JSON.stringify(buildThemePalette(), null, 2) + "\n";
}
