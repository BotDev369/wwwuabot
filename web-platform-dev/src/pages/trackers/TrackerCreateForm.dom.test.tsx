// @vitest-environment jsdom
/**
 * Форма власного трекера перевіряє те саме, що й сервер (`validateTrackerFields`).
 *
 * Без цього порожня назва йшла б у мережу, а людина читала б загальне «помилка»:
 * поле мусить сказати, що саме не так, до запиту.
 *
 * @module web-platform-dev/src/pages/trackers/TrackerCreateForm.dom.test
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { Tracker } from "@wwwuabot/shared/trackers";

const handlers = {
  create: vi.fn(),
  created: vi.fn(),
  cancel: vi.fn(),
};

const { TrackerCreateForm } = await import("./TrackerCreateForm");

const created: Tracker = {
  id: 7,
  key: "own-1",
  title: "Кава",
  unit: "чашок",
  step: 1,
  goal: null,
  min: 0,
  max: null,
  icon: "bar-chart",
  isBuiltin: false,
};

beforeEach(() => {
  vi.clearAllMocks();
});

function renderForm() {
  render(
    <TrackerCreateForm
      onCreate={handlers.create}
      onCreated={handlers.created}
      onCancel={handlers.cancel}
    />,
  );
}

describe("свій трекер", () => {
  it("⛔ порожня назва не йде на сервер", async () => {
    renderForm();

    await userEvent.click(screen.getByRole("button", { name: "Створити" }));

    expect(handlers.create).not.toHaveBeenCalled();
    expect(screen.getByText("Назва — від 1 до 40 символів.")).toBeTruthy();
  });

  it("створює з назвою, одиницею й ціллю", async () => {
    handlers.create.mockResolvedValueOnce(created);
    renderForm();

    await userEvent.type(screen.getByLabelText("Назва"), "Кава");
    await userEvent.type(screen.getByLabelText("Одиниця"), "чашок");
    await userEvent.type(screen.getByLabelText("Ціль дня"), "3");
    await userEvent.click(screen.getByRole("button", { name: "Створити" }));

    expect(handlers.create).toHaveBeenCalledWith({
      title: "Кава",
      unit: "чашок",
      step: 1,
      goal: 3,
      min: 0,
      max: null,
    });
    expect(handlers.created).toHaveBeenCalledWith(created);
  });

  it("кому в цілі читає як десяткову — так пише телефон", async () => {
    handlers.create.mockResolvedValueOnce(created);
    renderForm();

    await userEvent.type(screen.getByLabelText("Назва"), "Вода");
    await userEvent.type(screen.getByLabelText("Ціль дня"), "2,5");
    await userEvent.click(screen.getByRole("button", { name: "Створити" }));

    expect(handlers.create).toHaveBeenCalledWith(
      expect.objectContaining({ goal: 2.5, title: "Вода" }),
    );
  });

  it("провал сервера лишає форму відкритою", async () => {
    handlers.create.mockResolvedValueOnce(null);
    renderForm();

    await userEvent.type(screen.getByLabelText("Назва"), "Кава");
    await userEvent.click(screen.getByRole("button", { name: "Створити" }));

    expect(handlers.created).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "Створити" })).toBeTruthy();
  });

  it("«Скасувати» закриває форму, нічого не створюючи", async () => {
    renderForm();

    await userEvent.click(screen.getByRole("button", { name: "Скасувати" }));

    expect(handlers.cancel).toHaveBeenCalled();
    expect(handlers.create).not.toHaveBeenCalled();
  });
});
