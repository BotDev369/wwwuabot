// @vitest-environment jsdom
/**
 * Смуга масових дій: з'являється лише з вибором, видалення питає підтвердження.
 *
 * @module web-admin-dev/src/pages/users/UserBulkBar.dom.test
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";

const store = vi.hoisted(() => ({ state: {} as Record<string, unknown> }));
vi.mock("../../features/users/store", () => ({
  useUsersStore: () => store.state,
}));

const dialog = vi.hoisted(() => ({ confirm: vi.fn(async () => true) }));
vi.mock("@wwwuabot/ui/dialog", () => ({ useDialog: () => dialog }));

const { UserBulkBar } = await import("./UserBulkBar");

function state(overrides: Record<string, unknown> = {}) {
  return {
    selectedIds: new Set<number>([1, 2]),
    clearSelection: vi.fn(),
    bulk: vi.fn(async () => {}),
    ...overrides,
  };
}

beforeEach(() => {
  store.state = state();
  dialog.confirm.mockClear();
  dialog.confirm.mockResolvedValue(true);
});

describe("UserBulkBar", () => {
  it("без вибору не малює нічого", () => {
    store.state = state({ selectedIds: new Set<number>() });
    const { container } = render(<UserBulkBar />);

    expect(container.innerHTML).toBe("");
  });

  it("показує, скільки вибрано", () => {
    render(<UserBulkBar />);

    expect(screen.getByText(/Вибрано: 2/)).toBeTruthy();
  });

  it("блокування й розблокування — дві різні дії", () => {
    const bulk = vi.fn(async () => {});
    store.state = state({ bulk });
    render(<UserBulkBar />);

    fireEvent.click(screen.getByRole("button", { name: /Заблокувати/ }));
    expect(bulk).toHaveBeenCalledWith("block");

    fireEvent.click(screen.getByRole("button", { name: /Розблокувати/ }));
    expect(bulk).toHaveBeenCalledWith("unblock");
  });

  it("видалення без підтвердження не виконується", async () => {
    const bulk = vi.fn(async () => {});
    store.state = state({ bulk });
    dialog.confirm.mockResolvedValueOnce(false);
    render(<UserBulkBar />);

    fireEvent.click(screen.getByRole("button", { name: /Видалити/ }));
    await Promise.resolve();

    expect(dialog.confirm).toHaveBeenCalledWith("Видалити 2 користувачів?", expect.anything());
    expect(bulk).not.toHaveBeenCalled();
  });

  it("видалення з підтвердженням виконується", async () => {
    const bulk = vi.fn(async () => {});
    store.state = state({ bulk });
    render(<UserBulkBar />);

    fireEvent.click(screen.getByRole("button", { name: /Видалити/ }));
    await Promise.resolve();

    expect(bulk).toHaveBeenCalledWith("delete");
  });

  it("скасувати знімає вибір", () => {
    const clearSelection = vi.fn();
    store.state = state({ clearSelection });
    render(<UserBulkBar />);

    fireEvent.click(screen.getByRole("button", { name: /Скасувати/ }));
    expect(clearSelection).toHaveBeenCalled();
  });
});
