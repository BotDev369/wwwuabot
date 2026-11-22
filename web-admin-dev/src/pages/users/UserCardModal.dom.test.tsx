// @vitest-environment jsdom
/**
 * Картка користувача в адмінці: перехід у переписку — зворотний бік того
 * самого кліку, що веде з переписки в картку.
 *
 * @module web-admin-dev/src/pages/users/UserCardModal.dom.test
 */

import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";

const api = vi.hoisted(() => ({ readUserProfile: vi.fn() }));
vi.mock("../../shared/api/users.api", () => ({ readUserProfile: api.readUserProfile }));

const { UserCardModal } = await import("./UserCardModal");

describe("UserCardModal", () => {
  it("веде з картки в переписку", async () => {
    api.readUserProfile.mockResolvedValueOnce({
      id: 777,
      firstName: "Оля",
      lastName: "Коваль",
      username: "olya_tg",
      platformUsername: "olya",
      role: "user",
      tariff: "free",
      status: "active",
      telegram: null,
    });
    const onChat = vi.fn();

    render(
      <UserCardModal
        userId={777}
        onClose={vi.fn()}
        onEdit={vi.fn()}
        onMessage={vi.fn()}
        onChat={onChat}
      />,
    );

    await waitFor(() => expect(screen.getByText("Переписка")).toBeTruthy());
    fireEvent.click(screen.getByText("Переписка"));
    expect(onChat).toHaveBeenCalledWith(777);
  });
});
