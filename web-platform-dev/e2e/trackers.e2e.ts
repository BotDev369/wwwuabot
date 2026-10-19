/**
 * «Трекери» в прев'ю: рядок мірки, швидкий запис і кілька вимірів на день.
 *
 * Сценарій іде шляхом людини: футер → картка → поле → дотик; аналітику дивимось
 * на окремій сторінці трекера. За день можна записати скільки завгодно разів —
 * накопичувальна мірка сумує їх, а вимірювальна показує останній.
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

test("трекери: стандартні картки й швидкий запис без дефолтних цифр", async ({ page }) => {
  const errors = watchErrors(page);

  await page.goto("/trackers");

  // Перший вхід дає стандартний набір — список не порожній.
  const cards = page.locator(".wb-tracker-card");
  await expect(cards.first()).toBeVisible();
  expect(await cards.count()).toBeGreaterThanOrEqual(5);
  await page.screenshot({ path: `${ARTIFACTS}/10-trackers.png`, fullPage: true });

  // Картка — іконка, назва й поле; дефолтних цифр у полі немає, кнопки без
  // значення теж.
  const input = page.getByLabel("Записати: Вода");
  await expect(input).toHaveValue("");
  await expect(page.getByRole("button", { name: "Записати Вода" })).toHaveCount(0);

  // Швидкий запис: значення → кнопка з'явилась → дотик → поле порожнє.
  // Окремого «Збережено» немає: порожнє поле й є відповідь.
  await input.fill("0.5");
  await page.getByRole("button", { name: "Записати Вода" }).click();
  await expect(input).toHaveValue("");
  await expect(page.getByText("Збережено")).toHaveCount(0);

  // Відкриваємо трекер заголовком картки — аналітика там.
  await page.locator(".wb-tracker-card-open", { hasText: "Вода" }).click();
  await expect(page).toHaveURL(/\/trackers\/\d+$/);
  await expect(page.locator(".wb-tracker-chart-plot")).toBeVisible();
  await expect(page.getByText("Днів із записом")).toBeVisible();
  // Поля дати на екрані немає: день ставить сервер, людина його не обирає.
  await expect(page.getByLabel("День")).toHaveCount(0);
  await expect(page.getByLabel(/^Значення/)).toHaveValue("");

  await page.getByRole("tab", { name: "7 дн." }).click();
  await expect(page.getByText(/^\d+ з 7$/)).toBeVisible();
  await page.screenshot({ path: `${ARTIFACTS}/11-tracker-detail.png`, fullPage: true });

  expect(errors).toEqual([]);
});

test("трекери: день приймає кілька дотиків і сумує їх", async ({ page }) => {
  const errors = watchErrors(page);

  // Свіжий трекер — щоб чисна перевірка не залежала від старих записів дня.
  // Назва з номером прогону: інакше другий прогін знаходив би кілька однакових
  // рядків і перевіряв би чужу історію (у дев-базі вони вже накопичились).
  const title = `Присідання ${Date.now().toString().slice(-5)}`;
  await page.goto("/trackers?new=1");
  await page.getByLabel("Назва").fill(title);
  await page.getByLabel("Одиниця").fill("разів");
  // Вид запису обирають у формі: «додавати за день» — типовий, і саме він тут
  // потрібен — присідання за день додаються.
  await expect(page.getByRole("tab", { name: "Додавати за день" })).toHaveAttribute(
    "aria-selected",
    "true",
  );
  await page.getByRole("button", { name: "Створити" }).click();
  await expect(page).toHaveURL(/\/trackers\/\d+$/);
  await expect(page.locator("h1.wb-appbar__title")).toHaveText(title);

  // Два виміри одного дня: шапка показує суму, історія — два рядки.
  await page.getByLabel(/^Значення/).fill("5");
  await page.getByRole("button", { name: "Зберегти" }).click();
  await expect(page.locator(".wb-tracker-hero-value")).toHaveText(/5 разів/);

  await page.getByLabel(/^Значення/).fill("4");
  await page.getByRole("button", { name: "Зберегти" }).click();
  await expect(page.locator(".wb-tracker-hero-value")).toHaveText(/9 разів/);
  await expect(page.locator(".wb-tracker-history-row")).toHaveCount(2);

  // Третій дотик — зі стрічки, тією ж карткою.
  await page.goto("/trackers");
  const quick = page.getByLabel(`Записати: ${title}`);
  await quick.fill("3");
  await page.getByRole("button", { name: `Записати ${title}` }).click();
  await expect(quick).toHaveValue("");

  await page.locator(".wb-tracker-card-open", { hasText: title }).click();
  await expect(page.locator(".wb-tracker-hero-value")).toHaveText(/12 разів/);
  await expect(page.locator(".wb-tracker-history-row")).toHaveCount(3);

  expect(errors).toEqual([]);
});

test("трекери: вимірювальна мірка веде останнім виміром, а не сумою", async ({ page }) => {
  const errors = watchErrors(page);

  // Свій трекер без цілі — типовий вимір («температура», «вага»); вид у формі
  // перемикається на «показувати останній».
  const title = `Температура ${Date.now().toString().slice(-5)}`;
  await page.goto("/trackers?new=1");
  await page.getByLabel("Назва").fill(title);
  await page.getByLabel("Одиниця").fill("°");
  await page.getByRole("tab", { name: "Показувати останній" }).click();
  await page.getByRole("button", { name: "Створити" }).click();
  await expect(page).toHaveURL(/\/trackers\/\d+$/);

  // Два виміри одного дня — шапка показує **останнє**, а не їх суму.
  await page.getByLabel(/^Значення/).fill("36.6");
  await page.getByRole("button", { name: "Зберегти" }).click();
  await page.getByLabel(/^Значення/).fill("37.1");
  await page.getByRole("button", { name: "Зберегти" }).click();

  await expect(page.locator(".wb-tracker-hero-label")).toHaveText("Останній запис");
  await expect(page.locator(".wb-tracker-hero-value")).toHaveText(/37,1/);
  // Суми двох вимірів (73,7) на екрані немає ніде — вона не існує.
  await expect(page.getByText(/73,7/)).toHaveCount(0);
  // Графік вимірів — лінія з точками, а не стовпчики днів.
  await expect(page.locator(".wb-tracker-trend-line")).toBeVisible();
  await expect(page.locator(".wb-tracker-dot").first()).toBeVisible();
  await page.screenshot({ path: `${ARTIFACTS}/12-tracker-read.png`, fullPage: true });

  expect(errors).toEqual([]);
});
