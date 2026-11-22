import { describe, expect, it } from "vitest";
import { botMessageText } from "./bot-message-text";
import type { BotMessageRow } from "../../shared/api/users.api";

function row(overrides: Partial<BotMessageRow>): BotMessageRow {
  return {
    id: 1,
    direction: "in",
    message_id: 10,
    kind: "text",
    text: "",
    meta: null,
    created_at: "2026-11-22 10:00:00",
    edited_at: null,
    deleted_at: null,
    ...overrides,
  };
}

describe("botMessageText", () => {
  it("звичайний текст віддає як є", () => {
    expect(botMessageText(row({ text: "  Галя Шоп  " }))).toBe("Галя Шоп");
  });

  it("rich зводить до тексту без розмітки й кнопок", () => {
    const text = botMessageText(
      row({
        kind: "rich",
        text: "<style>.a{}</style><h1>Знайдено</h1><p>Галяшоп</p><tg-button>Відкрити</tg-button>",
      }),
    );
    expect(text).toContain("Знайдено");
    expect(text).toContain("Галяшоп");
    expect(text).not.toContain("<");
    expect(text).not.toContain(".a{}");
  });

  it("довгий rich обрізає з трьома крапками", () => {
    const text = botMessageText(row({ kind: "rich", text: `<p>${"а".repeat(900)}</p>` }));
    expect(text.endsWith("…")).toBe(true);
    expect(text.length).toBeLessThan(700);
  });

  it("без тексту показує вид, а не порожнечу", () => {
    expect(botMessageText(row({ kind: "photo" }))).toBe("[фото]");
    expect(botMessageText(row({ kind: "sticker" }))).toBe("[стікер]");
    expect(botMessageText(row({ kind: "other" }))).toBe("[вкладення]");
  });
});
