// @vitest-environment jsdom
/**
 * Хук стрічки: перший вхід приходить із даними, а помилки не зникають мовчки.
 *
 * Перевіряємо те, що не видно в розмітці: запит іде з днем людини, створення
 * додає рядок у стан (без перезавантаження), а невдача каже причину.
 *
 * @module web-platform-dev/src/pages/trackers/useTrackers.dom.test
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import { act, renderHook, waitFor } from "@testing-library/react";
import type { Tracker } from "@wwwuabot/shared/trackers";

const mocks = { request: vi.fn(), alert: vi.fn() };

vi.mock("@/shared/api/client", () => ({ apiFetch: mocks.request }));
vi.mock("@wwwuabot/ui/dialog", () => ({ useDialog: () => ({ alert: mocks.alert }) }));

const { useTrackers } = await import("./useTrackers");

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
  mode: "sum",
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe("стрічка", () => {
  it("запит іде з днем людини, а не з датою воркера", async () => {
    mocks.request.mockResolvedValue({ trackers: [water], entries: [], endDay: "2026-10-17" });
    const view = renderHook(() => useTrackers());

    await waitFor(() => expect(view.result.current.loading).toBe(false));

    expect(mocks.request).toHaveBeenCalledWith(
      expect.stringMatching(/^\/api\/user\/trackers\?day=/),
    );
    expect(view.result.current.trackers).toHaveLength(1);
    expect(view.result.current.endDay).toBe("2026-10-17");
  });

  it("невдача називає причину і дає повторити", async () => {
    mocks.request.mockRejectedValueOnce(new Error("HTTP 500"));
    const view = renderHook(() => useTrackers());
    await waitFor(() => expect(view.result.current.loading).toBe(false));

    expect(view.result.current.error).toBe("Не вдалося завантажити трекери.");

    mocks.request.mockResolvedValueOnce({ trackers: [water], entries: [], endDay: "2026-10-17" });
    await act(() => view.result.current.reload());
    expect(view.result.current.error).toBeNull();
    expect(view.result.current.trackers).toHaveLength(1);
  });

  it("створення додає трекер у стан — без другого запиту", async () => {
    mocks.request.mockResolvedValueOnce({ trackers: [], entries: [], endDay: "2026-10-17" });
    const view = renderHook(() => useTrackers());
    await waitFor(() => expect(view.result.current.loading).toBe(false));

    mocks.request.mockResolvedValueOnce({ tracker: { ...water, id: 5, isBuiltin: false } });
    let created: Tracker | null = null;
    await act(async () => {
      created = await view.result.current.create({
        title: "Вода",
        unit: "л",
        step: 0.25,
        goal: 2,
        min: 0,
        max: 20,
        mode: "sum",
      });
    });

    expect(created).toMatchObject({ id: 5 });
    expect(view.result.current.trackers).toHaveLength(1);
  });

  it("відмова сервера каже її словами й не додає рядок", async () => {
    mocks.request.mockResolvedValueOnce({ trackers: [], entries: [], endDay: "2026-10-17" });
    const view = renderHook(() => useTrackers());
    await waitFor(() => expect(view.result.current.loading).toBe(false));

    mocks.request.mockRejectedValueOnce(new Error("Назва — від 1 до 40 символів."));
    await act(async () => {
      await view.result.current.create({
        title: "",
        unit: "",
        step: 1,
        goal: null,
        min: 0,
        max: null,
        mode: "read",
      });
    });

    expect(mocks.alert).toHaveBeenCalledWith("Назва — від 1 до 40 символів.", { tone: "danger" });
    expect(view.result.current.trackers).toHaveLength(0);
  });

  it("прибирання зникає зі стану, а провал лишає рядок", async () => {
    mocks.request.mockResolvedValueOnce({ trackers: [water], entries: [], endDay: "2026-10-17" });
    const view = renderHook(() => useTrackers());
    await waitFor(() => expect(view.result.current.trackers).toHaveLength(1));

    mocks.request.mockResolvedValueOnce({ ok: true });
    let ok = false;
    await act(async () => {
      ok = await view.result.current.archive(1);
    });
    expect(ok).toBe(true);
    expect(view.result.current.trackers).toHaveLength(0);

    mocks.request.mockRejectedValueOnce(new Error("HTTP 500"));
    await act(async () => {
      await view.result.current.archive(9);
    });
    expect(mocks.alert).toHaveBeenCalledWith("Не вдалося прибрати трекер.", { tone: "danger" });
  });
});
