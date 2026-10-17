/**
 * Playwright — очі й руки на прев'ю.
 *
 * Сервер тут **не піднімається**: прев'ю вже працює (керований процес на порту
 * 5173), і саме його ми перевіряємо. Адресу можна перекрити `PREVIEW_URL`.
 *
 * Мірка одна — 360×780: це телефон, а не смак (див. `web-platform-dev/README.md`).
 *
 * @module web-platform-dev/playwright.config
 */

import { defineConfig } from "@playwright/test";

const BASE_URL = process.env.PREVIEW_URL ?? "http://127.0.0.1:5173";

export default defineConfig({
  testDir: "./e2e",
  // `*.e2e.ts` — щоб vitest (`npm test`) не брав ці спеки: вони ходять у живий
  // прев'ю, а не в модуль.
  testMatch: /.*\.e2e\.ts$/,
  // Екрани послідовно: усі вони ходять в один дев-воркер, і паралельність тут
  // нічого не пришвидшує, а флаки додає.
  fullyParallel: false,
  workers: 1,
  timeout: 45_000,
  expect: { timeout: 10_000 },
  reporter: [["list"]],
  outputDir: "./e2e-artifacts",
  use: {
    baseURL: BASE_URL,
    viewport: { width: 360, height: 780 },
    isMobile: true,
    hasTouch: true,
    deviceScaleFactor: 2,
    trace: "retain-on-failure",
  },
});
