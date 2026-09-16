/**
 * Тести хештегів.
 *
 * Правила тут — не косметика: саме вони вирішують, чи стане введене тегом і чи
 * знайдеться нотатка потім. Тому перевіряємо краєвиди: знак `#`, пробіли й коми
 * всередині, повтори, регістр і стелі.
 */

import { describe, expect, it } from "vitest";
import { MAX_NOTE_TAGS, MAX_TAG_LENGTH, addTags, normalizeTag, parseTags, removeTag } from "./tags";

describe("normalizeTag", () => {
  it("прибирає знак #, пробіли й коми — і знижує регістр", () => {
    expect(normalizeTag("#Київ")).toBe("київ");
    expect(normalizeTag("  Гар ячі  ")).toBe("гарячі");
    expect(normalizeTag("а,б")).toBe("аб");
  });

  it("не дає хештегу перерости стелю довжини", () => {
    expect(normalizeTag("я".repeat(100))).toHaveLength(MAX_TAG_LENGTH);
  });

  it("порожнє й саме лише # не стають тегом", () => {
    expect(normalizeTag("")).toBe("");
    expect(normalizeTag("###")).toBe("");
  });
});

describe("parseTags", () => {
  it("ріже введене по пробілах і комах", () => {
    expect(parseTags("київ, свято 2026")).toEqual(["київ", "свято", "2026"]);
  });

  it("повтор в одному рядку не дублюється", () => {
    expect(parseTags("київ київ")).toEqual(["київ", "київ"]);
  });
});

describe("addTags", () => {
  it("додає нові теги й не додає повторів", () => {
    expect(addTags(["київ"], "свято, київ")).toEqual(["київ", "свято"]);
  });

  it("не додає нічого, якщо вводили саме розділювачі — і повертає той самий масив", () => {
    const tags = ["київ"];
    expect(addTags(tags, " , ")).toBe(tags);
  });

  it("тримає стелю кількості", () => {
    const tags = addTags(
      [],
      Array.from({ length: MAX_NOTE_TAGS + 5 }, (_, i) => `т${i}`).join(" "),
    );
    expect(tags).toHaveLength(MAX_NOTE_TAGS);
  });
});

describe("removeTag", () => {
  it("прибирає тег незалежно від того, як його записали", () => {
    expect(removeTag(["київ", "свято"], "#Київ")).toEqual(["свято"]);
  });

  it("невідомий тег нічого не змінює", () => {
    const tags = ["київ"];
    expect(removeTag(tags, "свято")).toBe(tags);
  });
});
