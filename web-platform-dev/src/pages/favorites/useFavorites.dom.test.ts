// @vitest-environment jsdom
/**
 * Стан «Обраного»: список, причина помилки, зняття лайка й число у футері.
 *
 * Число тут не подробиця: його показує пункт футера, тож список мусить
 * виправити його і при читанні, і при знятті лайка — інакше позначка жила б
 * своїм життям окремо від того, що людина бачить.
 *
 * @module web-platform-dev/src/pages/favorites/useFavorites.dom.test
 */

import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { FavoriteItem } from "@wwwuabot/shared/favorites";
import { favoritesCount, setFavoritesCount } from "@wwwuabot/ui/favorites";

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
  setFavoritesCount(0);
});

describe("читання списку", () => {
  it("складає список і виправляє число у футері", async () => {
    mocks.request.mockResolvedValueOnce({ ok: true, items: [item(), item({ targetId: 8 })] });
    const view = renderHook(() => useFavorites());

    await waitFor(() => expect(view.result.current.loading).toBe(false));

    expect(view.result.current.items).toHaveLength(2);
    expect(view.result.current.error).toBeNull();
    expect(favoritesCount()).toBe(2);
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
  it("прибирає рядок і зменшує число у футері", async () => {
    mocks.request.mockResolvedValueOnce({ ok: true, items: [item()] });
    const view = renderHook(() => useFavorites());
    await waitFor(() => expect(view.result.current.items).toHaveLength(1));

    mocks.request.mockResolvedValueOnce({ ok: true, liked: false });
    await act(() => view.result.current.remove(item()));

    expect(view.result.current.items).toEqual([]);
    expect(favoritesCount()).toBe(0);
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
