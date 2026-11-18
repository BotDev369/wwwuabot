// @vitest-environment jsdom
/**
 * «Платформа → Сторінки» — **лише перегляд**.
 *
 * Найдорожча помилка тут — повернути форму: інпут і кнопка «Зберегти» знову
 * зробили б адмінку другим способом зібрати екран руками.
 *
 * @module web-admin-dev/src/pages/platform/PlatformPagesPage.dom.test
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const api = {
  list: vi.fn(),
  read: vi.fn(),
};

vi.mock("../../shared/api/scenarios-admin.api", () => ({
  listPlatformPages: (...args: unknown[]) => api.list(...args),
  readPlatformPage: (...args: unknown[]) => api.read(...args),
}));

const { PlatformPagesPage } = await import("./PlatformPagesPage");

const row = {
  id: 7,
  slug: "pro-nas",
  title: "Про нас",
  template_key: "screen",
  is_public: 1,
  updated_at: "2026-10-01 10:00:00",
};

const record = {
  ...row,
  photo_url: "",
  page_data: '{"version":1,"zones":{"main":[]}}',
  is_active: 1,
};

beforeEach(() => {
  vi.clearAllMocks();
  api.list.mockResolvedValue([row]);
  api.read.mockResolvedValue(record);
});

afterEach(() => {
  cleanup();
});

describe("PlatformPagesPage", () => {
  it("показує список сторінок", async () => {
    render(<PlatformPagesPage />);

    expect(await screen.findByText("Про нас")).toBeTruthy();
    expect(screen.getByText("pro-nas")).toBeTruthy();
  });

  it("порожній пошук пояснює, що нічого не знайдено", async () => {
    render(<PlatformPagesPage />);
    await screen.findByText("Про нас");

    await userEvent.type(
      screen.getByPlaceholderText("Пошук за адресою або назвою…"),
      "немає такого",
    );

    expect(await screen.findByText(/Нічого не знайдено/)).toBeTruthy();
  });

  it("картка показує поля сторінки, але не дає їх правити", async () => {
    render(<PlatformPagesPage />);
    await screen.findByText("Про нас");

    await userEvent.click(screen.getByRole("button", { name: "Відкрити" }));

    await waitFor(() => expect(api.read).toHaveBeenCalledWith(7));
    expect(await screen.findByText('{"version":1,"zones":{"main":[]}}')).toBeTruthy();
    expect(screen.queryByRole("button", { name: /Зберегти/ })).toBeNull();
    const card = document.querySelector(".wb-admin-form");
    expect(card).toBeTruthy();
    expect(card!.querySelectorAll("input, textarea, select").length).toBe(0);
  });

  it("картка закривається", async () => {
    render(<PlatformPagesPage />);
    await screen.findByText("Про нас");
    await userEvent.click(screen.getByRole("button", { name: "Відкрити" }));
    await screen.findByText('{"version":1,"zones":{"main":[]}}');

    await userEvent.click(screen.getAllByRole("button", { name: "Закрити" })[0]);

    await waitFor(() => expect(screen.queryByText("Контент сторінки (JSON)")).toBeNull());
  });

  it("⛔ не вдалося завантажити — показує причину й дає повторити", async () => {
    api.list.mockRejectedValueOnce(new Error("Немає доступу"));

    render(<PlatformPagesPage />);

    expect(await screen.findByText("Не вдалося завантажити: Немає доступу")).toBeTruthy();
    await userEvent.click(screen.getByRole("button", { name: "Спробувати ще" }));
    expect(await screen.findByText("Про нас")).toBeTruthy();
  });
});
