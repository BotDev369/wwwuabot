/**
 * Склад ігор — те, що ламається мовчки.
 *
 * Гру видно з трьох місць одразу, і розійтися їм легко: **пункт у списку**
 * (склад у `games.ts`), **екран** (`GameView`) і **маршрут** (роутер). Забутий
 * рядок у мапі не ламає ні збірку, ні тести — людина просто бачить порожній
 * екран, — а забутий маршрут кидає ключ у catch-all, де відкривається
 * сторінка контенту під назвою «games».
 *
 * @module web-platform-dev/src/pages/games/games.test
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { GAMES_PATH } from "../../app/routes";
import { SERVICES } from "../services-list";
import { GAMES, gameOption, gamePath } from "./games";

/** Корінь оболонки — від цього файлу, а не від робочої теки запуску. */
const WORKSPACE_ROOT = fileURLToPath(new URL("../../../", import.meta.url));

/** Вихідники читаємо як текст: маршрути — це розмітка, а не значення. */
function source(...parts: string[]): string {
  return readFileSync(join(WORKSPACE_ROOT, ...parts), "utf8");
}

describe("склад ігор", () => {
  it("кожна гра має унікальний ключ і підпис", () => {
    // Знака в пункту немає навмисно: рядок списку — вміст, а вміст
    // знаків не носить (правило 23). Див. `GameOption`.
    const keys = GAMES.map((game) => game.key);
    expect(new Set(keys).size).toBe(keys.length);
    for (const game of GAMES) {
      expect(game.label, game.key).toBeTruthy();
    }
  });

  it("ключі — латиниця: вони ж сегменти адреси, а не підписи", () => {
    // Літери **й цифри**: у «2048» ключ — саме `2048`, і адреса `/games/2048`
    // читається краще за будь-яку вигадану назву тієї ж гри.
    for (const game of GAMES) expect(game.key).toMatch(/^[a-z0-9]+$/);
  });

  it("невідомий ключ не валить екран, а каже, що гри немає", () => {
    expect(gameOption("шахи")).toBeNull();
    expect(gameOption(null)).toBeNull();
    expect(gameOption("tictactoe")?.key).toBe("tictactoe");
  });
});

describe("адреси ігор", () => {
  it("список і партія — різні адреси під одним сегментом", () => {
    expect(GAMES_PATH).toBe("/games");
    expect(gamePath("rps")).toBe("/games/rps");
  });
});

describe("звʼязок зі «Сервісами»", () => {
  it("«Ігри» стоять рядком списку — інакше екран недосяжний", () => {
    // Пункт списку — єдиний вхід до екрана: без нього `/games` існує лише
    // для того, хто знає адресу.
    const games = SERVICES.find((service) => service.key === "games");
    expect(games?.to).toBe(GAMES_PATH);
  });

  it("кожна гра має екран у мапі `GameView`", () => {
    // Мапа типізована `Record<GameKey, …>`, тож компілятор тут перший сторож;
    // тест стежить за другим — що в мапі саме **екран**, а не заглушка.
    // Лапки знімаємо: ключі бувають і в лапках («2048» — не ім'я, а рядок
    // адреси), і без них, а перевіряємо ми наявність ключа, а не написання.
    const view = source("src", "pages", "games", "GameView.tsx").replace(/"/g, "");
    for (const game of GAMES) expect(view, game.key).toContain(`${game.key}:`);
  });

  it("⛔ кожна гра має маршрут — інакше ключ потрапляє в catch-all", () => {
    const router = source("src", "app", "router.tsx");
    expect(router).toContain("GAMES_ROUTE");
    expect(router).toContain("<GamePage />");
    expect(router).toContain("<GamesPage />");
  });

  it("список ігор малює список, а не дошку", () => {
    // Партія живе на своєму екрані з власною адресою: дошка всередині списку
    // не мала б ні «назад», ні посилання.
    const list = source("src", "pages", "games", "GamesList.tsx");
    expect(list).toContain("gamePath");
    expect(list).toContain("MenuList");
  });
});

describe("власний світ гри", () => {
  it("⛔ гра йде на весь екран, а не карткою в сторінці", () => {
    // Партію просили повноекранною не раз — тож це не стиль, а вимога: у ній
    // не має бути ні рядка заголовка, ні футера. Тест ловить повернення до
    // «форми з грою», яке саме собою нічого не ламає (тому його легко зробити
    // знову).
    const page = source("src", "pages", "games", "GamePage.tsx");
    expect(page).toContain("wb-game-screen");
    // Палітру носить саме екран: без неї верхній рядок лишився б у темі застосунку
    expect(page).toContain("data-game={game.key}");
  });

  it("⛔ кожна гра має свою палітру — інакше сцена стає формою", () => {
    // Палітра — частина гри, а не оздоблення: без блоку `[data-game=…]` сцена
    // падає в токени застосунку, і замість арени на екрані знову форма. Блок
    // живе в спільному `games.css` — тобто за межами гри, яку пишуть, і
    // забути його легко. Тому стежить тест, а не око.
    const css = source("..", "packages", "shared", "src", "styles", "games.css");
    for (const game of GAMES) expect(css, game.key).toContain(`[data-game="${game.key}"]`);
  });
});
