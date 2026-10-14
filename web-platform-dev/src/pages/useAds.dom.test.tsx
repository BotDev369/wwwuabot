// @vitest-environment jsdom
/**
 * Дані дошки оголошень: **два запити, одне подання**.
 *
 * Тут ламається мовчки: досить узяти одне джерело замість двох — і власні
 * чернетки зникають із очей людини; досить проковтнути помилку — і порожня
 * дошка читається як «нічого немає»; досить не перечитати після запису — і
 * дошка лишається старою.
 *
 * @module web-platform-dev/src/pages/useAds.dom.test
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import { act, renderHook, waitFor } from "@testing-library/react";
import type { Ad } from "@wwwuabot/shared/ads";

const api = { board: vi.fn(), listOwn: vi.fn(), save: vi.fn(), remove: vi.fn() };

vi.mock("@/shared/api/ads.api", () => ({ adsApi: api }));

const { useAds } = await import("./useAds");

const ad = (id: number, isActive = true): Ad => ({
  id,
  ownerId: 1,
  kind: "sell",
  title: `#${id}`,
  body: "",
  price: "",
  place: "",
  isActive,
  createdAt: "2026-10-01 00:00:00",
  updatedAt: "2026-10-01 00:00:00",
});

beforeEach(() => {
  vi.clearAllMocks();
  api.board.mockResolvedValue([ad(1)]);
  api.listOwn.mockResolvedValue([ad(1), ad(2, false)]);
  api.save.mockResolvedValue(null);
  api.remove.mockResolvedValue(undefined);
});

describe("дошка й своє", () => {
  it("чернетки стоять першими, а своє на дошці позначене як «моє»", async () => {
    const { result } = renderHook(() => useAds());

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.items.map((item) => item.ad.id)).toEqual([2, 1]);
    expect(result.current.items[0].mine).toBe(true);
    expect(result.current.items[1].mine).toBe(true);
    expect(api.board).toHaveBeenCalled();
    expect(api.listOwn).toHaveBeenCalled();
  });

  it("помилка називає причину, а не порожню дошку", async () => {
    api.board.mockRejectedValue(new Error("Немає доступу"));

    const { result } = renderHook(() => useAds());

    await waitFor(() => expect(result.current.error).toBe("Немає доступу"));
    expect(result.current.items).toEqual([]);
    expect(result.current.loading).toBe(false);
  });
});

describe("дії", () => {
  it("повтор після помилки ставить «завантаження» й перечитує", async () => {
    const { result } = renderHook(() => useAds());
    await waitFor(() => expect(result.current.loading).toBe(false));

    act(() => result.current.reload(true));

    await waitFor(() => expect(api.board).toHaveBeenCalledTimes(2));
  });

  it("збереження перечитує дошку: список — джерело правди", async () => {
    const { result } = renderHook(() => useAds());
    await waitFor(() => expect(result.current.loading).toBe(false));

    const draft = { kind: "sell", title: "Кава", body: "", price: "", place: "" } as const;
    await act(async () => {
      await result.current.save(draft);
    });

    expect(api.save).toHaveBeenCalledWith(draft);
    await waitFor(() => expect(api.board).toHaveBeenCalledTimes(2));
  });

  it("прибирання теж перечитує дошку", async () => {
    const { result } = renderHook(() => useAds());
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.remove(3);
    });

    expect(api.remove).toHaveBeenCalledWith(3);
    await waitFor(() => expect(api.board).toHaveBeenCalledTimes(2));
  });
});
