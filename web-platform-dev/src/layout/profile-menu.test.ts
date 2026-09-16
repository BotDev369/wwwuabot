/**
 * Склад меню профілю — порядок і чесність пунктів.
 *
 * Порядок тут не косметика: його задано **згори вниз**, і перевернути його
 * випадково дуже легко (у завданні пункти перелічені знизу вгору). Тому він і
 * зафіксований тестом: «Тема» мусить бути останньою, профільні розділи —
 * вище, а заглушки — називатись заглушками ще до дотику.
 */

import { describe, expect, it, vi } from "vitest";
import { buildProfileItems, buildThemeItems, NOTES_PATH } from "./profile-menu";

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
    // МоїДати — рядок контенту, тож адреса будується зі `slug` (AGENTS.md §7),
    // а не вигадується рядком на місці.
    expect(items.find((item) => item.key === "mydate")?.href).toBe("/mydate");
  });

  it("заглушки позначені заглушками й мають пояснення", () => {
    const soon = items.filter((item) => item.status === "soon").map((item) => item.key);
    expect(soon).toEqual(["contacts", "locations", "pages"]);
    for (const item of items.filter((entry) => entry.status === "soon")) {
      // Заглушка без пояснення — це та сама тиша, лише з іншим виглядом.
      expect(item.hint, item.key).toBeTruthy();
      expect(item.href, item.key).toBeUndefined();
    }
  });
});

describe("панель теми", () => {
  const choice = {
    brand: "apple" as const,
    scheme: "dark" as const,
    setBrand: vi.fn(),
    setScheme: vi.fn(),
  };

  it("показує обидві дизайн-системи й обидві схеми", () => {
    expect(buildThemeItems(choice).map((item) => item.key)).toEqual([
      "brand-apple",
      "brand-android",
      "scheme-light",
      "scheme-dark",
    ]);
  });

  it("вибране позначає галочкою — те саме, що стоїть у темі", () => {
    const selected = buildThemeItems(choice)
      .filter((item) => item.selected)
      .map((item) => item.key);
    expect(selected).toEqual(["brand-apple", "scheme-dark"]);
  });

  it("дотик змінює саме ту вісь, якої стосується пункт", () => {
    const setBrand = vi.fn();
    const setScheme = vi.fn();
    const items = buildThemeItems({ ...choice, setBrand, setScheme });

    items.find((item) => item.key === "brand-android")?.onSelect?.();
    items.find((item) => item.key === "scheme-light")?.onSelect?.();

    expect(setBrand).toHaveBeenCalledWith("android");
    expect(setScheme).toHaveBeenCalledWith("light");
  });
});
