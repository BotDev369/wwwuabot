// @vitest-environment jsdom
/**
 * Екран «Бот»: список, пошук, картка й збереження `bot_scenarios`.
 *
 * @module web-admin-dev/src/pages/bot/BotScenariosPage.dom.test
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";

const api = vi.hoisted(() => ({ list: vi.fn(), read: vi.fn(), update: vi.fn() }));
vi.mock("../../shared/api/scenarios-admin.api", () => ({
  listBotScenarios: api.list,
  readBotScenario: api.read,
  updateBotScenario: api.update,
}));

const { BotScenariosPage } = await import("./BotScenariosPage");

const ITEM = {
  id: 1,
  slug: "",
  bot_command: "/start",
  title: "WWWUABot",
  keyboard_type: "static",
  is_active: 1,
  updated_at: "2026-11-12 00:00:00",
};

const RECORD = {
  ...ITEM,
  photo_url: null,
  caption_top: "Привіт",
  caption_mid: null,
  caption_bot: null,
  buttons: "[]",
  awaits_input: null,
  input_path: null,
  input_next: null,
  price: null,
  qty_options: null,
  notify_groups: null,
  notify_template: null,
  rich_message: "false",
  rich_data: null,
};

beforeEach(() => {
  vi.clearAllMocks();
  api.list.mockResolvedValue([ITEM]);
  api.read.mockResolvedValue(RECORD);
  api.update.mockResolvedValue(undefined);
});

describe("BotScenariosPage", () => {
  it("показує список із командою та назвою", async () => {
    render(<BotScenariosPage />);

    expect(await screen.findByText("/start")).toBeTruthy();
    expect(screen.getByText("WWWUABot")).toBeTruthy();
  });

  it("порожній пошук пояснює, що нічого не знайдено", async () => {
    render(<BotScenariosPage />);
    await screen.findByText("/start");

    fireEvent.change(screen.getByPlaceholderText(/Пошук/), { target: { value: "нема" } });
    expect(screen.getByText(/Нічого не знайдено/)).toBeTruthy();
  });

  it("картка відкривається, зберігає поля й закривається", async () => {
    render(<BotScenariosPage />);
    await screen.findByText("/start");

    fireEvent.click(screen.getByRole("button", { name: "Відкрити" }));
    await waitFor(() => expect(api.read).toHaveBeenCalledWith(1));

    fireEvent.change(screen.getByLabelText("Підпис зверху"), {
      target: { value: "Новий підпис" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Зберегти" }));

    await waitFor(() =>
      expect(api.update).toHaveBeenCalledWith(
        1,
        expect.objectContaining({ caption_top: "Новий підпис", is_active: 1 }),
      ),
    );
    await waitFor(() => expect(screen.queryByRole("button", { name: "Зберегти" })).toBeNull());
  });

  it("помилка збереження лишається в картці", async () => {
    api.update.mockRejectedValueOnce(new Error("D1 недоступна"));
    render(<BotScenariosPage />);
    await screen.findByText("/start");

    fireEvent.click(screen.getByRole("button", { name: "Відкрити" }));
    await waitFor(() => expect(api.read).toHaveBeenCalled());
    fireEvent.click(screen.getByRole("button", { name: "Зберегти" }));

    expect(await screen.findByText("D1 недоступна")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Зберегти" })).toBeTruthy();
  });

  it("⛔ не вдалося завантажити — показує причину й дає повторити", async () => {
    api.list.mockRejectedValueOnce(new Error("мережа"));
    render(<BotScenariosPage />);

    expect(await screen.findByText(/мережа/)).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Спробувати ще" }));
    expect(await screen.findByText("/start")).toBeTruthy();
  });

  it("картка закривається без збереження", async () => {
    render(<BotScenariosPage />);
    await screen.findByText("/start");

    fireEvent.click(screen.getByRole("button", { name: "Відкрити" }));
    await waitFor(() => expect(api.read).toHaveBeenCalled());
    fireEvent.click(screen.getByRole("button", { name: "Скасувати" }));

    expect(screen.queryByRole("button", { name: "Зберегти" })).toBeNull();
    expect(api.update).not.toHaveBeenCalled();
  });
});
