/**
 * Смоук платформи в прев'ю: те, що людина побачила б очима.
 *
 * Перевіряємо рівно те, що можна перевірити без скріншота: підписана сесія
 * доїхала до сторінки, каркас відрендерився, смуга навігації переводить між
 * екранами, верстка влазить у 360px і жодна сторінка не кидає в консоль.
 * Знімки екранів лягають у `web-platform-dev/e2e-artifacts/` — їх дивиться
 * людина, бо агент бачить розмітку, а не пікселі.
 *
 * Передумова: у прев'ю задані `BOT_TOKEN_DEV` і `PREVIEW_TELEGRAM_ID`
 * (`dev/telegram-session.ts`). Без них сторінка порожня, і перший тест падає
 * з підказкою — це очікувано, а не поломка застосунку.
 *
 * @module web-platform-dev/e2e/platform
 */

import { expect, test, type Page } from "@playwright/test";
import {
  PREVIEW_SESSION_PATH,
  PREVIEW_TOKEN_VAR,
  PREVIEW_USER_VAR,
} from "../dev/telegram-session.ts";

const ARTIFACTS = "e2e-artifacts";

/**
 * Серце в хедері — у двох станах, і обидва мають ім'я: `aria-label` кнопки і є
 * її станом («Додати в обране» / «Прибрати з обраного»).
 */
const HEART = /Додати в обране|Прибрати з обраного/;

/** Екрани, які мають відкриватись у телефоні. Кожен — власна адреса. */
const SCREENS = [
  { label: "Акаунт", path: /\/account$/ },
  { label: "Обране", path: /\/favorites$/ },
  { label: "Сервіси", path: /\/services$/ },
];

/** Помилки сторінки: у прев'ю вони виглядають як білий екран. */
function watchErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(`pageerror: ${error.message}`));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(`console: ${message.text()}`);
  });
  return errors;
}

/** `initData`, який бачить сама сторінка (читаємо те, що читає застосунок). */
async function appInitData(page: Page): Promise<string> {
  const value: unknown = await page.evaluate(
    "window.Telegram && window.Telegram.WebApp && window.Telegram.WebApp.initData",
  );
  return typeof value === "string" ? value : "";
}

/** Чий це підпис: id людини лежить у самому `initData` (як у Telegram). */
function userIdFromInitData(initData: string): number | null {
  const raw = new URLSearchParams(initData).get("user");
  if (!raw) return null;
  try {
    const user = JSON.parse(raw) as { id?: unknown };
    return typeof user.id === "number" ? user.id : null;
  } catch {
    return null;
  }
}

/** Другий id зі списку — акаунт «звичайна людина» (коли він заданий). */
function secondPreviewId(): string | undefined {
  return (process.env[PREVIEW_USER_VAR] ?? "").split(/[,\s]+/).filter(Boolean)[1];
}

test("чужого Telegram-id прев'ю не підписує", async ({ page }) => {
  const response = await page.request.get(`${PREVIEW_SESSION_PATH}?as=1`);
  expect(response.status()).toBe(403);
});

test("`?as=` відкриває прев'ю від іншого акаунта", async ({ page }) => {
  const second = secondPreviewId();
  test.skip(!second, `у ${PREVIEW_USER_VAR} один id — другого акаунта немає`);

  await page.goto(`/?as=${second}`);
  expect(userIdFromInitData(await appInitData(page))).toBe(Number(second));
});

test("прев'ю має підписану сесію Telegram", async ({ page }) => {
  await page.goto("/");

  const initData = await appInitData(page);
  expect(
    initData,
    `initData порожній: у прев'ю не задані ${PREVIEW_TOKEN_VAR} / ${PREVIEW_USER_VAR}`,
  ).toContain("hash=");
  expect(initData).toContain("user=");
});

test("гейт допуску відкриває акаунт, а не порожній екран", async ({ page }) => {
  const errors = watchErrors(page);
  await page.goto("/");

  // Гейт малює каркас лише після `200 {allowed:true}` від `/api/user/access`.
  await expect(page.locator("header.wb-appbar")).toBeVisible();
  await expect(page.locator("nav.wb-tabbar")).toBeVisible();
  await expect(page).toHaveURL(/\/account$/);
  await expect(page.locator("h1.wb-appbar__title")).not.toBeEmpty();

  await page.screenshot({ path: `${ARTIFACTS}/01-account.png`, fullPage: true });
  expect(errors).toEqual([]);
});

test("смуга навігації переводить між екранами", async ({ page }) => {
  const errors = watchErrors(page);
  await page.goto("/account");

  for (const screen of SCREENS) {
    const item = page.locator(`.wb-tabbar-item[aria-label="${screen.label}"]`);
    await item.click();
    await expect(page).toHaveURL(screen.path);
    await expect(item).toHaveAttribute("aria-current", "page");
    await expect(page.locator("h1.wb-appbar__title")).not.toBeEmpty();
    await page.screenshot({
      path: `${ARTIFACTS}/02-${screen.label}.png`,
      fullPage: true,
    });
  }

  expect(errors).toEqual([]);
});

test("верстка влазить у 360px, смуга не тікає за екран", async ({ page }) => {
  await page.goto("/account");
  await expect(page.locator("nav.wb-tabbar")).toBeVisible();

  const metrics = await page.evaluate(() => {
    const bar = document.querySelector("nav.wb-tabbar");
    const rect = bar?.getBoundingClientRect();
    return {
      viewport: window.innerWidth,
      scrollWidth: document.documentElement.scrollWidth,
      tabbar: rect ? { height: rect.height, bottom: rect.bottom } : null,
    };
  });

  // Горизонтальної прокрутки на телефоні бути не може: вона завжди випадкова.
  expect(metrics.scrollWidth).toBeLessThanOrEqual(metrics.viewport + 1);
  if (!metrics.tabbar) throw new Error("Нижньої смуги немає в розмітці");
  expect(metrics.tabbar.height).toBeGreaterThanOrEqual(44);
  expect(metrics.tabbar.bottom).toBeLessThanOrEqual(781);
});

/**
 * Публічна сторінка, на якій видно серце.
 *
 * Адресу беремо зі списку самої платформи, а не з константи: рядок контенту
 * живе в живій базі, і перейменована сторінка не мусить ламати перевірку. Серце
 * має не кожен шаблон (внутрішній екран може володіти хедером), тому йдемо
 * списком — і кажемо про це, якщо серця немає ні в кого.
 */
async function openPageWithHeart(page: Page): Promise<string> {
  const initData = await appInitData(page);
  const list = await page.evaluate(async (header) => {
    const response = await fetch("/api/public/pages?limit=10", {
      headers: { "x-telegram-init-data": header },
    });
    return (await response.json()) as { pages?: { slug?: string }[] };
  }, initData);

  for (const item of list.pages ?? []) {
    if (!item.slug) continue;
    await page.goto(`/${item.slug}`);
    const heart = page.getByRole("button", { name: HEART }).first();
    const visible = await heart
      .waitFor({ state: "visible", timeout: 8000 })
      .then(() => true)
      .catch(() => false);
    if (visible) return item.slug;
  }
  throw new Error("жодна публічна сторінка не має серця в хедері");
}

test("лайк зберігається й видно в «Обраному»", async ({ page }) => {
  const errors = watchErrors(page);

  await page.goto("/favorites");
  const slug = await openPageWithHeart(page);
  const title = (await page.locator("h1.wb-appbar__title").textContent()) ?? "";

  // Стан на початок: серце вимкнене — тест сам прибирає за собою.
  const heart = page.getByRole("button", { name: HEART });
  if ((await heart.getAttribute("aria-pressed")) === "true") {
    await heart.click();
    await expect(heart).toHaveAttribute("aria-pressed", "false");
  }

  await heart.click();
  await expect(heart).toHaveAttribute("aria-pressed", "true");

  // Успіх видно: серце перефарбувалось, і плитка сказала про це словами —
  // **під хедером**, там, де щойно натиснули, а не над футером.
  const toast = page.getByRole("status");
  await expect(toast).toContainText("Додано в обране");
  // Залитий гліф, а не пофарбований контур: шлях саме `heart-solid`.
  expect(await heart.innerHTML()).toContain("M12 21.35");
  const toastBox = await toast.boundingBox();
  const appbarBox = await page.locator("header.wb-appbar").boundingBox();
  if (!toastBox || !appbarBox) throw new Error("немає рамок плитки або хедера");
  expect(toastBox.y).toBeGreaterThanOrEqual(appbarBox.y + appbarBox.height - 1);
  expect(toastBox.y).toBeLessThan(200);

  // Лайк переживає перезавантаження: серце показує відповідь сервера, а не клік.
  await page.reload();
  await expect(page.getByRole("button", { name: HEART })).toHaveAttribute("aria-pressed", "true");

  await page.goto("/favorites");
  const row = page.locator(".wb-favorites-row", { hasText: title });
  await expect(row).toBeVisible();

  // Число в футері й підпис над списком кажуть те саме, що видно: обидва
  // беруться з сервера, тож розійтись можуть лише помилкою.
  const rows = page.locator(".wb-favorites-row");
  const total = await rows.count();
  await expect(page.locator(".wb-favorites-count")).toHaveText(`${total} у обраному`);
  await expect(page.locator('.wb-tabbar-item[aria-label="Обране"] .wb-tabbar-badge')).toHaveText(
    String(total),
  );

  // Знак прибирання — смітник: серце тут читалось би як лайк, і ним знімали б
  // лайк випадково.
  expect(await row.locator(".wb-favorites-remove").innerHTML()).toContain("M3 6h18");
  expect(await row.innerHTML()).not.toContain("20.84 4.61");

  // Порядок — два вибори однієї людини: вибраний видно, і список йому підкоряється.
  await page.getByRole("button", { name: "За назвою" }).click();
  const byName = await rows.locator(".wb-favorites-title").allTextContents();
  expect(byName).toEqual([...byName].sort((a, b) => a.localeCompare(b, "uk")));

  await page.screenshot({ path: `${ARTIFACTS}/04-favorites.png`, fullPage: true });

  // Знімаємо з тієї ж сторінки, тим же серцем: прибирання йде окремим запитом.
  await page.goto(`/${slug}`);
  const again = page.getByRole("button", { name: HEART });
  await expect(again).toHaveAttribute("aria-pressed", "true");
  await again.click();
  await expect(again).toHaveAttribute("aria-pressed", "false");

  await page.goto("/favorites");
  await expect(page.locator(".wb-favorites-row", { hasText: title })).toBeHidden();
  expect(errors).toEqual([]);
});

test("інші екрани відкриваються без помилок у консолі", async ({ page }) => {
  const errors = watchErrors(page);

  for (const path of [
    "/services",
    "/favorites",
    "/users",
    "/ads",
    "/games",
    "/notes",
    "/contacts",
  ]) {
    await page.goto(path);
    await expect(page.locator("nav.wb-tabbar"), `${path} не відрендерився`).toBeVisible();
  }

  await page.screenshot({ path: `${ARTIFACTS}/03-contacts.png`, fullPage: true });
  expect(errors).toEqual([]);
});
