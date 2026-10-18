// @vitest-environment jsdom
/**
 * Хук одного трекера: запис дня — **новий дотик**, а не правка минулого.
 *
 * За день можна записати багато разів (вода тричі, кроки ввечері), тож лічильник
 * історії росте, а не перезаписується. Час дотику ставить сервер — клієнт його
 * не вигадує.
 *
 * @module web-platform-dev/src/pages/trackers/useTracker.dom.test
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import { act, renderHook, waitFor } from "@testing-library/react";
import type { Tracker } from "@wwwuabot/shared/trackers";

const mocks = { request: vi.fn(), alert: vi.fn() };

vi.mock("@/shared/api/client", () => ({ apiFetch: mocks.request }));
vi.mock("@wwwuabot/ui/dialog", () => ({ useDialog: () => ({ alert: mocks.alert }) }));

const { useTracker } = await import("./useTracker");

const water: Tracker = {
  id: 1,
  key: "water",
  title: "Вода",
  unit: "л",
  step: 0.25,
  goal: 2,
  min: 0,
  max: 20,
  icon: "droplet",
  isBuiltin: true,
};

beforeEach(() => {
  vi.clearAllMocks();
  mocks.request.mockResolvedValue({
    tracker: water,
    entries: [{ id: 11, day: "2026-10-16", value: 1.5, note: "", loggedAt: "2026-10-16 09:00:00" }],
    endDay: "2026-10-17",
  });
});

describe("один трекер", () => {
  it("читає трекер з днем людини", async () => {
    const view = renderHook(() => useTracker(1));
    await waitFor(() => expect(view.result.current.loading).toBe(false));

    expect(mocks.request).toHaveBeenCalledWith(expect.stringMatching(/id=1&day=/));
    expect(view.result.current.tracker?.title).toBe("Вода");
    expect(view.result.current.entries).toHaveLength(1);
  });

  it("невідомий трекер — це помилка, а не порожній екран", async () => {
    mocks.request.mockRejectedValueOnce(new Error("HTTP 404"));
    const view = renderHook(() => useTracker(9));
    await waitFor(() => expect(view.result.current.loading).toBe(false));

    expect(view.result.current.error).toBe("Трекера не знайдено.");
  });

  it("⛔ другий дотик того самого дня — новий рядок, а не правка", async () => {
    const view = renderHook(() => useTracker(1));
    await waitFor(() => expect(view.result.current.loading).toBe(false));

    mocks.request.mockResolvedValueOnce({
      entry: { id: 12, day: "2026-10-16", value: 2, note: "", loggedAt: "2026-10-16 21:30:00" },
    });
    await act(async () => {
      await view.result.current.save("2026-10-16", 2, "");
    });

    expect(view.result.current.entries).toHaveLength(2);
    expect(view.result.current.entries.map((entry) => entry.id)).toEqual([11, 12]);
  });

  it("новий день стає в історію за порядком", async () => {
    const view = renderHook(() => useTracker(1));
    await waitFor(() => expect(view.result.current.loading).toBe(false));

    mocks.request.mockResolvedValueOnce({
      entry: { id: 12, day: "2026-10-17", value: 2, note: "", loggedAt: "2026-10-17 08:00:00" },
    });
    await act(async () => {
      await view.result.current.save("2026-10-17", 2, "");
    });

    expect(view.result.current.entries.map((entry) => entry.day)).toEqual([
      "2026-10-16",
      "2026-10-17",
    ]);
  });

  it("провал збереження каже причину й не чіпає історію", async () => {
    const view = renderHook(() => useTracker(1));
    await waitFor(() => expect(view.result.current.loading).toBe(false));

    mocks.request.mockRejectedValueOnce(new Error("Значення поза межами трекера."));
    await act(async () => {
      await view.result.current.save("2026-10-17", 99, "");
    });

    expect(mocks.alert).toHaveBeenCalledWith("Значення поза межами трекера.", { tone: "danger" });
    expect(view.result.current.entries).toHaveLength(1);
  });

  it("прибирання дотика йде за номером рядка", async () => {
    const view = renderHook(() => useTracker(1));
    await waitFor(() => expect(view.result.current.loading).toBe(false));

    mocks.request.mockResolvedValueOnce({ ok: true });
    await act(async () => {
      await view.result.current.remove(11);
    });

    expect(mocks.request).toHaveBeenCalledWith(
      expect.stringContaining("/api/user/trackers/entry?id=11"),
      { method: "DELETE" },
    );
    expect(view.result.current.entries).toHaveLength(0);
  });

  it("прибирання трекера йде DELETE і каже про провал", async () => {
    const view = renderHook(() => useTracker(1));
    await waitFor(() => expect(view.result.current.loading).toBe(false));

    let ok = false;
    await act(async () => {
      ok = await view.result.current.archive();
    });
    expect(ok).toBe(true);

    mocks.request.mockRejectedValueOnce(new Error("HTTP 500"));
    await act(async () => {
      ok = await view.result.current.archive();
    });
    expect(ok).toBe(false);
    expect(mocks.alert).toHaveBeenCalledWith("Не вдалося прибрати трекер.", { tone: "danger" });
  });
});
