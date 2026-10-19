/**
 * «Трекери» в прев'ю: групи тематик, картки «знак + назва» й запис на
 * сторінці трекера. За день можна записати скільки завгодно разів —
 * накопичувальна мірка сумує їх, а вимірювальна показує останній.
 *
 * **Тести не створюють трекерів.** Кожен сценарій пише записи всередині
 * наявної мірки з каталогу (`Читання`, `Температура`): чисна звірка йде
 * від значення перед першим дотиком, тому накопичена історія дев-бази
 * нічого не ламає, а стрічка не росте копіями від кожного прогону.
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

/** Перше число з шапки: «12 хв» → 12; без чисна (записів дня ще нема) → 0. */
async function heroNumber(page: Page): Promise<number> {
  const text = (await page.locator(".wb-tracker-hero-value").textContent()) ?? "";
  return Number(text.match(/\d+/)?.[0] ?? 0);
}

test("трекери: групи тематик, картки «знак + назва» й запис на сторінці трекера", async ({
  page,
}) => {
  const errors = watchErrors(page);

  await page.goto("/trackers");

  // Стандартний набір не порожній і згрупований тематиками — у порядку каталогу.
  const cards = page.locator(".wb-tracker-card");
  await expect(cards.first()).toBeVisible();
  expect(await cards.count()).toBeGreaterThanOrEqual(5);
  const groupTitles = page.locator(".wb-trackers-group-title");
  await expect(groupTitles.first()).toBeVisible();
  await expect(groupTitles).toContainText([
    "Активність",
    "Самопочуття",
    "Режим",
    "Розвиток",
    "Гроші",
  ]);
  await page.screenshot({ path: `${ARTIFACTS}/10-trackers.png`, fullPage: true });

  // Картка — лише знак і назва: записати зі стрічки не можна, підписів стану немає.
  await expect(page.getByLabel(/^Значення/)).toHaveCount(0);
  await expect(page.getByRole("button", { name: /Записати/ })).toHaveCount(0);
  await expect(page.locator(".wb-tracker-card-meta")).toHaveCount(0);

  // Відкриваємо трекер заголовком картки — запис і аналітика там.
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

  // Накопичувальна мірка з каталогу: дотики йдуть у її день, а чисна звірка
  // — від значення перед першим дотиком, тож попередні прогони не заважають.
  await page.goto("/trackers");
  await expect(page.locator(".wb-tracker-card").first()).toBeVisible();
  await page.locator(".wb-tracker-card-open", { hasText: "Читання" }).click();
  await expect(page).toHaveURL(/\/trackers\/\d+$/);
  // Дані трекера рендеряться одним кадром: поки шапка не з'явилась,
  // історія ще не завантажилась — і лічильник рядків зафіксував би 0.
  await expect(page.locator(".wb-tracker-hero-value")).toBeVisible();

  const base = await heroNumber(page);
  const before = await page.locator(".wb-tracker-history-row").count();

  await page.getByLabel(/^Значення/).fill("5");
  await page.getByRole("button", { name: "Зберегти" }).click();
  await expect.poll(() => heroNumber(page)).toBe(base + 5);
  await expect(page.locator(".wb-tracker-history-row")).toHaveCount(before + 1);

  await page.getByLabel(/^Значення/).fill("4");
  await page.getByRole("button", { name: "Зберегти" }).click();
  await expect.poll(() => heroNumber(page)).toBe(base + 9);
  await expect(page.locator(".wb-tracker-history-row")).toHaveCount(before + 2);

  // Третій дотик — теж на сторінці трекера: зі стрічки запису більше немає.
  await page.getByLabel(/^Значення/).fill("3");
  await page.getByRole("button", { name: "Зберегти" }).click();
  await expect.poll(() => heroNumber(page)).toBe(base + 12);
  await expect(page.locator(".wb-tracker-history-row")).toHaveCount(before + 3);

  // Стрічка після записів та сама: нових трекерів не з'явилось, поле запису
  // зі списку прибрано — картка лише веде на мірку.
  await page.goto("/trackers");
  await expect(page.locator(".wb-tracker-card-open", { hasText: "Читання" })).toHaveCount(1);
  await expect(page.getByLabel(/^Значення/)).toHaveCount(0);

  expect(errors).toEqual([]);
});

test("трекери: вимірювальна мірка веде останнім виміром, а не сумою", async ({ page }) => {
  const errors = watchErrors(page);

  // Вимірювальна мірка з каталогу: два записи одного дня — шапка показує
  // **останнє**, а не суму; старі виміри цього самого трекера не заважають.
  await page.goto("/trackers");
  await expect(page.locator(".wb-tracker-card").first()).toBeVisible();
  await page.locator(".wb-tracker-card-open", { hasText: "Температура" }).click();
  await expect(page).toHaveURL(/\/trackers\/\d+$/);
  // Та сама синхронізація, що й у накопичувальній мірці: шапка — знак того,
  // що й історія вже на екрані.
  await expect(page.locator(".wb-tracker-hero-value")).toBeVisible();

  const before = await page.locator(".wb-tracker-history-row").count();

  await page.getByLabel(/^Значення/).fill("36.6");
  await page.getByRole("button", { name: "Зберегти" }).click();
  // Перше збереження очищає поле по завершенні: без цього кроку другий ввід
  // потрапляє в очищення — і сабміт іде з порожньою чернеткою, без запиту.
  await expect(page.getByLabel(/^Значення/)).toHaveValue("");
  await expect(page.locator(".wb-tracker-hero-value")).toHaveText(/36,6/);
  await expect(page.locator(".wb-tracker-history-row")).toHaveCount(before + 1);

  await page.getByLabel(/^Значення/).fill("37.1");
  await page.getByRole("button", { name: "Зберегти" }).click();

  await expect(page.locator(".wb-tracker-hero-label")).toHaveText("Останній запис");
  await expect(page.locator(".wb-tracker-hero-value")).toHaveText(/37,1/);
  await expect(page.locator(".wb-tracker-history-row")).toHaveCount(before + 2);
  // Суми двох вимірів (73,7) на екрані немає ніде — вона не існує.
  await expect(page.getByText(/73,7/)).toHaveCount(0);
  // Графік вимірів — лінія з точками, а не стовпчики днів.
  await expect(page.locator(".wb-tracker-trend-line")).toBeVisible();
  await expect(page.locator(".wb-tracker-dot").first()).toBeVisible();
  await page.screenshot({ path: `${ARTIFACTS}/12-tracker-read.png`, fullPage: true });

  expect(errors).toEqual([]);
});
