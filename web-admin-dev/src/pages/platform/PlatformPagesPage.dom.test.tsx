// @vitest-environment jsdom
/**
 * Екран «Платформа»: список, пошук, картка й збереження `platform_pages`.
 *
 * @module web-admin-dev/src/pages/platform/PlatformPagesPage.dom.test
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";

const api = vi.hoisted(() => ({ list: vi.fn(), read: vi.fn(), update: vi.fn() }));
vi.mock("../../shared/api/scenarios-admin.api", () => ({
  listPlatformPages: api.list,
  readPlatformPage: api.read,
  updatePlatformPage: api.update,
}));

const { PlatformPagesPage } = await import("./PlatformPagesPage");

const ITEM = {
  id: 2,
  slug: "dateanalysis",
  title: "Аналіз дат",
  template_key: null,
  is_public: 0,
  owner_id: null,
  updated_at: "2026-11-12 00:00:00",
};

const RECORD = {
  ...ITEM,
  photo_url: null,
  page_data: '{"blocks":[]}',
  is_active: 1,
};

beforeEach(() => {
  vi.clearAllMocks();
  api.list.mockResolvedValue([ITEM]);
  api.read.mockResolvedValue(RECORD);
  api.update.mockResolvedValue(undefined);
});

describe("PlatformPagesPage", () => {
  it("показує список сторінок", async () => {
    render(<PlatformPagesPage />);

    expect(await screen.findByText("dateanalysis")).toBeTruthy();
    expect(screen.getByText("Аналіз дат")).toBeTruthy();
  });

  it("порожній пошук пояснює, що нічого не знайдено", async () => {
    render(<PlatformPagesPage />);
    await screen.findByText("dateanalysis");

    fireEvent.change(screen.getByPlaceholderText(/Пошук/), { target: { value: "нема" } });
    expect(screen.getByText(/Нічого не знайдено/)).toBeTruthy();
  });

  it("сторінка відкривається, зберігає поля й закривається", async () => {
    render(<PlatformPagesPage />);
    await screen.findByText("dateanalysis");

    fireEvent.click(screen.getByRole("button", { name: "Відкрити" }));
    await waitFor(() => expect(api.read).toHaveBeenCalledWith(2));

    fireEvent.change(screen.getByLabelText("Назва"), { target: { value: "Нова назва" } });
    fireEvent.click(screen.getByRole("button", { name: "Зберегти" }));

    await waitFor(() =>
      expect(api.update).toHaveBeenCalledWith(
        2,
        expect.objectContaining({ title: "Нова назва", is_public: 0 }),
      ),
    );
    await waitFor(() => expect(screen.queryByRole("button", { name: "Зберегти" })).toBeNull());
  });

  it("помилка збереження лишається в картці", async () => {
    api.update.mockRejectedValueOnce(new Error("Адреса вже зайнята"));
    render(<PlatformPagesPage />);
    await screen.findByText("dateanalysis");

    fireEvent.click(screen.getByRole("button", { name: "Відкрити" }));
    await waitFor(() => expect(api.read).toHaveBeenCalled());
    fireEvent.click(screen.getByRole("button", { name: "Зберегти" }));

    expect(await screen.findByText("Адреса вже зайнята")).toBeTruthy();
  });

  it("⛔ не вдалося завантажити — показує причину й дає повторити", async () => {
    api.list.mockRejectedValueOnce(new Error("API лежить"));
    render(<PlatformPagesPage />);

    expect(await screen.findByText(/API лежить/)).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Спробувати ще" }));
    expect(await screen.findByText("dateanalysis")).toBeTruthy();
  });

  it("картка закривається без збереження", async () => {
    render(<PlatformPagesPage />);
    await screen.findByText("dateanalysis");

    fireEvent.click(screen.getByRole("button", { name: "Відкрити" }));
    await waitFor(() => expect(api.read).toHaveBeenCalled());
    fireEvent.click(screen.getByRole("button", { name: "Закрити" }));

    expect(screen.queryByRole("button", { name: "Зберегти" })).toBeNull();
    expect(api.update).not.toHaveBeenCalled();
  });
});
