import { describe, expect, it } from "vitest";
import {
  EVENT_TEXT_MAX,
  eventKindLabel,
  eventMethod,
  isEventKind,
  isEventSurface,
  isPlatformScreenKey,
  platformAction,
  resolveEventRange,
  screenLabel,
  shouldRecordPlatformAction,
  surfaceLabel,
  truncateEventText,
} from "./events";

describe("події людей", () => {
  it("називає поверхню й вид події словами, а не службовими ключами", () => {
    expect(surfaceLabel("bot")).toBe("Бот");
    expect(surfaceLabel("platform")).toBe("Платформа");
    expect(eventKindLabel("callback")).toBe("Кнопка");
    // Невідоме значення не губиться: краще ключ, ніж порожня клітинка.
    expect(surfaceLabel("api")).toBe("api");
    expect(eventKindLabel("unknown")).toBe("unknown");
  });

  it("перевіряє ключі, які прийшли з бази, а не з коду", () => {
    expect(isEventSurface("bot")).toBe(true);
    expect(isEventSurface("admin")).toBe(false);
    expect(isEventKind("request")).toBe(true);
    expect(isEventKind("click")).toBe(false);
    expect(isEventKind(null)).toBe(false);
  });

  it("описує дію платформи методом і шляхом без query", () => {
    expect(platformAction("get", "/api/favorites")).toBe("GET /api/favorites");
    expect(eventMethod("GET /api/favorites")).toBe("GET");
    expect(eventMethod("натиснув серце")).toBeNull();
  });

  it("пише лише зміну стану: читання — це система, а не людина", () => {
    expect(shouldRecordPlatformAction("POST", "/api/favorites")).toBe(true);
    expect(shouldRecordPlatformAction("delete", "/api/user/trackers/entry")).toBe(true);
    // `GET` — завантаження даних: три запити «Трекерів» не стають трьома діями.
    expect(shouldRecordPlatformAction("GET", "/api/user/trackers/templates")).toBe(false);
    expect(shouldRecordPlatformAction("GET", "/api/messages/badge")).toBe(false);
    // Панель і службове — не поведінка людей.
    expect(shouldRecordPlatformAction("POST", "/api/admin/users/update")).toBe(false);
    expect(shouldRecordPlatformAction("POST", "/api/portal/scenarios/write")).toBe(false);
    expect(shouldRecordPlatformAction("POST", "/api/bot/setup-webhook")).toBe(false);
    expect(shouldRecordPlatformAction("POST", "/health")).toBe(false);
  });

  it("приймає від застосунку тільки відомий ключ екрана", () => {
    expect(isPlatformScreenKey("trackers")).toBe(true);
    expect(isPlatformScreenKey("page")).toBe(true);
    // Довільний текст від клієнта в журнал не потрапляє.
    expect(isPlatformScreenKey("/api/user/trackers")).toBe(false);
    expect(isPlatformScreenKey("Головна")).toBe(false);
    expect(isPlatformScreenKey(null)).toBe(false);
    expect(screenLabel("trackers")).toBe("Трекери");
    expect(screenLabel("unknown")).toBe("unknown");
  });

  it("перегляд екрана — окремий вид події з людською назвою", () => {
    expect(eventKindLabel("view")).toBe("Екран");
    expect(isEventKind("view")).toBe(true);
  });

  it("обрізає довгий текст, лишаючи позначку обрізання", () => {
    expect(truncateEventText("коротко")).toBe("коротко");
    const long = "я".repeat(EVENT_TEXT_MAX + 10);
    const cut = truncateEventText(long);
    expect(cut).toHaveLength(EVENT_TEXT_MAX);
    expect(cut.endsWith("…")).toBe(true);
  });

  it("типовий діапазон — остання доба", () => {
    const now = new Date("2026-10-23T12:00:00Z");
    expect(resolveEventRange({}, now)).toEqual({
      from: "2026-10-22 12:00:00",
      to: "2026-10-23 12:00:00",
    });
  });

  it("переставлені межі міняються назад, а не дають порожній результат", () => {
    expect(
      resolveEventRange(
        { from: "2026-10-23T12:00:00Z", to: "2026-10-22T12:00:00Z" },
        new Date("2026-10-24T00:00:00Z"),
      ),
    ).toEqual({ from: "2026-10-22 12:00:00", to: "2026-10-23 12:00:00" });
  });

  it("одна межа добирає другу, а сміття в даті не ламає запит", () => {
    const now = new Date("2026-10-23T12:00:00Z");
    expect(resolveEventRange({ from: "2026-10-20 08:30:00" }, now)).toEqual({
      from: "2026-10-20 08:30:00",
      to: "2026-10-23 12:00:00",
    });
    expect(resolveEventRange({ to: "2026-10-23T12:00:00Z" }, now)).toEqual({
      from: "2026-10-22 12:00:00",
      to: "2026-10-23 12:00:00",
    });
    expect(resolveEventRange({ from: "не дата", to: "2026-10-23T12:00:00Z" }, now)).toEqual({
      from: "2026-10-22 12:00:00",
      to: "2026-10-23 12:00:00",
    });
  });
});
