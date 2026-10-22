// @vitest-environment jsdom
/**
 * Хук двох списків на читання: обидва приходять разом (перемикання вкладки не
 * чекає на мережу), збій називає причину, а `reload` перечитує — саме його
 * кличе екран після «Додати», щоб прапорець «Додано» прийшов із сервера.
 *
 * @module web-platform-dev/src/pages/trackers/useTrackerLibrary.dom.test
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import { act, renderHook, waitFor } from "@testing-library/react";

const mocks = { request: vi.fn() };
vi.mock("@/shared/api/client", () => ({ apiFetch: mocks.request }));

const { useTrackerLibrary } = await import("./useTrackerLibrary");

const templates = [
  {
    key: "water",
    title: "Вода",
    unit: "л",
    step: 0.25,
    goal: 2,
    min: 0,
    max: 20,
    mode: "sum",
    icon: "droplet",
    groupKey: "routine",
    added: false,
  },
];

const published = [
  {
    id: 12,
    title: "Кава вдома",
    unit: "чашки",
    step: 1,
    goal: 3,
    min: 0,
    max: 10,
    mode: "sum",
    valueType: "number",
    icon: "cup",
    author: "олена",
    mine: false,
  },
];

beforeEach(() => {
  vi.clearAllMocks();
});

describe("списки на читання", () => {
  it("обидва списки приходять одним заходом і мапляться в рядки", async () => {
    mocks.request.mockImplementation(async (url: string) =>
      url.endsWith("/templates") ? { templates } : { trackers: published },
    );
    const view = renderHook(() => useTrackerLibrary());

    await waitFor(() => expect(view.result.current.loading).toBe(false));

    expect(view.result.current.templates.map((item) => item.source)).toEqual(["catalog:water"]);
    expect(view.result.current.publicTrackers.map((item) => item.source)).toEqual(["public:12"]);
    expect(view.result.current.error).toBeNull();
  });

  it("збій називає причину, а не лишає порожній екран без слова", async () => {
    mocks.request.mockRejectedValue(new Error("HTTP 500"));
    const view = renderHook(() => useTrackerLibrary());

    await waitFor(() => expect(view.result.current.loading).toBe(false));

    expect(view.result.current.error).toBe("Не вдалося завантажити список.");
    expect(view.result.current.templates).toEqual([]);
  });

  it("reload перечитує — так «Додано» приходить із сервера", async () => {
    mocks.request.mockResolvedValue({ templates: [], trackers: [] });
    const view = renderHook(() => useTrackerLibrary());
    await waitFor(() => expect(view.result.current.loading).toBe(false));

    mocks.request.mockResolvedValue({
      templates: [{ ...templates[0], added: true }],
      trackers: [],
    });
    await act(() => view.result.current.reload());

    expect(view.result.current.templates[0].added).toBe(true);
  });
});
