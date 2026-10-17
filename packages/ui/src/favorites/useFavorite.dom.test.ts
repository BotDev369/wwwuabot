// @vitest-environment jsdom
/**
 * Серце в хедері: що саме йде на сервер і що видно, коли не вдалось.
 *
 * Тест ловить дві речі, які зовні виглядали як одна поламана кнопка: **тіло
 * їде в обох напрямках** (`DELETE` без тіла сервер відкидає як `Invalid body`,
 * тож «поставити» ламалось окремо від «прибрати») і **читання вирішує, яка з
 * двох дій буде**: `liked` приходить із сервера, а не з натискання.
 *
 * @module @wwwuabot/ui/favorites/useFavorite.dom.test
 */

import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ request: vi.fn(), alert: vi.fn() }));

vi.mock("@wwwuabot/shared", () => ({ apiFetch: mocks.request }));
vi.mock("@wwwuabot/shared/security/telegram", () => ({
  telegramAuthHeaders: () => ({ "x-telegram-init-data": "підпис" }),
}));
vi.mock("@wwwuabot/ui/dialog", () => ({ useDialog: () => ({ alert: mocks.alert }) }));

import { useFavorite } from "./useFavorite";
import { favoritesCount, setFavoritesCount } from "./favorites-count";
import { onLikeAnnounced } from "./like-feedback";

const TARGET = { kind: "page" as const, targetId: 34 };

beforeEach(() => {
  vi.clearAllMocks();
  mocks.alert.mockResolvedValue(undefined);
});

/** Хук із уже прочитаним станом: до цього кнопка заблокована (`busy`). */
async function opened(liked: boolean) {
  mocks.request.mockResolvedValueOnce({ liked });
  const view = renderHook(() => useFavorite(TARGET));
  await waitFor(() => expect(view.result.current.busy).toBe(false));
  return view;
}

describe("серце сторінки", () => {
  it("ставить лайк тілом, у якому саме ціль", async () => {
    const view = await opened(false);
    // Серце вмикає відповідь сервера, а не натискання.
    mocks.request.mockResolvedValueOnce({ liked: true });

    await act(() => view.result.current.toggle());

    expect(view.result.current.liked).toBe(true);
    expect(mocks.request).toHaveBeenLastCalledWith("/api/favorites", {
      headers: { "x-telegram-init-data": "підпис", "Content-Type": "application/json" },
      fetchOptions: { method: "POST", body: JSON.stringify(TARGET) },
    });
  });

  it("знімає лайк із тілом — без нього сервер відповідає 400", async () => {
    const view = await opened(true);
    mocks.request.mockResolvedValueOnce({ liked: false });

    await act(() => view.result.current.toggle());

    expect(view.result.current.liked).toBe(false);
    expect(mocks.request).toHaveBeenLastCalledWith("/api/favorites", {
      headers: { "x-telegram-init-data": "підпис", "Content-Type": "application/json" },
      fetchOptions: { method: "DELETE", body: JSON.stringify(TARGET) },
    });
  });

  it("невдале збереження не вмикає серце й каже про це", async () => {
    const view = await opened(false);
    mocks.request.mockRejectedValueOnce(new Error("HTTP 400"));

    await act(() => view.result.current.toggle());

    expect(view.result.current.liked).toBe(false);
    expect(mocks.alert).toHaveBeenCalledWith(
      "Не вдалося зберегти лайк. Спробуйте ще раз.",
      expect.objectContaining({ tone: "danger" }),
    );
  });

  it("успіх видно: коротке підтвердження й число обраного", async () => {
    setFavoritesCount(0);
    const view = await opened(false);
    const seen: boolean[] = [];
    const off = onLikeAnnounced((feedback) => seen.push(feedback.liked));
    mocks.request.mockResolvedValueOnce({ liked: true });

    await act(() => view.result.current.toggle());
    off();

    expect(seen).toEqual([true]);
    expect(favoritesCount()).toBe(1);
  });

  it("повторний лайк не рухає число вдруге", async () => {
    setFavoritesCount(1);
    const view = await opened(true);
    let announced = 0;
    const off = onLikeAnnounced(() => (announced += 1));
    mocks.request.mockResolvedValueOnce({ liked: true });

    await act(() => view.result.current.toggle());
    off();

    expect(announced).toBe(0);
    expect(favoritesCount()).toBe(1);
  });

  it("невдале читання не вимикає кнопку назавжди: клік довідується про стан", async () => {
    mocks.request.mockRejectedValueOnce(new Error("мережа"));
    const view = renderHook(() => useFavorite(TARGET));
    await waitFor(() => expect(view.result.current.failed).toBe(true));
    mocks.request.mockResolvedValueOnce({ liked: true });

    await act(() => view.result.current.toggle());

    expect(view.result.current.liked).toBe(true);
    expect(mocks.request).toHaveBeenLastCalledWith(
      "/api/favorites?kind=page&targetId=34",
      expect.anything(),
    );
  });
});
