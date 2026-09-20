/**
 * Розділи хабу профілю — порядок, підписи, чесність пунктів і вибір вигляду.
 *
 * Порядок тут не косметика: він заданий **абеткою**, а в коді пункти лежать
 * не за абеткою, тож переставити їх випадково дуже легко. Тест тримає три
 * речі, які ламаються мовчки: абетку (порівнянням у локалі `uk`), відсутність
 * префікса «Мій / Мої» в підписах і те, що заглушка називає себе заглушкою ще
 * до дотику. Плюс — що «Дати» не повернулись у хаб як друга копія футера.
 */

import { afterEach, describe, expect, it, vi } from "vitest";
import { CONTACTS_PATH, NOTES_PATH } from "../app/routes";
import {
  buildProfileSections,
  DEFAULT_SECTIONS_LAYOUT,
  readSectionsLayout,
  SECTIONS_LAYOUT_OPTIONS,
  writeSectionsLayout,
} from "./profile-sections";

const onOpenTheme = vi.fn();

describe("розділи хабу профілю", () => {
  const items = buildProfileSections({ onOpenTheme });

  it("п'ять розділів, і жодного зайвого", () => {
    expect(items).toHaveLength(5);
  });

  it("розділи стоять за абеткою — А→Я", () => {
    const labels = items.map((item) => item.label);
    expect(labels).toEqual(["Контакти", "Локації", "Нотатки", "Сторінки", "Тема"]);
    // Абетка перевіряється мовою, а не оком: кирилиця має літери (Ґ, Є, І, Ї),
    // яких звичайний `sort()` не знає — він ставить за кодом символа.
    expect(labels).toEqual([...labels].sort((a, b) => a.localeCompare(b, "uk")));
  });

  it("жодного підписа «Мій / Мої»", () => {
    // Хаб відкривають зі свого профілю, тож приналежність очевидна — а префікс
    // лише відсуває те слово, за яким пункт упізнають.
    for (const item of items) expect(item.label, item.key).not.toMatch(/^Мо[їй]/);
  });

  it("«Тема» — дія, а не адреса", () => {
    const theme = items.find((item) => item.key === "theme");
    expect(theme?.href).toBeUndefined();
    theme?.onSelect?.();
    expect(onOpenTheme).toHaveBeenCalledOnce();
  });

  it("готові розділи ведуть на свої екрани", () => {
    expect(items.find((item) => item.key === "notes")?.href).toBe(NOTES_PATH);
    expect(items.find((item) => item.key === "contacts")?.href).toBe(CONTACTS_PATH);
    // Адреси — ті самі константи, що в роутера: два літерали розійшлися б, і
    // пункт вів би на 404.
    expect(NOTES_PATH).toBe("/notes");
    expect(CONTACTS_PATH).toBe("/contacts");
  });

  it("«Дати» лишаються пунктом футера, а не розділом хабу", () => {
    // Футер видно на кожному екрані, тож друга копія пункту в хабі — це двоє
    // дверей в одне місце.
    expect(items.some((item) => item.key === "mydate")).toBe(false);
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

describe("вибір вигляду розділів", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("рівно два варіанти, і в кожного є ім'я та свій знак", () => {
    expect(SECTIONS_LAYOUT_OPTIONS.map((option) => option.key)).toEqual(["blocks", "rows"]);
    expect(DEFAULT_SECTIONS_LAYOUT).toBe("blocks");

    const icons = SECTIONS_LAYOUT_OPTIONS.map((option) => option.icon);
    expect(new Set(icons).size).toBe(icons.length);
    for (const option of SECTIONS_LAYOUT_OPTIONS)
      expect(option.label.trim(), option.key).toBeTruthy();
  });

  it("без сховища — типове, а не помилка", () => {
    // `environment: node`, тож localStorage тут і справді немає: у WebView
    // Telegram він теж буває заблокований, і падіння зламало б увесь хаб.
    expect(readSectionsLayout()).toBe(DEFAULT_SECTIONS_LAYOUT);
    expect(() => writeSectionsLayout("rows")).not.toThrow();
  });

  it("вибір переживає перемонтування екрана", () => {
    const store = new Map<string, string>();
    vi.stubGlobal("localStorage", {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => void store.set(key, value),
    });

    writeSectionsLayout("rows");
    expect(readSectionsLayout()).toBe("rows");
    writeSectionsLayout("blocks");
    expect(readSectionsLayout()).toBe("blocks");
  });

  it("сміття у сховищі дає типовий вигляд, а не помилку", () => {
    vi.stubGlobal("localStorage", {
      getItem: () => "портрет",
      setItem: () => {},
    });
    expect(readSectionsLayout()).toBe(DEFAULT_SECTIONS_LAYOUT);
  });
});
