#!/usr/bin/env node
/*
 * Знімки екрана дев-воркерів — очі агента.
 *
 * Без цього будь-яка правка вигляду робилась наосліп: CSS збирається, тести
 * зелені, а що бачить людина — невідомо. Скрипт відкриває сторінки справжнім
 * Chromium у двох ширинах і складає PNG у `artifacts/shots/` (тека в
 * `.gitignore`). Друкує також помилки консолі: сторінка, що «просто виглядає»,
 * часто має зламаний запит.
 *
 * Запуск: `npm run shots` (усі) або `npm run shots -- platform mydate`.
 */

import { existsSync, readdirSync } from "node:fs";
import { mkdir } from "node:fs/promises";
import { homedir } from "node:os";
import { chromium } from "playwright";

const BASE = {
  platform: "https://web-platform-dev.diskomate.workers.dev",
  admin: "https://web-admin-dev.diskomate.workers.dev",
};

const TARGETS = [
  { app: "platform", paths: ["/", "/main", "/platform", "/mydate"] },
  { app: "admin", paths: ["/"] },
];

const VIEWPORTS = [
  { name: "desktop", width: 1440, height: 1000 },
  { name: "phone", width: 390, height: 844 },
];

const filters = process.argv.slice(2);
const wanted = (text) => filters.length === 0 || filters.some((f) => text.includes(f));

const outDir = "artifacts/shots";
await mkdir(outDir, { recursive: true });

// `--no-sandbox` — у контейнері без user namespaces Chromium інакше не стартує.
// Шлях до бінарника шукаємо самі: Playwright 1.49 за замовчуванням кличе
// headless-shell, який у контейнері часто лишається недокачаним, а повна
// збірка лежить поруч у кеші.
function findChrome() {
  const root = `${homedir()}/.cache/ms-playwright`;
  if (!existsSync(root)) return undefined;
  const builds = readdirSync(root)
    .filter((dir) => /^chromium-\d+$/.test(dir))
    .sort()
    .reverse();
  for (const build of builds) {
    const binary = `${root}/${build}/chrome-linux/chrome`;
    if (existsSync(binary)) return binary;
  }
  return undefined;
}

// Системні бібліотеки браузера, розпаковані локально: у контейнері без root
// apt не поставить їх системно, а Chromium без них не стартує.
const libs = `${homedir()}/.local/chrome-libs/usr/lib/x86_64-linux-gnu`;
if (existsSync(libs)) {
  process.env.LD_LIBRARY_PATH = [libs, process.env.LD_LIBRARY_PATH].filter(Boolean).join(":");
}

const executablePath = process.env.CHROMIUM_PATH ?? findChrome();
const browser = await chromium.launch({
  args: ["--no-sandbox", "--disable-gpu", "--disable-software-rasterizer"],
  executablePath,
});
let failures = 0;

for (const target of TARGETS) {
  for (const path of target.paths) {
    const name = `${target.app}${path === "/" ? "-home" : path.replace(/\//g, "-")}`;
    if (!wanted(name)) continue;
    for (const vp of VIEWPORTS) {
      const page = await browser.newPage({ viewport: { width: vp.width, height: vp.height } });
      const errors = [];
      page.on("console", (msg) => {
        if (msg.type() === "error") errors.push(msg.text().slice(0, 200));
      });
      page.on("pageerror", (err) => errors.push(`pageerror: ${String(err).slice(0, 200)}`));
      const file = `${outDir}/${name}-${vp.name}.png`;
      try {
        await page.goto(BASE[target.app] + path, { waitUntil: "networkidle", timeout: 45000 });
        await page.screenshot({ path: file, fullPage: true });
        console.log(`✓ ${file}`);
      } catch (error) {
        failures += 1;
        console.log(`✗ ${file}: ${error.message.split("\n")[0]}`);
      }
      for (const message of errors) console.log(`    консоль: ${message}`);
      await page.close();
    }
  }
}

await browser.close();
process.exit(failures === 0 ? 0 : 1);
