// @vitest-environment jsdom
/**
 * Крок даних: одна дата (для співставлення — до чотирьох) і ім'я за бажанням.
 *
 * Ламається мовчки: без дати кнопка мусить мовчати; зайвий рядок у
 * співставленні мусить прибиратися; ім'я не мусить ставати умовою входу.
 *
 * @module web-platform-dev/src/pages/analysis/SubjectStep.dom.test
 */

import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { SubjectStep } from "./SubjectStep";

vi.mock("@wwwuabot/ui/nav", () => ({ useScreenChrome: () => {} }));

function Probe(): React.ReactElement {
  const location = useLocation();
  return <p>{`${location.pathname}${location.search}`}</p>;
}

function renderStep(mode: "person" | "event" | "compare"): void {
  render(
    <MemoryRouter initialEntries={[`/analysis/${mode}`]}>
      <Routes>
        <Route path={`/analysis/${mode}`} element={<SubjectStep mode={mode} />} />
        <Route path={`/analysis/${mode}/systems`} element={<Probe />} />
      </Routes>
    </MemoryRouter>,
  );
}

afterEach(cleanup);

describe("крок даних", () => {
  it("без дати не пускає далі, з датою веде на крок систем", async () => {
    renderStep("person");

    expect(screen.getByRole("heading", { name: "Кого аналізуємо?" })).toBeTruthy();
    const submit = screen.getByRole("button", { name: "Далі" });
    expect((submit as HTMLButtonElement).disabled).toBe(true);

    fireEvent.change(screen.getByLabelText("Дата народження"), {
      target: { value: "1980-03-03" },
    });
    expect((submit as HTMLButtonElement).disabled).toBe(false);

    await userEvent.type(screen.getByLabelText("Ім'я"), "Іван");
    await userEvent.click(submit);

    expect(
      screen.getByText("/analysis/person/systems?dates=1980-03-03&labels=%D0%86%D0%B2%D0%B0%D0%BD"),
    ).toBeTruthy();
  });

  it("подія питає дату події й не вимагає імені", () => {
    renderStep("event");

    expect(screen.getByLabelText("Дата події")).toBeTruthy();
    expect(screen.getByPlaceholderText("Наприклад, запуск")).toBeTruthy();
  });

  it("співставлення починає з двох рядків і додає ще до чотирьох", async () => {
    renderStep("compare");

    expect(screen.getAllByLabelText("Дата народження")).toHaveLength(2);
    expect(screen.queryByRole("button", { name: "Прибрати рядок" })).toBeNull();

    await userEvent.click(screen.getByRole("button", { name: /Додати ще/ }));
    expect(screen.getAllByLabelText("Дата народження")).toHaveLength(3);
    expect(screen.getAllByRole("button", { name: "Прибрати рядок" })).toHaveLength(3);

    await userEvent.click(screen.getByRole("button", { name: /Додати ще/ }));
    expect(screen.getAllByLabelText("Дата народження")).toHaveLength(4);
    expect(screen.queryByRole("button", { name: /Додати ще/ })).toBeNull();

    await userEvent.click(screen.getAllByRole("button", { name: "Прибрати рядок" })[0]);
    expect(screen.getAllByLabelText("Дата народження")).toHaveLength(3);
    expect(screen.getAllByRole("button", { name: "Прибрати рядок" })).toHaveLength(3);
  });

  it("порожній рядок співставлення не їде в адресу", async () => {
    renderStep("compare");

    const dates = screen.getAllByLabelText("Дата народження");
    fireEvent.change(dates[0], { target: { value: "1980-03-03" } });
    await userEvent.click(screen.getByRole("button", { name: "Далі" }));

    expect(screen.getByText("/analysis/compare/systems?dates=1980-03-03&labels=")).toBeTruthy();
  });
});
