// @vitest-environment jsdom
/**
 * Переписка з ботом: остання порція, «ще 6» старших, перехід у картку й дії
 * адміна — правка та видалення з чесними відмовами.
 *
 * @module web-admin-dev/src/pages/users/UserChatModal.dom.test
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { BotMessageRow } from "../../shared/api/users.api";

const api = vi.hoisted(() => ({
  listUserMessages: vi.fn(),
  editUserMessage: vi.fn(),
  deleteUserMessage: vi.fn(),
}));
vi.mock("../../shared/api/users.api", () => ({
  listUserMessages: api.listUserMessages,
  editUserMessage: api.editUserMessage,
  deleteUserMessage: api.deleteUserMessage,
}));

const dialog = vi.hoisted(() => ({ prompt: vi.fn(), confirm: vi.fn(), alert: vi.fn() }));
vi.mock("@wwwuabot/ui/dialog", () => ({ useDialog: () => dialog }));

const { UserChatModal } = await import("./UserChatModal");

function message(
  id: number,
  direction: "in" | "out",
  text: string,
  overrides: Partial<BotMessageRow> = {},
): BotMessageRow {
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
    ...overrides,
  };
}

function page(messages: BotMessageRow[]) {
  return { messages, hasMore: false, nextBefore: null };
}

beforeEach(() => {
  api.listUserMessages.mockReset();
  api.editUserMessage.mockReset();
  api.deleteUserMessage.mockReset();
  dialog.prompt.mockReset().mockResolvedValue(null);
  dialog.confirm.mockReset().mockResolvedValue(false);
  dialog.alert.mockReset().mockResolvedValue(undefined);
});

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
    api.listUserMessages.mockResolvedValueOnce(page([]));

    render(<UserChatModal userId={7} onClose={vi.fn()} onOpenCard={vi.fn()} />);

    await waitFor(() => expect(screen.getByText(/Переписки ще немає/)).toBeTruthy());
    expect(screen.getByText("Переписка · #7")).toBeTruthy();
  });

  it("перехід у картку користувача", async () => {
    api.listUserMessages.mockResolvedValueOnce(page([]));
    const onOpenCard = vi.fn();

    render(<UserChatModal userId={7} onClose={vi.fn()} onOpenCard={onOpenCard} />);

    await waitFor(() => expect(screen.getByText("Картка користувача")).toBeTruthy());
    fireEvent.click(screen.getByText("Картка користувача"));
    expect(onOpenCard).toHaveBeenCalledWith(7);
  });

  it("править ботівське повідомлення й показує новий текст", async () => {
    api.listUserMessages.mockResolvedValueOnce(page([message(7, "out", "старий текст")]));
    dialog.prompt.mockResolvedValue("новий текст");
    api.editUserMessage.mockResolvedValue(
      message(7, "out", "новий текст", { edited_at: "2026-11-22 12:00:00" }),
    );

    render(<UserChatModal userId={7} onClose={vi.fn()} onOpenCard={vi.fn()} />);

    await waitFor(() => expect(screen.getByText("старий текст")).toBeTruthy());
    fireEvent.click(screen.getByText("Змінити"));

    await waitFor(() => expect(api.editUserMessage).toHaveBeenCalledWith(7, 7, "новий текст"));
    await waitFor(() => expect(screen.getByText("новий текст")).toBeTruthy());
    expect(dialog.prompt).toHaveBeenCalledWith(
      "Новий текст повідомлення",
      expect.objectContaining({ defaultValue: "старий текст" }),
    );
  });

  it("відмову правки показує діалогом, а не мовчки", async () => {
    api.listUserMessages.mockResolvedValueOnce(page([message(7, "out", "старий текст")]));
    dialog.prompt.mockResolvedValue("нове");
    api.editUserMessage.mockRejectedValue(
      new Error("Повідомлення старше 48 годин — Telegram уже не дає його змінити."),
    );

    render(<UserChatModal userId={7} onClose={vi.fn()} onOpenCard={vi.fn()} />);

    await waitFor(() => expect(screen.getByText("старий текст")).toBeTruthy());
    fireEvent.click(screen.getByText("Змінити"));

    await waitFor(() =>
      expect(dialog.alert).toHaveBeenCalledWith(
        expect.stringContaining("48"),
        expect.objectContaining({ tone: "danger" }),
      ),
    );
  });

  it("видалене лишається з позначкою й без дій", async () => {
    api.listUserMessages.mockResolvedValueOnce(page([message(7, "out", "старий текст")]));
    dialog.confirm.mockResolvedValue(true);
    api.deleteUserMessage.mockResolvedValue(
      message(7, "out", "старий текст", { deleted_at: "2026-11-22 12:00:00" }),
    );

    render(<UserChatModal userId={7} onClose={vi.fn()} onOpenCard={vi.fn()} />);

    await waitFor(() => expect(screen.getByText("старий текст")).toBeTruthy());
    fireEvent.click(screen.getByText("Видалити"));

    await waitFor(() => expect(api.deleteUserMessage).toHaveBeenCalledWith(7, 7));
    await waitFor(() => expect(screen.getByText("видалено")).toBeTruthy());
    expect(screen.queryByText("Змінити")).toBeNull();
    expect(screen.queryByText("Видалити")).toBeNull();
    expect(screen.getByText("старий текст")).toBeTruthy();
  });

  it("людині можна лише видалити, ботові — і змінити", async () => {
    api.listUserMessages.mockResolvedValueOnce(page([message(8, "in", "питання людини")]));

    render(<UserChatModal userId={7} onClose={vi.fn()} onOpenCard={vi.fn()} />);

    await waitFor(() => expect(screen.getByText("питання людини")).toBeTruthy());
    expect(screen.queryByText("Змінити")).toBeNull();
    expect(screen.getByText("Видалити")).toBeTruthy();
  });
});
