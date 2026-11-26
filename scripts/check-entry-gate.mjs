#!/usr/bin/env node
/**
 * Гейт першого кадру: зібрана сторінка оболонки відкривається справжнім
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
const SHELLS = { "web-platform-dev": "платформа", "web-admin-dev": "адмінка" };
const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".woff2": "font/woff2",
};

// Системні бібліотеки Chromium, розпаковані локально: без root apt їх не
// поставить, а без них браузер не стартує (як у `scripts/shots.mjs`).
const libs = `${homedir()}/.local/chrome-libs/usr/lib/x86_64-linux-gnu`;
if (existsSync(libs)) {
  process.env.LD_LIBRARY_PATH = [libs, process.env.LD_LIBRARY_PATH].filter(Boolean).join(":");
}

const problems = [];

/** CSP зі зібраних `_headers` — та сама політика, що поїде на прод. */
function cspOf(dist) {
  const file = join(dist, "_headers");
  if (!existsSync(file)) return null;
  const line = readFileSync(file, "utf8")
    .split("\n")
    .find((row) => /^\s*Content-Security-Policy:/i.test(row));
  return line ? line.slice(line.indexOf(":") + 1).trim() : null;
}

/**
 * Статичні зуби, яких браузер не покаже: `'unsafe-inline'` зробив би
 * інлайновий гейт зеленим, а інлайновий `<script>` — це і є той баг.
 */
function staticChecks(name, workspace) {
  const dist = join(ROOT, workspace, "dist", "client");
  const indexPath = join(dist, "index.html");
  if (!existsSync(indexPath)) {
    const build = `npm run build --workspace ${workspace}`;
    problems.push(`${workspace}: немає dist/client — спершу \`${build}\`.`);
    return null;
  }

  const csp = cspOf(dist);
  const scriptSrc = csp?.split(";").find((part) => part.trim().startsWith("script-src")) ?? "";
  if (!csp) {
    problems.push(`${workspace}: у dist/client/_headers немає Content-Security-Policy.`);
  } else if (!/'self'/.test(scriptSrc)) {
    problems.push(`${workspace}: script-src без 'self' — скрипт гейта не завантажиться.`);
  } else if (/'unsafe-inline'/.test(scriptSrc)) {
    problems.push(
      `${workspace}: script-src дозволяє 'unsafe-inline' — сторінка не під строгим CSP.`,
    );
  }

  const tags = [
    ...readFileSync(indexPath, "utf8").matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi),
  ];
  if (tags.some(([, attrs, body]) => !/\bsrc\s*=/.test(attrs) && body.trim())) {
    problems.push(
      `${name}: інлайновий <script> у сторінці — CSP його заблокує, гейт не виконається.`,
    );
  }

  return csp ? { dist, csp } : null;
}

/** Файли беремо з `dist`, а стороннє (Telegram SDK у CI) — порожнім скриптом. */
async function serveFromDist(context, dist, csp) {
  await context.route("**/*", (route) => {
    const url = new URL(route.request().url());
    if (url.origin !== ORIGIN) {
      return route.fulfill({ status: 200, contentType: "text/javascript", body: "" });
    }
    const path = url.pathname === "/" ? "/index.html" : decodeURIComponent(url.pathname);
    const file = join(dist, path);
    if (!file.startsWith(dist) || !existsSync(file))
      return route.fulfill({ status: 404, body: "" });
    return route.fulfill({
      status: 200,
      headers: {
        "Content-Type": MIME[extname(file)] ?? "application/octet-stream",
        "Content-Security-Policy": csp,
      },
      body: readFileSync(file),
    });
  });
}

/** Що браузер справді зробив зі сторінкою під цим CSP. */
async function browserChecks(browser, name, dist, csp) {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  await serveFromDist(context, dist, csp);
  const page = await context.newPage();
  page.on("console", (message) => {
    if (/content security policy|refused to (execute|apply)/i.test(message.text())) {
      problems.push(`${name}: CSP заблокувала скрипт — ${message.text().slice(0, 200)}`);
    }
  });
  await page.goto(`${ORIGIN}/`, { waitUntil: "load" });

  const state = await page.evaluate(() => {
    const shown = (element) => (element ? getComputedStyle(element).display : "немає");
    return {
      blocked: document.documentElement.hasAttribute("data-web-block"),
      root: shown(document.getElementById("root")),
      block: shown(document.querySelector(".wb-entry-block")),
    };
  });

  if (!state.blocked)
    problems.push(`${name}: гейт не виконався — data-web-block немає, продукт показано.`);
  if (state.root !== "none")
    problems.push(`${name}: #root видимий (${state.root}) — обкладинка блимає.`);
  if (state.block !== "flex") problems.push(`${name}: екран-блок не показано (${state.block}).`);
  await context.close();
}

const ready = Object.entries(SHELLS)
  .map(([workspace, name]) => ({ name, ...staticChecks(name, workspace) }))
  .filter((item) => item.dist);

if (ready.length > 0) {
  let browser;
  try {
    browser = await chromium.launch({ args: ["--no-sandbox", "--disable-gpu"] });
  } catch (error) {
    console.error(`✗ Chromium не стартував (${String(error.message).split("\n")[0]}).`);
    console.error("  встановити: npx playwright install --with-deps chromium");
    process.exit(1);
  }
  try {
    for (const { name, dist, csp } of ready) await browserChecks(browser, name, dist, csp);
  } finally {
    await browser.close();
  }
}

if (problems.length > 0) {
  console.error("✗ Гейт першого кадру під строгим CSP:\n");
  for (const problem of problems) console.error(`  • ${problem}`);
  console.error(
    "\nПричина правила — docs/SECURITY.md (CSP): інлайновий гейт не лікується 'unsafe-inline', лише окремим файлом.",
  );
  process.exit(1);
}

console.log(
  `✓ Гейт першого кадру: ${Object.values(SHELLS).join(" і ")} — data-web-block, #root:none, екран-блок flex, CSP без порушень.`,
);
