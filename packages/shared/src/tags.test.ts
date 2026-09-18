/**
 * Тести хештегів — правил, за якими введене стає даними.
 *
 * Правила тут не косметика: саме вони вирішують, чи стане введене тегом і чи
 * знайдеться запис потім. Тому перевіряємо краєвиди (`#`, пробіли й коми
 * всередині, повтори, регістр, стелі) і окремо — те, що прийшло **ззовні**:
 * клієнт і колонка `tags` (у нотатки й у контакту) не мають права нічого
 * зламати.
 *
 * @module @wwwuabot/shared/tags
 */

import { describe, expect, it } from "vitest";
import {
  MAX_NOTE_TAGS,
  MAX_TAG_LENGTH,
  addTags,
  normalizeTag,
  parseTags,
  parseTagsJson,
  removeTag,
  sanitizeTags,
  tagsToJson,
} from "./tags";

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

describe("sanitizeTags", () => {
  it("не вірить тому, що прийшло ззовні: не масив і не рядки — не теги", () => {
    expect(sanitizeTags(null)).toEqual([]);
    expect(sanitizeTags("київ")).toEqual([]);
    expect(sanitizeTags([1, {}, "київ"])).toEqual(["київ"]);
  });

  it("нормалізує, прибирає повтори й тримає стелю", () => {
    expect(sanitizeTags(["#Київ", "київ", " Свято "])).toEqual(["київ", "свято"]);
    const many = sanitizeTags(Array.from({ length: MAX_NOTE_TAGS + 3 }, (_, i) => `т${i}`));
    expect(many).toHaveLength(MAX_NOTE_TAGS);
  });

  it("порожній рядок і самі розділювачі не стають тегами", () => {
    expect(sanitizeTags([" ", "#", ",,"])).toEqual([]);
  });
});

describe("tagsToJson / parseTagsJson", () => {
  it("записує саме те, що потім прочитає", () => {
    expect(parseTagsJson(tagsToJson(["#Київ", 5, "київ", "свято"]))).toEqual(["київ", "свято"]);
  });

  it("зіпсований JSON — це порожній список, а не виняток", () => {
    expect(parseTagsJson("{не json")).toEqual([]);
    expect(parseTagsJson(null)).toEqual([]);
    expect(parseTagsJson("")).toEqual([]);
  });

  it("приймає й колонку, яку SQLite віддав уже розібраною", () => {
    expect(parseTagsJson(["київ"])).toEqual(["київ"]);
  });
});
