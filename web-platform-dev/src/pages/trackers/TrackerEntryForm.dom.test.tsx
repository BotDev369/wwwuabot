// @vitest-environment jsdom
/**
 * Форма запису: одиниця у підписі, зміна поля — окремим патчем.
 *
 * Поля дати тут немає навмисно: вимір стається зараз, і день ставить сервер —
 * клієнт не має чим його підробити.
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
  groupId: null,
  isBuiltin: true,
  mode: "sum",
  valueType: "number",
};

function renderForm() {
  render(
    <TrackerEntryForm
      tracker={water}
      draft={{ value: "1.5", note: "" }}
      saving={false}
      onChange={handlers.change}
      onSubmit={handlers.submit}
    />,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("форма запису", () => {
  it("підпис значення каже одиницю, а не «значення» без мірки", () => {
    renderForm();
    expect(screen.getByLabelText("Значення, л")).toBeTruthy();
  });

  it("⛔ поля дати немає — день ставить сервер, а не людина", () => {
    renderForm();
    expect(screen.queryByLabelText("День")).toBeNull();
    expect(screen.queryByRole("button", { name: /день/i })).toBeNull();
  });

  it("зміна кожного поля — окремий патч", async () => {
    renderForm();

    fireEvent.change(screen.getByLabelText("Значення, л"), { target: { value: "2" } });
    expect(handlers.change).toHaveBeenCalledWith({ value: "2" });

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

  it("«так-ні» не питає число: статус обирають вкладкою, значення — «1» / «0»", async () => {
    const habit: Tracker = {
      ...water,
      key: "own-habit",
      title: "Тренування",
      unit: "",
      valueType: "boolean",
    };
    render(
      <TrackerEntryForm
        tracker={habit}
        draft={{ value: "", note: "" }}
        saving={false}
        onChange={handlers.change}
        onSubmit={handlers.submit}
      />,
    );

    expect(screen.queryByLabelText(/Значення/)).toBeNull();
    await userEvent.click(screen.getByRole("tab", { name: "Так" }));
    // Клавіша несе те саме значення, що йде на сервер: межу 0…1 перевіряє він.
    expect(handlers.change).toHaveBeenCalledWith({ value: "1" });

    await userEvent.click(screen.getByRole("tab", { name: "Ні" }));
    expect(handlers.change).toHaveBeenCalledWith({ value: "0" });
  });
});
