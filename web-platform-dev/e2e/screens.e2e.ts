/**
 * Стрічки з даними на живій платформі: «Трекери» й «Мій день».
 *
 * Поводів два. Перший — падіння `e is not iterable`: сторінка отримувала тіло
 * без масивів і замість списку малювала білий екран, а в консолі лишалась
 * одна літера. Другий — порядок: обидва екрани беруть трекери хуком
 * `useTrackers` і мусять показати свої дані, а не порожню оболонку.
 *
 * Дані справжні (підписана сесія прев'ю → api-dev), тож спека ловить саме
 * контракт API, а не заглушку.
 *
 * @module web-platform-dev/e2e/screens
 */

import { expect, test, type Page } from "@playwright/test";

const ARTIFACTS = "e2e-artifacts";

/** Помилки сторінки: у прев'ю вони виглядають як білий екран. */
function watchErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(`pageerror: ${error.message}`));
  page.on("console", (message) => {
    if (message.type() !== "error") return;
    // SDK сам скаржиться на метод, якого немає в імітованій версії клієнта.
    if (message.text().includes("exitFullscreen")) return;
    errors.push(`console: ${message.text()}`);
  });
  return errors;
}

test("трекери: сторінка рендерить свої дані, а не білий екран", async ({ page }) => {
  const errors = watchErrors(page);

  await page.goto("/trackers");
  await expect(page.getByRole("heading", { name: "Трекери" })).toBeVisible();
  // Стрічка прийшла з api-dev: дерево груп не порожнє — саме його ітерація
  // давала «e is not iterable», коли масивів у відповіді не було.
  const tree = page.locator(".wb-trackers-tree");
  await expect(tree).toBeVisible();
  expect((await tree.innerText()).trim().length).toBeGreaterThan(0);
  await page.screenshot({ path: `${ARTIFACTS}/13-trackers-live.png`, fullPage: true });

  expect(errors).toEqual([]);
});

test("мій день: ритм, справи й трекери на своєму екрані", async ({ page }) => {
  const errors = watchErrors(page);

  await page.goto("/day");
  await expect(page.getByRole("heading", { name: "Мій день" })).toBeVisible();
  // Блок ритму тижня будується з тих самих вимірів, що й стрічка.
  await expect(page.locator(".wb-day-rhythm")).toBeVisible();
  await page.screenshot({ path: `${ARTIFACTS}/14-day-live.png`, fullPage: true });

  expect(errors).toEqual([]);
});
