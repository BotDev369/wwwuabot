// @vitest-environment jsdom
/**
 * Позначка обраного: «нове» живе в `localStorage`, а не на сервері.
 *
 * Три речі: читання при вході, запис під ключем свого акаунта й тиша поза
 * Telegram.
 *
 * @module web-platform-dev/src/layout/useFavoritesBadge.dom.test
 */

import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ initData: "" }));

vi.mock("@wwwuabot/shared/security/telegram", () => ({
  readInitData: () => mocks.initData,
}));

const { favoritesNewCount, setFavoritesNewCount } = await import("@wwwuabot/ui/favorites");
const { useFavoritesBadge } = await import("./useFavoritesBadge");

/** `initData` з людиною — так його бачить браузер; підпис тут не перевіряється. */
function initDataFor(id: number): string {
  return new URLSearchParams({ user: JSON.stringify({ id }) }).toString();
}

beforeEach(() => {
  vi.clearAllMocks();
  window.localStorage.clear();
  setFavoritesNewCount(0);
});

describe("позначка «нове в обраному»", () => {
  it("читає збережене число при вході", async () => {
    mocks.initData = initDataFor(777);
    window.localStorage.setItem("wb-favorites-new:777", "2");

    const view = renderHook(() => useFavoritesBadge());

    await waitFor(() => expect(view.result.current).toBe(2));
  });

  it("пише кожну зміну під ключем свого акаунта", async () => {
    mocks.initData = initDataFor(777);
    renderHook(() => useFavoritesBadge());

    act(() => setFavoritesNewCount(3));

    expect(window.localStorage.getItem("wb-favorites-new:777")).toBe("3");
  });

  it("поза Telegram не показує нічого — і не падає", async () => {
    mocks.initData = "";
    window.localStorage.setItem("wb-favorites-new:777", "2");

    const view = renderHook(() => useFavoritesBadge());

    await waitFor(() => expect(view.result.current).toBe(0));
    expect(favoritesNewCount()).toBe(0);
  });
});
