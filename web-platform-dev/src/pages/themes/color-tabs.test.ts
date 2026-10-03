/**
 * Сторож меню теми: **тема — це меню, а не сторінки**.
 *
 * Тут ламається рівно те, що вже ламалося двічі: тема знову стає розділом з
 * адресами (`/profile/theme/...`), і тоді з'являються другий спосіб відкрити
 * палітри, друга смуга футера й друга копія списку розділів. Тому склад
 * перевіряється разом: вкладки в пункті «Кольори теми», кнопка редактора в
 * кінці цього пункту, і жодного маршруту теми в роутері.
 *
 * CSS і TSX читаються як текст: розбору тут немає (`environment: node`), так
 *
 * @module web-platform-dev/src/pages/themes/color-tabs.test
 */

/// <reference types="node" />

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { COLOR_TABS, DEFAULT_COLOR_TAB } from "./color-tabs";

const WORKSPACE_ROOT = fileURLToPath(new URL("../../../", import.meta.url));

function source(...parts: string[]): string {
  return readFileSync(join(WORKSPACE_ROOT, ...parts), "utf8");
}

const MENU = source("src", "pages", "themes", "ThemeMenu.tsx");

describe("меню теми", () => {
  it("⛔ вкладки кольорів — у пункті «Кольори теми», і перша з них «Шаблони»", () => {
    expect(COLOR_TABS.map((tab) => tab.label)).toEqual([
      "Шаблони",
      "Мої кольори",
      "Публічні кольори",
    ]);
    // Шаблони є завжди, а свої й публічні — ні: порожня перша вкладка
    // читалася б як поламаний пункт.
    expect(DEFAULT_COLOR_TAB).toBe("templates");
    expect(MENU).toContain("DEFAULT_COLOR_TAB");
    expect(MENU).toContain("colorsBody={");
  });

  it("⛔ панель має кнопку редактора і жодного дубля обраної теми", () => {
    // Другий рядок «обрано: …» дублював виділення картки — про обране каже
    // тільки картка, тож у меню більше немає чого показувати.
    expect(MENU).not.toContain("colorsHint=");
    expect(MENU).toContain("Налаштувати власну");
    // Редактор — модалка, а не сторінка: тема не має власної адреси.
    expect(MENU).toContain("<ThemeEditorModal");
  });

  it("⛔ сторінок теми в роутері більше немає", () => {
    const router = source("src", "app", "router.tsx");
    expect(router).not.toContain("ThemeLayout");
    expect(router).not.toContain("ThemeHubPage");
    // Палітра веде в меню з каркасу, а не в маршрут.
    const shell = source("src", "layout", "PlatformShell.tsx");
    expect(shell).toContain("<ThemeMenu");
  });
});
