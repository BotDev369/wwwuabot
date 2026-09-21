/**
 * Склад ігор — те, що ламається мовчки.
 *
 * Гру видно з трьох місць одразу, і розійтися їм легко: **пункт у вкладці**
 * (склад у `games.ts`), **екран** (`GameView`) і **маршрут** (роутер). Забутий
 * рядок у мапі не ламає ні збірку, ні тести — людина просто бачить порожній
 * екран, — а забутий маршрут кидає ключ у catch-all, де відкривається
 * сторінка контенту під назвою «g».
 *
 * @module web-platform-dev/src/pages/games/games.test
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { SPACE_GAME_PATH, SPACE_PATH } from "../../app/routes";
import { SPACE_TABS, spaceTab } from "../space-tabs";
import { GAMES, gameOption, gamePath } from "./games";

/** Корінь оболонки — від цього файлу, а не від робочої теки запуску. */
const WORKSPACE_ROOT = fileURLToPath(new URL("../../../", import.meta.url));

/** Вихідники читаємо як текст: маршрути — це розмітка, а не значення. */
function source(...parts: string[]): string {
  return readFileSync(join(WORKSPACE_ROOT, ...parts), "utf8");
}

describe("склад ігор", () => {
  it("кожна гра має унікальний ключ, підпис і знак", () => {
    const keys = GAMES.map((game) => game.key);
    expect(new Set(keys).size).toBe(keys.length);
    for (const game of GAMES) {
      expect(game.label, game.key).toBeTruthy();
      expect(game.icon, game.key).toBeTruthy();
    }
  });

  it("ключі — латиниця: вони ж сегменти адреси, а не підписи", () => {
    for (const game of GAMES) expect(game.key).toMatch(/^[a-z]+$/);
  });

  it("невідомий ключ не валить екран, а каже, що гри немає", () => {
    expect(gameOption("шахи")).toBeNull();
    expect(gameOption(null)).toBeNull();
    expect(gameOption("tictactoe")?.key).toBe("tictactoe");
  });
});

describe("адреси ігор", () => {
  it("лежать під Простором, окремим сегментом від вкладки", () => {
    expect(SPACE_PATH).toBe("/space");
    expect(SPACE_GAME_PATH).toBe("/space/g");
    expect(gamePath("rps")).toBe("/space/g/rps");
  });
});

describe("звʼязок із Простором", () => {
  it("кожна гра має екран у мапі `GameView`", () => {
    // Мапа типізована `Record<GameKey, …>`, тож компілятор тут перший сторож;
    // тест стежить за другим — що в мапі саме **екран**, а не заглушка.
    const view = source("src", "pages", "games", "GameView.tsx");
    for (const game of GAMES) expect(view, game.key).toContain(`${game.key}:`);
  });

  it("⛔ кожна гра має маршрут — інакше ключ потрапляє в catch-all", () => {
    const router = source("src", "app", "router.tsx");
    expect(router).toContain("SPACE_GAME_ROUTE");
    expect(router).toContain("<SpaceGamePage />");
  });

  it("вкладка «Ігри» працює, тож нічого не обіцяє", () => {
    // Заглушка, яку забули зняти, гірша за відсутню: екран працює, а вкладка
    // все ще каже «ще в розробці» — і людина в нього не загляне.
    expect(spaceTab("games").hint).toBeUndefined();
    expect(spaceTab("games").soon).toBeUndefined();
    expect(SPACE_TABS.map((tab) => tab.label)).toContain("Ігри");
  });

  it("вкладка ігор малює список, а не дошку", () => {
    // Партія живе на своєму екрані з власною адресою: дошка всередині списку
    // не мала б ні «назад», ні посилання.
    const tab = source("src", "pages", "games", "SpaceGamesTab.tsx");
    expect(tab).toContain("gamePath");
    expect(tab).toContain("MenuList");
  });
});
