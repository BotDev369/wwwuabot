// @vitest-environment jsdom
/**
 * Стан «Обраного»: список, причина помилки, зняття лайка й позначка у футері.
 *
 * Позначка тут не подробиця: вона каже «є нове», а не «скільки всього», тож
 * відкритий список її **обнуляє**, а прибирання рядка її не рухає.
 *
 * @module web-platform-dev/src/pages/favorites/useFavorites.dom.test
 */

import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { FavoriteItem } from "@wwwuabot/shared/favorites";
import { favoritesNewCount, setFavoritesNewCount } from "@wwwuabot/ui/favorites";

const mocks = vi.hoisted(() => ({ request: vi.fn(), alert: vi.fn() }));

vi.mock("@/shared/api/client", () => ({ apiFetch: mocks.request }));
vi.mock("@wwwuabot/ui/dialog", () => ({ useDialog: () => ({ alert: mocks.alert }) }));

const { useFavorites } = await import("./useFavorites");

const item = (overrides: Partial<FavoriteItem> = {}): FavoriteItem => ({
  kind: "page",
  targetId: 7,
  title: "PageSlay",
  href: "/pageslay",
  photoUrl: null,
  savedAt: "2026-10-14 10:00:00",
  ...overrides,
});

beforeEach(() => {
  vi.clearAllMocks();
  mocks.alert.mockResolvedValue(undefined);
  setFavoritesNewCount(0);
});

describe("читання списку", () => {
  it("складає список і обнуляє позначку «нове» у футері", async () => {
    setFavoritesNewCount(3);
    mocks.request.mockResolvedValueOnce({ ok: true, items: [item(), item({ targetId: 8 })] });
    const view = renderHook(() => useFavorites());

    await waitFor(() => expect(view.result.current.loading).toBe(false));

    expect(view.result.current.items).toHaveLength(2);
    expect(view.result.current.error).toBeNull();
    // Відкритий список — це «побачено»: позначка не показує все обране.
    expect(favoritesNewCount()).toBe(0);
  });

  it("помилка називає причину, а не порожній список", async () => {
    mocks.request.mockRejectedValueOnce(new Error("мережа"));
    const view = renderHook(() => useFavorites());

    await waitFor(() => expect(view.result.current.loading).toBe(false));

    expect(view.result.current.error).toBe("Не вдалося завантажити обране.");
  });

  it("«Повторити» перечитує список", async () => {
    mocks.request.mockRejectedValueOnce(new Error("мережа"));
    const view = renderHook(() => useFavorites());
    await waitFor(() => expect(view.result.current.error).not.toBeNull());

    mocks.request.mockResolvedValueOnce({ ok: true, items: [item()] });
    await act(() => view.result.current.reload());

    expect(view.result.current.error).toBeNull();
    expect(view.result.current.items).toHaveLength(1);
  });
});

describe("зняття лайка", () => {
  it("прибирає рядок, не рухаючи позначку «нове»", async () => {
    mocks.request.mockResolvedValueOnce({ ok: true, items: [item()] });
    const view = renderHook(() => useFavorites());
    await waitFor(() => expect(view.result.current.items).toHaveLength(1));

    mocks.request.mockResolvedValueOnce({ ok: true, liked: false });
    await act(() => view.result.current.remove(item()));

    expect(view.result.current.items).toEqual([]);
    // Рядок у списку вже побачений — новим він не стає і зникнення його не знімає.
    expect(favoritesNewCount()).toBe(0);
    expect(mocks.request).toHaveBeenLastCalledWith(
      "/api/favorites",
      expect.objectContaining({ method: "DELETE" }),
    );
  });

  it("невдача зберігає рядок і каже про неї", async () => {
    mocks.request.mockResolvedValueOnce({ ok: true, items: [item()] });
    const view = renderHook(() => useFavorites());
    await waitFor(() => expect(view.result.current.items).toHaveLength(1));

    mocks.request.mockRejectedValueOnce(new Error("HTTP 500"));
    await act(() => view.result.current.remove(item()));

    expect(view.result.current.items).toHaveLength(1);
    expect(mocks.alert).toHaveBeenCalledWith("Не вдалося прибрати лайк.", { tone: "danger" });
  });
});

describe("порядок", () => {
  it("типово найновіше першим, і його можна змінити", async () => {
    mocks.request.mockResolvedValueOnce({ ok: true, items: [] });
    const view = renderHook(() => useFavorites());
    await waitFor(() => expect(view.result.current.loading).toBe(false));

    expect(view.result.current.sort).toBe("date");

    act(() => view.result.current.setSort("name"));
    expect(view.result.current.sort).toBe("name");
  });
});
