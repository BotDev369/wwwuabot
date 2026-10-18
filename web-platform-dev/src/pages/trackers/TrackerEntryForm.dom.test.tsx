// @vitest-environment jsdom
/**
 * Форма дня: одиниця у підписі, зміна кожного поля — окремим патчем.
 *
 * Патч, а не ціла чернетка: поле, яке надсилає весь об'єкт, затирає день, який
 * людина щойно обрала в історії.
 *
 * @module web-platform-dev/src/pages/trackers/TrackerEntryForm.dom.test
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { Tracker } from "@wwwuabot/shared/trackers";

const handlers = { change: vi.fn(), submit: vi.fn() };

const { TrackerEntryForm } = await import("./TrackerEntryForm");

const water: Tracker = {
  id: 1,
  key: "water",
  title: "Вода",
  unit: "л",
  step: 0.25,
  goal: 2,
  min: 0,
  max: 20,
  icon: "droplet",
  isBuiltin: true,
};

function renderForm() {
  render(
    <TrackerEntryForm
      tracker={water}
      draft={{ day: "2026-10-17", value: "1.5", note: "" }}
      maxDay="2026-10-17"
      saving={false}
      onChange={handlers.change}
      onSubmit={handlers.submit}
    />,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("запис дня", () => {
  it("підпис значення каже одиницю, а не «значення» без мірки", () => {
    renderForm();
    expect(screen.getByLabelText("Значення, л")).toBeTruthy();
  });

  it("зміна кожного поля — окремий патч", async () => {
    renderForm();

    fireEvent.change(screen.getByLabelText("День"), { target: { value: "2026-10-16" } });
    expect(handlers.change).toHaveBeenCalledWith({ day: "2026-10-16" });

    await userEvent.type(screen.getByLabelText("Нотатка"), "після бігу");
    // Чернетка контрольована сторінкою: тут перевіряємо, що кожен дотик дає
    // патч саме поля нотатки, а не цілу форму.
    expect(handlers.change).toHaveBeenCalledWith({ note: "п" });
  });

  it("надсилання форми — це `onSubmit`, а не новий день", async () => {
    renderForm();

    await userEvent.click(screen.getByRole("button", { name: "Зберегти" }));

    expect(handlers.submit).toHaveBeenCalled();
  });

  it("⛔ підтвердження збереження не малюється — поле й так порожніє", () => {
    renderForm();
    expect(screen.queryByRole("status")).toBeNull();
    expect(screen.queryByText("Збережено")).toBeNull();
  });
});
