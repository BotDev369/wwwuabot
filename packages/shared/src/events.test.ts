import { describe, expect, it } from "vitest";
import {
  EVENT_TEXT_MAX,
  EVENT_VIEW_WINDOW_MS,
  eventKindLabel,
  eventMethod,
  isEventKind,
  isEventSurface,
  platformAction,
  platformScreen,
  resolveEventRange,
  screenLabel,
  shouldRecordPlatformRequest,
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

  it("не пише в журнал адмінку, бота й портал", () => {
    expect(shouldRecordPlatformRequest("/api/favorites")).toBe(true);
    expect(shouldRecordPlatformRequest("/api/public/pages")).toBe(true);
    expect(shouldRecordPlatformRequest("/api/admin/events")).toBe(false);
    expect(shouldRecordPlatformRequest("/api/portal/scenarios/list")).toBe(false);
    expect(shouldRecordPlatformRequest("/api/bot/info")).toBe(false);
    expect(shouldRecordPlatformRequest("/health")).toBe(false);
  });

  it("зводить запити екрана до одного екрана з людською назвою", () => {
    // «Трекери» тягне три шляхи — це один екран, а не три події.
    expect(platformScreen("/api/user/trackers")?.key).toBe("trackers");
    expect(platformScreen("/api/user/trackers/templates")?.key).toBe("trackers");
    expect(platformScreen("/api/user/trackers/public")?.key).toBe("trackers");
    expect(screenLabel("trackers")).toBe("Трекери");
    // Специфічніший шлях перевіряється раніше за загальний.
    expect(platformScreen("/api/user/shop/orders")?.key).toBe("orders");
    expect(platformScreen("/api/public/shop/products")?.key).toBe("shop");
    expect(platformScreen("/api/messages/thread")?.key).toBe("messages");
    // Невідоме не вигадуємо: ключ екрана лишається ключем.
    expect(platformScreen("/api/unknown")).toBeNull();
    expect(screenLabel("unknown")).toBe("unknown");
    // Префікс матчиться по межі сегмента, а не по літерах.
    expect(platformScreen("/api/notes2")).toBeNull();
    expect(EVENT_VIEW_WINDOW_MS).toBeGreaterThan(0);
  });

  it("перегляд екрана — окремий вид події з людською назвою", () => {
    expect(eventKindLabel("view")).toBe("Екран");
    expect(isEventKind("view")).toBe(true);
  });

  it("не пише те, що застосунок робить сам, без людини", () => {
    // Позначка непрочитаних опитується за розкладом: без цього фільтра
    // година відкритого застосунку дає сотню рядків, яких людина не робила.
    expect(shouldRecordPlatformRequest("/api/messages/badge")).toBe(false);
    expect(shouldRecordPlatformRequest("/api/user/access")).toBe(false);
    expect(shouldRecordPlatformRequest("/api/user/profile")).toBe(false);
    // Решта дій людини лишається: і читання екрана, і зміна стану.
    expect(shouldRecordPlatformRequest("/api/user/trackers")).toBe(true);
    expect(shouldRecordPlatformRequest("/api/user/access-request")).toBe(true);
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
