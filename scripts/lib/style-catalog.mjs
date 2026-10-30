/**
 * Каталог вигляду: читає CSS дизайн-системи й повертає його як дані.
 *
 * Навіщо: перелік токенів і кирпичиків, написаний руками, бреше першим — саме
 * тому `docs/TOKENS.md` не тримає значень, а `docs/DESIGN_SYSTEM.md` не тримає
 * списку класів. Але людині потрібен **перелік із поточними значеннями**, і
 * єдине місце, де він не дрейфує, — сам CSS.
 *
 * Тому каталог не описується, а **виводиться**: правила розбираються тут, а
 * сторінка адмінки (`/style`) лише показує результат. Забути перегенерувати
 * не вийде — `npm run check:style` порівнює файл із CSS.
 *
 * @module scripts/lib/style-catalog
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { isCss, ROOT, walk } from "./files.mjs";

/** Папка, у якій живуть **усі** стилі проєкту (`AGENTS.md` §3). */
export const STYLES_DIR = "packages/shared/src/styles";

/** Куди пишеться каталог: його читає сторінка `/style` в адмінці. */
export const CATALOG_FILE = `${STYLES_DIR}/catalog.json`;

/**
 * Шари схеми. Кожен шар — свій файл, і саме тому значення одного токена
 * показуються трьома колонками, а не одним рядком.
 */
const LAYERS = {
  "tokens.css": "light",
  "themes.css": "dark",
  "user-colors.css": "palette",
};

const CSS_CLASS_RE = /\.(-?[A-Za-z_][A-Za-z0-9_-]*)/g;

/**
 * Заголовок розділу з коментаря.
 *
 * Розділом вважається лише **прикрашений** коментар (`──` / `══`): пояснення
 * в коді теж коментар, але воно не називає групу, і взяти з нього назву
 * означало б зробити розділом абзац прози.
 */
function sectionTitle(raw) {
  if (!/[─═]/.test(raw)) return null;

  for (const line of raw.split("\n")) {
    const text = line
      .replace(/[─═]+/g, " ")
      .replace(/^\s*\*?\s*/, "")
      .replace(/\s+/g, " ")
      .trim();
    if (!/[A-Za-zА-Яа-яЇїІіЄєҐґ]/.test(text)) continue;
    return text;
  }
  return null;
}

/**
 * Розбір одного CSS-файлу: оголошення `--*` (зі селектором) і класи зі
 * селекторів, кожен — у своєму розділі.
 *
 * Сканер, а не регулярний вираз: селектор і оголошення розділяються дужками й
 * `;`, і саме ці межі визначають, до чого належить текст.
 */
export function parseCss(text) {
  const tokens = [];
  const classes = [];
  const stack = [];
  const sections = [];
  let section = "";
  let buffer = "";
  let comment = null;
  /** Перший коментар файлу — його шапка, а не назва групи. */
  let first = true;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];

    if (comment !== null) {
      if (ch === "*" && text[i + 1] === "/") {
        // Шапка файлу називає сам файл, а не групу правил: взяти її назвою
        // розділу означало б мати першу групу «DESIGN TOKENS — …».
        const title = first ? null : sectionTitle(comment);
        if (title) section = title;
        first = false;
        comment = null;
        i++;
      } else {
        comment += ch;
      }
      continue;
    }

    if (ch === "/" && text[i + 1] === "*") {
      comment = "";
      i++;
      continue;
    }

    if (ch === "{") {
      const selector = buffer.trim();
      buffer = "";
      stack.push(selector);
      sections.push(section);
      for (const m of selector.matchAll(CSS_CLASS_RE)) classes.push({ name: m[1], section });
      continue;
    }

    if (ch === "}") {
      buffer = "";
      stack.pop();
      sections.pop();
      continue;
    }

    if (ch === ";") {
      const declaration = buffer.trim();
      buffer = "";
      if (declaration.startsWith("--") && stack.length) {
        const colon = declaration.indexOf(":");
        if (colon > 0) {
          tokens.push({
            name: declaration.slice(0, colon).trim(),
            value: declaration.slice(colon + 1).trim(),
            selector: stack[stack.length - 1],
            // Розділ — той, що названий **перед оголошенням**: банер стоїть
            // усередині блока (`:root { /* ── Акцент ── */ --accent: … }`),
            // тож знімок на відкритій дужці дав би порожню назву.
            section,
          });
        }
      }
      continue;
    }

    buffer += ch;
  }

  return { tokens, classes };
}

/**
 * Селектори, чиї оголошення — **токени продукту**, а не мірки одного правила.
 * Світла схема — `:root`, темна — `[data-theme="dark"]`, три кольори людини —
 * `html[data-colors]…`. Усе інше (`.ana-page { --ana-gutter: … }`) — місцеве.
 */
const TOKEN_SELECTOR = /^(:root|\[data-theme="dark"\]|html\[data-colors\])/;

/**
 * Локальна мірка: оголошення всередині правила компонента.
 */
function isScoped(selector) {
  return !TOKEN_SELECTOR.test(selector);
}

/** Файли стилів — у стабільному порядку (алфавіт), щоб каталог не «дихав». */
function styleFiles() {
  return walk(STYLES_DIR, isCss).sort();
}

/**
 * Каталог цілком.
 *
 * Токени зливаються за іменем: світла схема — `tokens.css`, темна —
 * `themes.css`, три кольори людини — `user-colors.css`. Оголошення всередині
 * конкретного правила (`.ana-page { --ana-gutter: … }`) лишаються окремо:
 * це місцеві мірки компонента, а не токен продукту.
 */
export function buildCatalog() {
  const tokensByName = new Map();
  const locals = [];
  const files = [];
  const classes = {};

  for (const file of styleFiles()) {
    const short = file.slice(STYLES_DIR.length + 1);
    const parsed = parseCss(readFileSync(join(ROOT, file), "utf8"));
    const layer = LAYERS[short];
    const isPaletteDark = short === "user-colors.css";

    files.push({
      file: short,
      tokens: parsed.tokens.length,
      classes: new Set(parsed.classes.map((c) => c.name)).size,
    });

    for (const token of parsed.tokens) {
      if (isScoped(token.selector)) {
        locals.push({
          name: token.name,
          file: short,
          selector: token.selector,
          value: token.value,
          section: token.section,
        });
        continue;
      }

      const entry = tokensByName.get(token.name) ?? {
        name: token.name,
        section: token.section,
        light: "",
        dark: "",
        palette: "",
        paletteDark: "",
      };
      // Розділ бере той шар, де токен має **назву групи**: спершу світла схема,
      // потім темна. Палітра назв не дає: її розділи — про шар, а не про колір,
      // і саме через неї `--accent` опинявся в групі «Спільна частина…».
      if (layer === "light" && token.section) entry.section = token.section;
      else if (layer !== "palette" && !entry.section && token.section) {
        entry.section = token.section;
      }

      if (layer === "light") entry.light = token.value;
      else if (layer === "dark") entry.dark = token.value;
      else if (isPaletteDark) {
        // У `user-colors.css` спільний блок стоїть для обох режимів, а нижче
        // йдуть два уточнення — світле й темне.
        const dark = token.selector.includes('"dark"');
        const light = token.selector.includes('"light"');
        if (!dark) entry.palette = entry.palette || token.value;
        if (!light) entry.paletteDark = entry.paletteDark || token.value;
        if (dark) entry.paletteDark = token.value;
      }
      tokensByName.set(token.name, entry);
    }

    const grouped = new Map();
    for (const item of parsed.classes) {
      const key = item.section || "";
      const names = grouped.get(key) ?? new Set();
      names.add(item.name);
      grouped.set(key, names);
    }
    classes[short] = [...grouped].map(([section, names]) => ({
      section,
      names: [...names].sort(),
    }));
  }

  return {
    files,
    tokens: [...tokensByName.values()].sort((a, b) => (a.name < b.name ? -1 : 1)),
    local: locals.sort((a, b) => (a.name < b.name ? -1 : 1)),
    classes,
  };
}

/** Текст каталогу — один і той самий для запису й для перевірки свіжості. */
export function renderCatalog() {
  return JSON.stringify(buildCatalog(), null, 2) + "\n";
}
