/**
 * Тести тексту нотатки — правило, однакове для браузера й сервера.
 *
 * @module @wwwuabot/shared/notes
 */

import { describe, expect, it } from "vitest";
import { MAX_NOTE_LENGTH, sanitizeNoteText } from "./text";

describe("sanitizeNoteText", () => {
  it("обрізає краї, але не чіпає порожні рядки всередині", () => {
    expect(sanitizeNoteText("  Куку\n\nдругий абзац  ")).toBe("Куку\n\nдругий абзац");
  });

  it("тримає стелю довжини", () => {
    expect(sanitizeNoteText("я".repeat(MAX_NOTE_LENGTH + 100))).toHaveLength(MAX_NOTE_LENGTH);
  });

  it("те, що не рядок, — це порожній текст, а не «undefined»", () => {
    expect(sanitizeNoteText(undefined)).toBe("");
    expect(sanitizeNoteText(42)).toBe("");
    expect(sanitizeNoteText({ text: "привіт" })).toBe("");
  });
});
