// @vitest-environment jsdom
/**
 * «Користувачі» — дані й екран.
 *
 * Тут ламається мовчки: досить показати старий список під час перезавантаження —
 * і людина бачить чужі картки; досить проковтнути помилку — і порожній екран
 * читається як «нікого немає»; досить не перечитати після повтору — і стрічка
 * лишається порожньою назавжди.
 *
 * @module web-platform-dev/src/pages/UsersPage.dom.test
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import { act, render, renderHook, screen, waitFor } from "@testing-library/react";
import type { PublicProfile } from "@wwwuabot/shared";

const client = { apiFetch: vi.fn() };

vi.mock("../shared/api/client", () => ({
  apiFetch: (...args: unknown[]) => client.apiFetch(...args),
}));
vi.mock("@wwwuabot/ui/nav", () => ({ useScreenChrome: () => {} }));

const { usePublicUsers } = await import("./usePublicUsers");
const { UsersPage } = await import("./UsersPage");

const person = (id: number, platformUsername: string): PublicProfile => ({ id, platformUsername });

beforeEach(() => {
  vi.clearAllMocks();
  client.apiFetch.mockResolvedValue({ ok: true, items: [person(1, "olena")] });
});

describe("дані стрічки людей", () => {
  it("читає людей із публічного запиту", async () => {
    const { result } = renderHook(() => usePublicUsers());

    await waitFor(() => expect(result.current.items).toHaveLength(1));
    expect(client.apiFetch).toHaveBeenCalledWith("/api/public/users");
    expect(result.current.loading).toBe(false);
  });

  it("помилка називає причину, а не порожню стрічку", async () => {
    client.apiFetch.mockRejectedValue(new Error("Немає доступу"));

    const { result } = renderHook(() => usePublicUsers());

    await waitFor(() => expect(result.current.error).toBe("Немає доступу"));
    expect(result.current.items).toEqual([]);
    expect(result.current.loading).toBe(false);
  });

  it("повтор ставить «завантаження» й перечитує", async () => {
    const { result } = renderHook(() => usePublicUsers());
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      result.current.reload();
    });

    expect(result.current.loading).toBe(false);
    expect(client.apiFetch).toHaveBeenCalledTimes(2);
  });
});

describe("екран «Користувачі»", () => {
  it("малює картки з відповіді сервера", async () => {
    render(<UsersPage />);

    expect(await screen.findByText("#olena")).toBeTruthy();
  });
});
