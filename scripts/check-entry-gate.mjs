#!/usr/bin/env node
/**
 * E2E-гейт першого кадру: зібрана сторінка оболонки відкривається справжнім
 * Chromium зі строгим CSP прода й мусить поставити `data-web-block` до `#root`.
 * Інлайновий гейт CSP блокує — юніт-тести цього не бачать, а людина бачить
 * блимання продуктом. Запуск: `npm run check:gate` після обох `build`.
 *
 * @module scripts/check-entry-gate
 */

import { existsSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import { extname, join } from "node:path";
import { chromium } from "playwright";

const ROOT = new URL("..", import.meta.url).pathname;
/** Справжній CSP вмикається лише на нелокальному hostname — як у проді. */
const ORIGIN = "http://entry-gate.test";
const SHELLS = [
  { name: "платформа", workspace: "web-platform-dev" },
  { name: "адмінка", workspace: "web-admin-dev" },
];
const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json",
  ".svg": "image/svg+xml",
  ".jpg": "image/jpeg",
  ".png": "image/png",
  ".woff2": "font/woff2",
};

// Системні бібліотеки Chromium, розпаковані локально: у контейнері без root
// apt їх не поставить, а без них браузер не стартує (як у `scripts/shots.mjs`).
const libs = `${homedir()}/.local/chrome-libs/usr/lib/x86_64-linux-gnu`;
if (existsSync(libs)) {
  process.env.LD_LIBRARY_PATH = [libs, process.env.LD_LIBRARY_PATH].filter(Boolean).join(":");
}

/** CSP зі зібраних `_headers` — та сама політика, що поїде на прод. */
function cspOf(dist) {
  const file = join(dist, "_headers");
  if (!existsSync(file)) return null;
  const line = readFileSync(file, "utf8")
    .split("\n")
    .find((row) => /^\s*Content-Security-Policy:/i.test(row));
  return line ? line.slice(line.indexOf(":") + 1).trim() : null;
}

function typeOf(file) {
  return TYPES[extname(file)] ?? "application/octet-stream";
}

/**
 * Статична частина: у документі немає інлайнових скриптів, гейт їде окремим
 * файлом і стоїть до `#root`. Саме інлайновий гейт CSP і блокував у проді.
 */
function inspect(workspace) {
  const dist = join(ROOT, workspace, "dist", "client");
  const indexPath = join(dist, "index.html");
  if (!existsSync(indexPath)) {
    const build = `npm run build --workspace ${workspace}`;
    return {
      dist,
      csp: null,
      problems: [`${workspace}: немає dist/client — спершу \`${build}\`.`],
    };
  }

  const html = readFileSync(indexPath, "utf8");
  const csp = cspOf(dist);
  const problems = [];

  if (!csp) {
    problems.push(`${workspace}: у dist/client/_headers немає Content-Security-Policy.`);
  } else if (!/script-src[^;]*'self'/.test(csp)) {
    problems.push(`${workspace}: script-src не дозволяє 'self' — скрипт гейта не завантажиться.`);
  } else if (/'unsafe-inline'/.test(csp.split(";").find((part) => part.includes("script-src")))) {
    problems.push(
      `${workspace}: script-src дозволяє 'unsafe-inline' — сторінка не під строгим CSP, інлайновий гейт пройде повз перевірку.`,
    );
  }

  const tags = [...html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)].map((match) => ({
    attrs: match[1],
    body: match[2],
    at: match.index ?? 0,
    src: /\bsrc\s*=\s*"([^"]+)"/.exec(match[1])?.[1],
  }));

  for (const tag of tags) {
    if (tag.src === undefined && tag.body.trim() !== "") {
      problems.push(
        `${workspace}: інлайновий <script> у сторінці — CSP його заблокує, і гейт не виконається (див. docs/SECURITY.md).`,
      );
    }
  }

  // Гейт — той зовнішній скрипт, що **пише** атрибут: бандл застосунку його
  // лише читає, тож збіг за `setAttribute` не сплутає їх місцями.
  const gate = tags.find((tag) => {
    if (!tag.src) return false;
    const file = join(dist, tag.src);
    return existsSync(file) && readFileSync(file, "utf8").includes('setAttribute("data-web-block"');
  });
  const rootAt = html.indexOf('id="root"');

  if (!gate) {
    problems.push(
      `${workspace}: немає зовнішнього скрипта гейта (файл із data-web-block) — #root покаже продукт.`,
    );
  } else if (rootAt === -1) {
    problems.push(`${workspace}: у сторінці немає #root — перевіряти порядок гейта нічого.`);
  } else if (gate.at > rootAt) {
    problems.push(`${workspace}: скрипт гейта стоїть після #root — продукт устигне показатись.`);
  }

  return { dist, csp, problems };
}

/** Динамічна частина: що браузер справді зробив зі сторінкою під цим CSP. */
async function runInBrowser(browser, shell, dist, csp) {
  const problems = [];
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });

  // Мережа не має бути причиною падіння: файли беремо з dist, а зовнішній
  // Telegram SDK у CI недоступний — віддаємо порожній скрипт.
  await context.route("**/*", (route) => {
    const url = new URL(route.request().url());
    if (url.origin !== ORIGIN) {
      return route.fulfill({ status: 200, contentType: "text/javascript", body: "" });
    }
    const path = url.pathname === "/" ? "/index.html" : decodeURIComponent(url.pathname);
    const file = join(dist, path);
    if (!file.startsWith(dist) || !existsSync(file)) {
      return route.fulfill({ status: 404, body: "" });
    }
    return route.fulfill({
      status: 200,
      headers: { "Content-Type": typeOf(file), "Content-Security-Policy": csp },
      body: readFileSync(file),
    });
  });

  const page = await context.newPage();
  const violations = [];
  page.on("console", (message) => {
    if (/content security policy|refused to execute|refused to apply/i.test(message.text())) {
      violations.push(message.text().slice(0, 200));
    }
  });
  await page.goto(`${ORIGIN}/`, { waitUntil: "load" });

  const state = await page.evaluate(() => {
    const root = document.getElementById("root");
    const block = document.querySelector(".wb-entry-block");
    return {
      blocked: document.documentElement.hasAttribute("data-web-block"),
      root: root ? getComputedStyle(root).display : "немає #root",
      block: block ? getComputedStyle(block).display : "немає екрана-блока",
    };
  });

  for (const violation of violations) {
    problems.push(`${shell.name}: CSP заблокувала скрипт — ${violation}`);
  }
  if (!state.blocked) {
    problems.push(`${shell.name}: гейт не виконався — data-web-block немає, продукт показано.`);
  }
  if (state.root !== "none") {
    problems.push(`${shell.name}: #root видимий (display: ${state.root}) — обкладинка блимає.`);
  }
  if (state.block !== "flex") {
    problems.push(`${shell.name}: екран-блок не показано (display: ${state.block}).`);
  }

  await context.close();
  return problems;
}

const failed = [];
const ready = [];

for (const shell of SHELLS) {
  const result = inspect(shell.workspace);
  failed.push(...result.problems);
  // Браузер запускаємо й тоді, коли статична перевірка вже впала: він показує,
  // що саме сталося на сторінці (data-web-block, порушення CSP), а не лише текст.
  if (result.csp) ready.push({ shell, ...result });
}

if (ready.length > 0) {
  let browser;
  try {
    browser = await chromium.launch({
      args: ["--no-sandbox", "--disable-gpu", "--disable-software-rasterizer"],
    });
  } catch (error) {
    const reason = String(error.message ?? error).split("\n")[0];
    console.error(`✗ Chromium не стартував (${reason}).`);
    console.error("  встановити: npx playwright install --with-deps chromium");
    process.exit(1);
  }
  try {
    for (const item of ready) {
      failed.push(...(await runInBrowser(browser, item.shell, item.dist, item.csp)));
    }
  } finally {
    await browser.close();
  }
}

if (failed.length > 0) {
  console.error("✗ Гейт першого кадру під строгим CSP:\n");
  for (const problem of failed) console.error(`  • ${problem}`);
  console.error(
    "\nПричина правила — docs/SECURITY.md (CSP): inline-гейт не лікується 'unsafe-inline', лише окремим файлом.",
  );
  process.exit(1);
}

console.log(
  `✓ Гейт першого кадру: ${SHELLS.map((shell) => shell.name).join(" і ")} — data-web-block, #root:none, екран-блок flex, CSP без порушень.`,
);
