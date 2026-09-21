/**
 * Розділи хабу профілю — те, що лишилось після переїзду.
 *
 * Хаб звузився до одного пункту, і саме це легко зіпсувати непомітно: досить
 * повернути сюди список інструментів — і знову з'явиться **друга** навігація
 * по тих самих екранах, які вже мають свій хаб «Створити». Тест тримає дві
 * речі: що в хабу рівно те, що про людину, і що «Тема» лишається **дією**, а
 * не адресою.
 *
 * @module web-platform-dev/src/pages/profile-sections.test
 */

import { describe, expect, it, vi } from "vitest";
import { buildProfileSections } from "./profile-sections";

const onOpenTheme = vi.fn();

describe("розділи хабу профілю", () => {
  const items = buildProfileSections({ onOpenTheme });

  it("лише «Тема»: інструменти людини переїхали в хаб «Створити»", () => {
    expect(items.map((item) => item.key)).toEqual(["theme"]);
  });

  it("«Тема» — дія, а не адреса", () => {
    const theme = items[0];
    expect(theme.href).toBeUndefined();
    theme.onSelect?.();
    expect(onOpenTheme).toHaveBeenCalledOnce();
  });

  it("жодного підписа «Мій / Мої»", () => {
    // Хаб відкривають зі свого профілю, тож приналежність очевидна — а префікс
    // лише відсуває те слово, за яким пункт упізнають.
    for (const item of items) expect(item.label, item.key).not.toMatch(/^Мо[їй]/);
  });
});
