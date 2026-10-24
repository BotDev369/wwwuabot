/**
 * Транспорт журналу в адмінці: кожен виклик іде на свій `/api/admin/events`-шлях
 * і не губить ознак відбору.
 *
 * Ознака, загублена в дорозі, — це тихо ширший відбір, тобто прибирання не того,
 * що людина обрала, тож перевіряються саме параметри запиту.
 *
 * @module web-admin-dev/src/shared/api/events.api.test
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = { request: vi.fn() };
vi.mock("./client", () => ({ apiFetch: mocks.request }));

const { cleanupEvents, fetchEventSummary, fetchEventUsers, fetchEvents } =
  await import("./events.api");

beforeEach(() => {
  vi.clearAllMocks();
  mocks.request.mockResolvedValue({});
});

describe("читання", () => {
  it("зведення йде за діапазоном", async () => {
    await fetchEventSummary({ from: "2026-10-24 10:00:00", to: "2026-10-24 11:00:00" });

    expect(mocks.request).toHaveBeenCalledWith(
      "/api/admin/events/summary?from=2026-10-24%2010%3A00%3A00&to=2026-10-24%2011%3A00%3A00",
    );
  });

  it("список везе діапазон, сторінку й людину", async () => {
    await fetchEvents({
      from: "2026-10-24 10:00:00",
      to: "2026-10-24 11:00:00",
      userId: 7,
      limit: 20,
      offset: 40,
    });

    const [url] = mocks.request.mock.calls[0];
    const query = new URLSearchParams((url as string).split("?")[1]);
    expect((url as string).startsWith("/api/admin/events?")).toBe(true);
    expect(query.get("userId")).toBe("7");
    expect(query.get("limit")).toBe("20");
    expect(query.get("offset")).toBe("40");
  });

  it("без людини в адресі немає зайвої ознаки", async () => {
    await fetchEvents({ from: "a", to: "b", userId: null });

    const query = new URLSearchParams((mocks.request.mock.calls[0][0] as string).split("?")[1]);
    expect(query.has("userId")).toBe(false);
    expect(query.get("limit")).toBe("100");
    expect(query.get("offset")).toBe("0");
  });

  it("люди — за пошуком, а порожній пошук не додає умови", async () => {
    await fetchEventUsers("  сергій  ");
    expect(
      new URLSearchParams((mocks.request.mock.calls[0][0] as string).split("?")[1]).get("search"),
    ).toBe("сергій");

    await fetchEventUsers("   ");
    expect(
      new URLSearchParams((mocks.request.mock.calls[1][0] as string).split("?")[1]).has("search"),
    ).toBe(false);
  });
});

describe("прибирання", () => {
  it("приходить POST-ом із тілом відбору", async () => {
    await cleanupEvents({ dryRun: true, userId: 7, surface: "bot", kind: "message" });

    expect(mocks.request).toHaveBeenCalledWith(
      "/api/admin/events/delete",
      expect.objectContaining({ method: "POST" }),
    );
    const init = mocks.request.mock.calls[0][1] as RequestInit;
    expect(JSON.parse(init.body as string)).toEqual({
      dryRun: true,
      userId: 7,
      surface: "bot",
      kind: "message",
    });
  });
});
