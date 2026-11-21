// @vitest-environment jsdom
/**
 * Одна форма: **вибрати зі збережених або додати нову**. Збережене можна
 * змінити й видалити тут же, а новий рядок стає записом — інакше наступного
 * разу «вибрати зі збережених» нема з чого.
 *
 * @module web-platform-dev/src/pages/analysis/SubjectStep.saved.dom.test
 */

import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import type { MyDate } from "@wwwuabot/shared/types/mydate";
import { SubjectStep } from "./SubjectStep";

vi.mock("@wwwuabot/ui/nav", () => ({ useScreenChrome: () => {} }));
vi.mock("@wwwuabot/ui/analysis/api", () => ({
  fetchMyDates: vi.fn(),
  saveMyDate: vi.fn(),
  deleteMyDate: vi.fn(),
}));

const api = await import("@wwwuabot/ui/analysis/api");

const SAVED: MyDate = {
  id: "d1",
  user_id: 1,
  date: "1980-03-03",
  type: "person",
  name: "Олена",
  tags: [],
  notes: "",
  created_at: "2026-01-01 00:00:00",
  updated_at: "2026-01-01 00:00:00",
};

function renderStep(): void {
  render(
    <MemoryRouter initialEntries={["/analysis/person"]}>
      <Routes>
        <Route path="/analysis/person" element={<SubjectStep mode="person" />} />
        <Route path="/analysis/person/systems" element={<p>крок систем</p>} />
      </Routes>
    </MemoryRouter>,
  );
}

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("форма даних зі збереженими", () => {
  it("показує збережене й підставляє його в рядок", async () => {
    vi.mocked(api.fetchMyDates).mockResolvedValue([SAVED]);
    renderStep();

    await waitFor(() => expect(screen.getByText("Зі збережених")).toBeTruthy());
    expect(screen.getByText("Олена")).toBeTruthy();

    await userEvent.click(screen.getByRole("checkbox"));
    const dates = screen.getAllByLabelText("Дата народження") as HTMLInputElement[];
    expect(dates[0].value).toBe("1980-03-03");
    expect((screen.getAllByLabelText("Підпис")[0] as HTMLInputElement).value).toBe("Олена");
  });

  it("змінює збережений запис і видаляє його", async () => {
    vi.mocked(api.fetchMyDates).mockResolvedValue([SAVED]);
    vi.mocked(api.saveMyDate).mockResolvedValue();
    vi.mocked(api.deleteMyDate).mockResolvedValue();
    renderStep();

    await waitFor(() => expect(screen.getByText("Зі збережених")).toBeTruthy());
    await userEvent.click(screen.getByRole("button", { name: /Змінити/ }));

    const name = screen.getAllByLabelText("Підпис")[0] as HTMLInputElement;
    expect(name.value).toBe("Олена");
    await userEvent.clear(name);
    await userEvent.type(name, "Олена К.");
    await userEvent.click(screen.getByRole("button", { name: "Зберегти зміни" }));

    await waitFor(() =>
      expect(api.saveMyDate).toHaveBeenCalledWith(
        expect.objectContaining({ id: "d1", name: "Олена К." }),
      ),
    );

    await userEvent.click(screen.getByRole("button", { name: /Видалити/ }));
    await waitFor(() => expect(api.deleteMyDate).toHaveBeenCalledWith("d1"));
  });

  it("новий рядок стає записом і веде на крок систем", async () => {
    vi.mocked(api.fetchMyDates).mockResolvedValue([]);
    vi.mocked(api.saveMyDate).mockResolvedValue();
    renderStep();

    fireEvent.change(screen.getByLabelText("Дата народження"), {
      target: { value: "1991-12-31" },
    });
    await userEvent.type(screen.getByLabelText("Підпис"), "Іван");
    await userEvent.click(screen.getByRole("button", { name: "Далі" }));

    await waitFor(() =>
      expect(api.saveMyDate).toHaveBeenCalledWith(
        expect.objectContaining({ date: "1991-12-31", name: "Іван", type: "person" }),
      ),
    );
    expect(screen.getByText("крок систем")).toBeTruthy();
  });
});
