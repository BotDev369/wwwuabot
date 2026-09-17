/**
 * Склад меню профілю — порядок і чесність пунктів.
 *
 * Порядок тут не косметика: його задано **згори вниз**, і перевернути його
 * випадково дуже легко (у завданні пункти перелічені знизу вгору). Тому він і
 * зафіксований тестом: «Тема» мусить бути останньою, профільні розділи —
 * вище, а заглушки — називатись заглушками ще до дотику.
 */

import { describe, expect, it, vi } from "vitest";
import { buildProfileItems, CONTACTS_PATH, NOTES_PATH } from "./profile-menu";

const onOpenTheme = vi.fn();

describe("меню профілю", () => {
  const items = buildProfileItems({ onOpenTheme });

  it("шість пунктів, і жодного зайвого", () => {
    expect(items).toHaveLength(6);
  });

  it("«Тема» стоїть у самому низу, профільні розділи — вище", () => {
    expect(items.map((item) => item.key)).toEqual([
      "contacts",
      "locations",
      "mydate",
      "pages",
      "notes",
      "theme",
    ]);
  });

  it("«Тема» відкриває панель, а не веде на адресу", () => {
    const theme = items.find((item) => item.key === "theme");
    expect(theme?.href).toBeUndefined();
    theme?.onSelect?.();
    expect(onOpenTheme).toHaveBeenCalledOnce();
  });

  it("готові пункти ведуть на свої екрани", () => {
    const notes = items.find((item) => item.key === "notes");
    expect(notes?.href).toBe(NOTES_PATH);
    // Контакти більше не заглушка: лінки-запрошення вже мають власний екран.
    expect(items.find((item) => item.key === "contacts")?.href).toBe(CONTACTS_PATH);
    // МоїДати — рядок контенту, тож адреса будується зі `slug` (AGENTS.md §7),
    // а не вигадується рядком на місці.
    expect(items.find((item) => item.key === "mydate")?.href).toBe("/mydate");
  });

  it("заглушки позначені заглушками й мають пояснення", () => {
    const soon = items.filter((item) => item.status === "soon").map((item) => item.key);
    expect(soon).toEqual(["locations", "pages"]);
    for (const item of items.filter((entry) => entry.status === "soon")) {
      // Заглушка без пояснення — це та сама тиша, лише з іншим виглядом.
      expect(item.hint, item.key).toBeTruthy();
      expect(item.href, item.key).toBeUndefined();
    }
  });
});

/* Панель теми описана не тут: вона більше не список пунктів, а спільна
   `ThemeColorPanel` (`@wwwuabot/shared`), і її правила — три обов'язкові
   кольори, виведена схема, читабельність — читає `user-colors.test.ts` у
   тому ж пакеті, де вони живуть. Думати про них удвох означало б мати дві
   правди про один вибір. */
