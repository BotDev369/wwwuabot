/**
 * «Трекери» в прев'ю: стандартний список, запис дня, графік і звіт.
 *
 * Сценарій іде рівно тим шляхом, яким іде людина: футер → список → трекер →
 * запис сьогодні → вікно аналітики. Стандартні трекери приходять при першому
 * вході, тож порожній список тут — уже поломка, а не очікування.
 *
 * Передумова — та сама, що в `platform.e2e.ts`: підписана сесія прев'ю
 * (`BOT_TOKEN_DEV` + `PREVIEW_TELEGRAM_ID`).
 *
 * @module web-platform-dev/e2e/trackers
 */

import { expect, test, type Page } from "@playwright/test";

const ARTIFACTS = "e2e-artifacts";

/** Помилки сторінки: у прев'ю вони виглядають як білий екран. */
function watchErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(`pageerror: ${error.message}`));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(`console: ${message.text()}`);
  });
  return errors;
}

test("трекери: стандартні мірки, запис дня, графік і звіт", async ({ page }) => {
  const errors = watchErrors(page);

  await page.goto("/trackers");

  // Перший вхід дає стандартний набір — список не порожній.
  const cards = page.locator(".wb-tracker-card");
  await expect(cards.first()).toBeVisible();
  expect(await cards.count()).toBeGreaterThanOrEqual(5);
  await page.screenshot({ path: `${ARTIFACTS}/10-trackers.png`, fullPage: true });

  // Вода — один із стандартних; відкриваємо його зі списку.
  await page.locator(".wb-tracker-card", { hasText: "Вода" }).first().click();
  await expect(page).toHaveURL(/\/trackers\/\d+$/);
  await expect(page.locator(".wb-tracker-chart-plot")).toBeVisible();
  await expect(page.getByText("Днів із записом")).toBeVisible();

  // Запис дня: значення → «Зберегти» → підтвердження й нове число в шапці.
  await page.getByLabel(/^Значення/).fill("1.75");
  await page.getByRole("button", { name: "Зберегти" }).click();
  await expect(page.getByRole("status")).toHaveText("Збережено");
  await expect(page.locator(".wb-tracker-hero-value")).toHaveText(/1,75/);
  await page.screenshot({ path: `${ARTIFACTS}/11-tracker-detail.png`, fullPage: true });

  // Звіт перекидається на 7 днів — і рахує саме за вікном.
  await page.getByRole("button", { name: "7 дн." }).click();
  await expect(page.getByText(/^\d+ з 7$/)).toBeVisible();

  // Історія показує щойно записаний день (дата в рядку — DD.MM, як `dayLabel`).
  await expect(page.locator(".wb-tracker-history-row").first()).toBeVisible();

  expect(errors).toEqual([]);
});

test("трекери: власний трекер додається формою в адресі", async ({ page }) => {
  const errors = watchErrors(page);

  await page.goto("/trackers?new=1");
  const title = page.getByLabel("Назва");
  await expect(title).toBeVisible();

  await title.fill("Присідання");
  await page.getByLabel("Одиниця").fill("разів");
  await page.getByRole("button", { name: "Створити" }).click();

  // Форма відкривалась в адресі (`?new=1`), тож і закривається нею самою.
  await expect(page).toHaveURL(/\/trackers\/\d+$/);
  await expect(page.getByLabel("Назва")).toHaveCount(0);
  await expect(page.locator("h1.wb-appbar__title")).toHaveText("Присідання");
  await expect(page.locator(".wb-tracker-chart-plot")).toBeVisible();

  expect(errors).toEqual([]);
});
