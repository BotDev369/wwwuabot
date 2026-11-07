// @vitest-environment jsdom
/**
 * Хук текстів: один запит на екран, кеш на сесію, порожньо замість вигаданого
 * тексту.
 *
 * @module web-platform-dev/src/pages/screen-texts/useScreenTexts.dom.test
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import type { ScreenTexts } from "@wwwuabot/shared/screens";

const api = { fetchScreenTexts: vi.fn<() => Promise<ScreenTexts>>() };

vi.mock("@/shared/api/screens.api", () => api);

const { forgetScreenTexts, useScreenTexts } = await import("./useScreenTexts");

beforeEach(() => {
  vi.clearAllMocks();
  forgetScreenTexts();
});

describe("useScreenTexts", () => {
  it("спершу не готовий, потім віддає тексти з рядка", async () => {
    api.fetchScreenTexts.mockResolvedValue({ "services.title": "Сервіси" });

    const { result } = renderHook(() => useScreenTexts("services"));
    expect(result.current.ready).toBe(false);
    expect(result.current.texts).toEqual({});

    await waitFor(() => expect(result.current.ready).toBe(true));
    expect(result.current.texts).toEqual({ "services.title": "Сервіси" });
  });

  it("другий екран бере те саме з кешу, а не з мережі", async () => {
    api.fetchScreenTexts.mockResolvedValue({ "services.title": "Сервіси" });

    const first = renderHook(() => useScreenTexts("services"));
    await waitFor(() => expect(first.result.current.ready).toBe(true));

    const second = renderHook(() => useScreenTexts("services"));
    expect(second.result.current.ready).toBe(true);
    expect(api.fetchScreenTexts).toHaveBeenCalledTimes(1);
  });

  it("збій мережі лишає екран без слів, а не з чужими", async () => {
    api.fetchScreenTexts.mockRejectedValue(new Error("offline"));

    const { result } = renderHook(() => useScreenTexts("services"));
    await waitFor(() => expect(result.current.ready).toBe(true));

    expect(result.current.texts).toEqual({});
  });
});
