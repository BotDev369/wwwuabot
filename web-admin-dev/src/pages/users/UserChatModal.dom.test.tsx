// @vitest-environment jsdom
/**
 * Переписка з ботом: остання порція, «ще 6» старших і перехід у картку.
 *
 * @module web-admin-dev/src/pages/users/UserChatModal.dom.test
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { BotMessageRow } from "../../shared/api/users.api";

const api = vi.hoisted(() => ({ listUserMessages: vi.fn() }));
vi.mock("../../shared/api/users.api", () => ({ listUserMessages: api.listUserMessages }));

const { UserChatModal } = await import("./UserChatModal");

function message(id: number, direction: "in" | "out", text: string): BotMessageRow {
  return {
    id,
    direction,
    message_id: id,
    kind: "text",
    text,
    meta: null,
    created_at: "2026-11-22 10:00:00",
    edited_at: null,
    deleted_at: null,
  };
}

beforeEach(() => api.listUserMessages.mockReset());

describe("UserChatModal", () => {
  it("малює останню порцію й догортає старші за курсором", async () => {
    api.listUserMessages
      .mockResolvedValueOnce({
        messages: [message(7, "in", "останнє питання")],
        hasMore: true,
        nextBefore: 7,
      })
      .mockResolvedValueOnce({
        messages: [message(5, "out", "старіша відповідь")],
        hasMore: false,
        nextBefore: null,
      });

    render(<UserChatModal userId={7} title="Оля" onClose={vi.fn()} onOpenCard={vi.fn()} />);

    await waitFor(() => expect(screen.getByText("останнє питання")).toBeTruthy());
    expect(api.listUserMessages).toHaveBeenCalledWith(7);

    fireEvent.click(screen.getByText("Показати ще 6"));

    await waitFor(() => expect(screen.getByText("старіша відповідь")).toBeTruthy());
    expect(api.listUserMessages).toHaveBeenLastCalledWith(7, 7);
    expect(screen.queryByText("Показати ще 6")).toBeNull();
  });

  it("порожня переписка каже, що розмови ще немає", async () => {
    api.listUserMessages.mockResolvedValueOnce({
      messages: [],
      hasMore: false,
      nextBefore: null,
    });

    render(<UserChatModal userId={7} onClose={vi.fn()} onOpenCard={vi.fn()} />);

    await waitFor(() => expect(screen.getByText(/Переписки ще немає/)).toBeTruthy());
    expect(screen.getByText("Переписка · #7")).toBeTruthy();
  });

  it("перехід у картку користувача", async () => {
    api.listUserMessages.mockResolvedValueOnce({
      messages: [],
      hasMore: false,
      nextBefore: null,
    });
    const onOpenCard = vi.fn();

    render(<UserChatModal userId={7} onClose={vi.fn()} onOpenCard={onOpenCard} />);

    await waitFor(() => expect(screen.getByText("Картка користувача")).toBeTruthy());
    fireEvent.click(screen.getByText("Картка користувача"));
    expect(onOpenCard).toHaveBeenCalledWith(7);
  });
});
