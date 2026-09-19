/**
 * Склад меню профілю — порядок, підписи й чесність пунктів.
 *
 * Порядок тут не косметика: він заданий **абеткою**, а в коді пункти лежать
 * не за абеткою, тож переставити їх випадково дуже легко. Тест тримає три речі,
 * які ламаються мовчки: абетку (порівнянням у локалі `uk`), відсутність
 * префікса «Мій / Мої» в підписах і те, що заглушка називає себе заглушкою ще
 * до дотику.
 */

import { describe, expect, it, vi } from "vitest";
import { buildProfileItems, CONTACTS_PATH, hasBottomBar, NOTES_PATH } from "./profile-menu";

const onOpenTheme = vi.fn();

describe("меню профілю", () => {
  const items = buildProfileItems({ onOpenTheme });

  it("шість пунктів, і жодного зайвого", () => {
    expect(items).toHaveLength(6);
  });

  it("пункти стоять за абеткою — А→Я", () => {
    const labels = items.map((item) => item.label);
    expect(labels).toEqual(["Дати", "Контакти", "Локації", "Нотатки", "Сторінки", "Тема"]);
    // Абетка перевіряється мовою, а не оком: кирилиця має літери (Ґ, Є, І, Ї),
    // яких звичайний `sort()` не знає — він ставить за кодом символа.
    expect(labels).toEqual([...labels].sort((a, b) => a.localeCompare(b, "uk")));
  });

  it("жодного підписа «Мій / Мої»", () => {
    // Меню відкривають зі свого профілю, тож приналежність очевидна — а
    // префікс лише відсуває те слово, за яким пункт упізнають.
    for (const item of items) expect(item.label, item.key).not.toMatch(/^Мо[їй]/);
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

  it("смуга внизу — лише в списку розділів", () => {
    // Смуга несе перемикач вигляду карток і «Закрити» — обидва мають сенс лише
    // там, де картки видно. У панелі теми перемикати нічого, а її власний вихід
    // — ✕ у шапці та «Зберегти і закрити»: смуга додала б їй другий вихід
    // посеред екрана (саме так вона й читалась зайвою).
    expect(hasBottomBar("list")).toBe(true);
    expect(hasBottomBar("theme")).toBe(false);
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
