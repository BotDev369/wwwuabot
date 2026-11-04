// @vitest-environment jsdom
/**
 * Список звернень — та сама `DataTable`, що й усюди: рядок відкриває звернення.
 *
 * @module web-admin-dev/src/pages/messages/RequestList.dom.test
 */

import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import type { AccessRequestItem } from "@wwwuabot/shared/access-requests";
import { RequestList } from "./RequestList";

const ITEM: AccessRequestItem = {
  id: 12,
  user_id: 4409,
  text: "Добрий день! Хочу отримати доступ до платформи, бо цікавлюся сценаріями.",
  created_at: "2026-10-01 09:00:00",
  first_name: "Оксана",
  last_name: "Гриценко",
  username: "oksana_g",
  platform_username: "#oksana",
};

const LONG: AccessRequestItem = {
  ...ITEM,
  id: 13,
  user_id: 4410,
  first_name: "Ігор",
  last_name: null,
  username: null,
  platform_username: null,
  text: "а".repeat(200),
};

describe("RequestList", () => {
  it("малює спільну таблицю з автором, текстом і часом", () => {
    const { container } = render(
      <RequestList items={[ITEM]} emptyText="Звернень немає." onOpen={vi.fn()} />,
    );

    expect(container.querySelector(".wb-table-scroll")).toBeTruthy();
    expect(container.querySelector("table")?.className).toContain("wb-table");
    // Ім'я людини — головне; Telegram-id стоїть позначкою під ним.
    expect(screen.getByText("Оксана Гриценко")).toBeTruthy();
    expect(screen.getByText("4409")).toBeTruthy();
    expect(screen.getByText("Автор")).toBeTruthy();
  });

  it("довгий текст обрізається в рядку — повний у модалці", () => {
    render(<RequestList items={[LONG]} emptyText="Звернень немає." onOpen={vi.fn()} />);

    expect(screen.getByText(`${"а".repeat(80)}…`)).toBeTruthy();
  });

  it("клік по рядку відкриває звернення", () => {
    const onOpen = vi.fn();
    render(<RequestList items={[ITEM]} emptyText="Звернень немає." onOpen={onOpen} />);

    fireEvent.click(screen.getByText("Оксана Гриценко"));
    expect(onOpen).toHaveBeenCalledWith(12);
  });

  it("порожній список каже причину", () => {
    const { container } = render(
      <RequestList items={[]} emptyText="Звернень немає." onOpen={vi.fn()} />,
    );

    expect(screen.getByText("Звернень немає.")).toBeTruthy();
    expect(container.querySelector(".wb-table-empty")).toBeTruthy();
  });
});
