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
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { Tracker, TrackerGroup } from "@wwwuabot/shared/trackers";

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
  groupId: null,
  isBuiltin: false,
  mode: "sum",
  valueType: "number",
};

beforeEach(() => {
  vi.clearAllMocks();
});

function renderForm(groups: TrackerGroup[] = []) {
  render(
    <TrackerCreateForm
      groups={groups}
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

  it("створює з назвою, одиницею з довідника, ціллю й видом запису", async () => {
    handlers.create.mockResolvedValueOnce(created);
    renderForm();

    await userEvent.type(screen.getByLabelText("Назва"), "Кава");
    // Одиниця — вибір, а не текст: типова береться з довідника, своя — окремим пунктом.
    await userEvent.selectOptions(screen.getByLabelText("Одиниця"), "custom");
    await userEvent.type(screen.getByLabelText("Своя одиниця"), "чашок");
    await userEvent.type(screen.getByLabelText("Ціль дня"), "3");
    await userEvent.click(screen.getByRole("button", { name: "Створити" }));

    // Другий аргумент — група; порожній селект означає «Свої» (null).
    expect(handlers.create).toHaveBeenCalledWith(
      {
        title: "Кава",
        unit: "чашок",
        step: 1,
        goal: 3,
        min: 0,
        max: null,
        mode: "sum",
        valueType: "number",
      },
      null,
    );
    expect(handlers.created).toHaveBeenCalledWith(created);
  });

  it("довідник одиниць згрупований за спорідненістю, а не суцільний список", () => {
    renderForm();

    const time = screen.getByRole("group", { name: "Час" });
    expect(within(time).getByRole("option", { name: "хв" })).toBeTruthy();
    expect(within(time).getByRole("option", { name: "декада" })).toBeTruthy();
    // Споріднені групи — окремі підписи: вага не живе серед часу.
    const mass = screen.getByRole("group", { name: "Вага" });
    expect(within(mass).getByRole("option", { name: "кг" })).toBeTruthy();
    expect(within(time).queryByRole("option", { name: "кг" })).toBeNull();
  });

  it("тип «так-ні» ховає одиницю, ціль, крок і вибір виду — їх у цього типу немає", async () => {
    handlers.create.mockResolvedValueOnce({ ...created, valueType: "boolean" });
    renderForm();

    await userEvent.click(screen.getByRole("tab", { name: "Так-ні" }));

    expect(screen.queryByLabelText("Одиниця")).toBeNull();
    expect(screen.queryByLabelText("Ціль дня")).toBeNull();
    expect(screen.queryByLabelText("Крок")).toBeNull();
    // ⛔ Блок «Як читати записи» ховається повністю: вибір, якого ніхто не бачить,
    // — це невидиме рішення, тож типовий вид ставить сервер, а не форма.
    expect(screen.queryByRole("tablist", { name: "Як читати записи" })).toBeNull();
    expect(screen.queryByLabelText("Як читати записи")).toBeNull();
    expect(screen.queryByRole("tab", { name: "Додавати за день" })).toBeNull();

    await userEvent.type(screen.getByLabelText("Назва"), "Не палю");
    await userEvent.click(screen.getByRole("button", { name: "Створити" }));

    // Межа 0…1, порожня одиниця й типовий вид «останній» — робить сервер
    // (`validateTrackerFields`), форма лише не подає полів, яких у цього типу не існує.
    expect(handlers.create).toHaveBeenCalledWith(
      expect.objectContaining({ title: "Не палю", valueType: "boolean", mode: "read" }),
      null,
    );
  });

  it("вид запису перемикається: «показувати останній» їде на сервер своїм словом", async () => {
    handlers.create.mockResolvedValueOnce(created);
    renderForm();

    await userEvent.type(screen.getByLabelText("Назва"), "Вага");
    await userEvent.click(screen.getByRole("tab", { name: "Показувати останній" }));
    await userEvent.click(screen.getByRole("button", { name: "Створити" }));

    expect(handlers.create).toHaveBeenCalledWith(
      expect.objectContaining({ title: "Вага", mode: "read" }),
      null,
    );
  });

  it("кому в цілі читає як десяткову — так пише телефон", async () => {
    handlers.create.mockResolvedValueOnce(created);
    renderForm();

    await userEvent.type(screen.getByLabelText("Назва"), "Вода");
    await userEvent.type(screen.getByLabelText("Ціль дня"), "2,5");
    await userEvent.click(screen.getByRole("button", { name: "Створити" }));

    expect(handlers.create).toHaveBeenCalledWith(
      expect.objectContaining({ goal: 2.5, title: "Вода" }),
      null,
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

  it("вибір групи їде на сервер номером, а не словом", async () => {
    handlers.create.mockResolvedValueOnce(created);
    const groups: TrackerGroup[] = [
      { id: 10, parentId: null, title: "Режим", key: "routine" },
      { id: 11, parentId: 10, title: "Ранкова рутина", key: null },
    ];
    renderForm(groups);

    await userEvent.type(screen.getByLabelText("Назва"), "Кава");
    await userEvent.selectOptions(screen.getByLabelText("Група"), "11");
    await userEvent.click(screen.getByRole("button", { name: "Створити" }));

    expect(handlers.create).toHaveBeenCalledWith(expect.objectContaining({ title: "Кава" }), 11);
  });
});
