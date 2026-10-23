import { describe, expect, it } from "vitest";
import type { AppContext } from "../../shared/types/env";
import { buildUserEvent } from "./builder";

/** Мінімальний контекст: усе, що читає побудовник, — `from` і вид оновлення. */
function ctx(update: Record<string, unknown>, from: Record<string, unknown> | null = { id: 7 }) {
  return { from, ...update } as unknown as AppContext;
}

describe("подія з оновлення Telegram", () => {
  it("команда пишеться без бота-адресата й без аргументів", () => {
    const event = buildUserEvent(ctx({ message: { text: "/start@wwwuabot payload" } }), "ok");

    expect(event).toMatchObject({
      userId: 7,
      surface: "bot",
      kind: "command",
      action: "/start",
      status: "ok",
    });
  });

  it("звичайний текст лишається текстом, а не командою", () => {
    expect(buildUserEvent(ctx({ message: { text: "привіт" } }), "ok")).toMatchObject({
      kind: "message",
      action: "привіт",
    });
  });

  it("кнопка описується своїм callback_data", () => {
    expect(buildUserEvent(ctx({ callbackQuery: { data: "menu:trackers" } }), "ok")).toMatchObject({
      kind: "callback",
      action: "menu:trackers",
    });
  });

  it("вкладення називає вид, а не службовий file_id", () => {
    const event = buildUserEvent(
      ctx({ message: { photo: [{ file_id: "ABC", file_unique_id: "x" }] } }),
      "ok",
    );

    expect(event).toMatchObject({ action: "[photo]", details: "photo" });
    expect(JSON.stringify(event)).not.toContain("ABC");
  });

  it("підпис до вкладення лишається дією, вид — подробицею", () => {
    expect(
      buildUserEvent(ctx({ message: { document: { file_id: "D" }, caption: "рахунок" } }), "ok"),
    ).toMatchObject({ action: "рахунок", details: "document" });
  });

  it("правка й inline-запит не змішуються з новим повідомленням", () => {
    expect(buildUserEvent(ctx({ editedMessage: { text: "виправлено" } }), "ok")).toMatchObject({
      kind: "edited_message",
      action: "виправлено",
    });
    expect(buildUserEvent(ctx({ inlineQuery: { query: "трекер" } }), "ok")).toMatchObject({
      kind: "inline_query",
      action: "трекер",
    });
  });

  it("порожній inline-запит не стає рядком без дії", () => {
    expect(buildUserEvent(ctx({ inlineQuery: { query: "" } }), "ok")).toMatchObject({
      action: "порожній запит",
    });
  });

  it("оновлення без людини й без дії не пишеться", () => {
    expect(buildUserEvent(ctx({}, null), "ok")).toBeNull();
    expect(buildUserEvent(ctx({ myChatMember: {} }), "ok")).toBeNull();
  });

  it("помилка лишається в тій самій події, зі статусом", () => {
    expect(buildUserEvent(ctx({ message: { text: "текст" } }), "error")).toMatchObject({
      action: "текст",
      status: "error",
    });
  });
});
