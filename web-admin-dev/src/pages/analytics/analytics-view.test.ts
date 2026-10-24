import { describe, expect, it } from "vitest";
import type { UserEvent } from "@wwwuabot/shared/events";
import {
  EVENT_PAGE_SIZE,
  actionMethod,
  actionText,
  clockStamp,
  eventPhrase,
  mergeEvents,
  presetRange,
  rangeFromInputs,
  refreshRange,
  toDateTimeInput,
  userLabel,
  userMeta,
} from "./analytics-view";

const event = (id: number): UserEvent => ({
  id,
  userId: 7,
  surface: "bot",
  kind: "command",
  action: "/start",
  details: null,
  status: "ok",
  createdAt: "2026-10-01 12:00:00",
  firstName: null,
  lastName: null,
  username: null,
});

describe("помічники аналітики", () => {
  it("проміжок рахується назад від «зараз»", () => {
    const now = new Date("2026-10-23T12:00:00Z");
    expect(presetRange(24, now)).toEqual({
      from: "2026-10-22T12:00:00.000Z",
      to: "2026-10-23T12:00:00.000Z",
    });
  });

  it("оновлення зсуває готове вікно, а ручний проміжок не чіпає", () => {
    const window = presetRange(24, new Date("2026-10-23T12:00:00Z"));
    const later = refreshRange(window, 24, new Date("2026-10-23T13:00:00Z"));
    expect(later.to).toBe("2026-10-23T13:00:00.000Z");
    expect(later.from).toBe("2026-10-22T13:00:00.000Z");
    expect(refreshRange(window, null, new Date("2026-10-23T13:00:00Z"))).toBe(window);
  });

  it("мітка оновлення — локальний час із секундами", () => {
    const ms = new Date(2026, 9, 23, 20, 5, 9).getTime();
    expect(clockStamp(ms)).toMatch(/^20:05:09$/);
  });

  it("поле datetime-local дає локальний час без секунд", () => {
    const iso = new Date(2026, 9, 23, 8, 5).toISOString();
    expect(toDateTimeInput(iso)).toBe("2026-10-23T08:05");
    expect(toDateTimeInput("не дата")).toBe("");
  });

  it("діапазон з полів переставляє межі й добирає порожню", () => {
    expect(rangeFromInputs("2026-10-23T12:00", "2026-10-22T12:00")).toEqual({
      from: new Date("2026-10-22T12:00").toISOString(),
      to: new Date("2026-10-23T12:00").toISOString(),
    });
    const { from, to } = rangeFromInputs("", "2026-10-23T12:00", 24);
    expect(new Date(to).getTime() - new Date(from).getTime()).toBe(24 * 3600_000);
  });

  it("називає людину повним ім'ям, потім хендлом, потім номером", () => {
    expect(
      userLabel({ userId: 7, firstName: "Сергій", lastName: "Дискант", username: "diskant" }),
    ).toBe("Сергій Дискант");
    expect(userLabel({ userId: 7, firstName: null, lastName: null, username: "diskant" })).toBe(
      "@diskant",
    );
    expect(userLabel({ userId: 7, firstName: null, lastName: null, username: null })).toBe("#7");
    expect(userMeta({ userId: 7, username: "diskant" })).toBe("@diskant · 7");
    expect(userMeta({ userId: 7, username: null })).toBe("7");
  });

  it("метод відділяється від дії", () => {
    expect(actionMethod("GET /api/favorites")).toBe("GET");
    expect(actionText("GET /api/favorites")).toBe("/api/favorites");
    expect(actionMethod("/start")).toBe("ДІЯ");
    expect(actionText("/start")).toBe("/start");
  });

  it("перегляд сторінки показується назвою, а не шляхом API", () => {
    expect(actionText("trackers", "view")).toBe("Трекери");
    // Невідомий ключ не губиться: краще ключ, ніж порожній рядок.
    expect(actionText("unknown", "view")).toBe("unknown");
    // Назва з шапки (модалка, детальна сторінка) іде як є.
    expect(actionText("Кошик", "modal")).toBe("Кошик");
  });

  it("подія платформи читається фразою, а не назвою виду", () => {
    expect(
      eventPhrase({ surface: "platform", kind: "view", action: "Трекери", details: null }),
    ).toBe("Відкрив «Трекери»");
    expect(
      eventPhrase({ surface: "platform", kind: "modal", action: "Кошик", details: null }),
    ).toBe("Відкрив вікно «Кошик»");
    expect(
      eventPhrase({ surface: "platform", kind: "click", action: "Шаблони", details: null }),
    ).toBe("Натиснув «Шаблони»");
    expect(
      eventPhrase({ surface: "platform", kind: "input", action: "купити хліб", details: "Назва" }),
    ).toBe("Поле «Назва»: «купити хліб»");
    expect(eventPhrase({ surface: "platform", kind: "input", action: "Кава", details: null })).toBe(
      "Ввів «Кава»",
    );
    // Запис сервера вже названий дією, а бот говорить своїми словами.
    expect(
      eventPhrase({
        surface: "platform",
        kind: "request",
        action: "POST /api/notes",
        details: null,
      }),
    ).toBeNull();
    expect(
      eventPhrase({ surface: "bot", kind: "message", action: "привіт", details: null }),
    ).toBeNull();
  });

  it("запис сервера читається дією, а не шляхом", () => {
    expect(actionText("POST /api/messages/send", "request")).toBe("Надіслав повідомлення");
  });

  it("догортання не дублює вже показані події", () => {
    expect(mergeEvents([event(1), event(2)], [event(2), event(3)]).map((item) => item.id)).toEqual([
      1, 2, 3,
    ]);
    expect(EVENT_PAGE_SIZE).toBeGreaterThan(0);
  });
});
