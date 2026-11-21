// @vitest-environment jsdom
/**
 * «Люди і події»: три акордеони, чекбокси й повний CRUD. Тест ловить те, що
 * ламається мовчки: без вибору немає співставлення, без збереження група
 * лишається лише на екрані.
 *
 * @module web-platform-dev/src/pages/analysis/AnalysisPeoplePage.dom.test
 */

import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import type { MyDate } from "@wwwuabot/shared/types/mydate";
import type { AnalysisSet } from "@wwwuabot/ui/analysis/api";
import { AnalysisPeoplePage } from "./AnalysisPeoplePage";

vi.mock("@wwwuabot/ui/nav", () => ({ useScreenChrome: () => {} }));
vi.mock("@wwwuabot/ui/analysis/api", () => ({
  fetchMyDates: vi.fn(),
  fetchAnalysisSets: vi.fn(),
  saveMyDate: vi.fn(),
  deleteMyDate: vi.fn(),
  saveAnalysisSet: vi.fn(),
  deleteAnalysisSet: vi.fn(),
}));

const api = await import("@wwwuabot/ui/analysis/api");

function person(id: string, name: string, date: string, type = "person"): MyDate {
  return {
    id,
    user_id: 1,
    date,
    type,
    name,
    tags: [],
    notes: "",
    created_at: "2026-01-01 00:00:00",
    updated_at: "2026-01-01 00:00:00",
  };
}

const DATES = [
  person("1", "Олена", "1980-03-03"),
  person("2", "Іван", "1991-12-31"),
  person("3", "Запуск", "2026-05-01", "event"),
];

const SET: AnalysisSet = {
  id: "g1",
  name: "Команда",
  items: [
    { date: "1980-03-03", name: "Олена" },
    { date: "1991-12-31", name: "Іван" },
  ],
  created_at: "2026-01-01 00:00:00",
  updated_at: "2026-01-01 00:00:00",
};

function renderPage(): void {
  render(
    <MemoryRouter initialEntries={["/analysis/people"]}>
      <Routes>
        <Route path="/analysis/people" element={<AnalysisPeoplePage />} />
      </Routes>
    </MemoryRouter>,
  );
}

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("люди і події", () => {
  it("порожній стан називає всі три акордеони", async () => {
    vi.mocked(api.fetchMyDates).mockResolvedValue([]);
    vi.mocked(api.fetchAnalysisSets).mockResolvedValue([]);
    renderPage();

    await waitFor(() => expect(screen.getByText("Груп ще немає.")).toBeTruthy());
    expect(screen.getByText("Людей ще немає.")).toBeTruthy();
    expect(screen.getByText("Подій ще немає.")).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Люди і події" })).toBeTruthy();
  });

  it("показує групи, людей і події та веде обраних у співставлення", async () => {
    vi.mocked(api.fetchMyDates).mockResolvedValue(DATES);
    vi.mocked(api.fetchAnalysisSets).mockResolvedValue([SET]);
    renderPage();

    await waitFor(() => expect(screen.getByText("Команда")).toBeTruthy());
    expect(screen.getByText("Запуск")).toBeTruthy();

    await userEvent.click(screen.getByLabelText("Обрати Олена"));
    await userEvent.click(screen.getByLabelText("Обрати Іван"));
    const link = screen.getByRole("link", { name: /Співставити обрані/ });
    expect(decodeURIComponent(link.getAttribute("href") ?? "")).toContain(
      "dates=1980-03-03,1991-12-31",
    );
    expect(decodeURIComponent(link.getAttribute("href") ?? "")).toContain("kinds=person,person");
  });

  it("редагування групи починається з її складу й не губить старих", async () => {
    vi.mocked(api.fetchMyDates).mockResolvedValue(DATES);
    vi.mocked(api.fetchAnalysisSets).mockResolvedValue([SET]);
    vi.mocked(api.saveAnalysisSet).mockResolvedValue();
    renderPage();

    await waitFor(() => expect(screen.getByText("Команда")).toBeTruthy());
    const group = screen.getByText("Команда").closest(".an-person-line") as HTMLElement;
    await userEvent.click(within(group).getByRole("button", { name: /Змінити/ }));

    expect((screen.getByLabelText("Обрати Олена") as HTMLInputElement).checked).toBe(true);
    expect((screen.getByLabelText("Обрати Іван") as HTMLInputElement).checked).toBe(true);

    await userEvent.click(screen.getByLabelText("Обрати Запуск"));
    const groupInput = screen.getByLabelText("Нова назва групи");
    await userEvent.clear(groupInput);
    await userEvent.type(groupInput, "Команда 3");
    await userEvent.click(screen.getByRole("button", { name: "Зберегти групу" }));

    await waitFor(() =>
      expect(api.saveAnalysisSet).toHaveBeenCalledWith({
        id: "g1",
        name: "Команда 3",
        items: [
          { date: "1980-03-03", name: "Олена" },
          { date: "1991-12-31", name: "Іван" },
          { date: "2026-05-01", name: "Запуск" },
        ],
      }),
    );
  });

  it("змінює, видаляє й зберігає назву групи", async () => {
    vi.mocked(api.fetchMyDates).mockResolvedValue(DATES);
    vi.mocked(api.fetchAnalysisSets).mockResolvedValue([SET]);
    vi.mocked(api.saveMyDate).mockResolvedValue();
    vi.mocked(api.deleteMyDate).mockResolvedValue();
    vi.mocked(api.saveAnalysisSet).mockResolvedValue();
    vi.mocked(api.deleteAnalysisSet).mockResolvedValue();
    renderPage();

    await waitFor(() => expect(screen.getByText("Олена")).toBeTruthy());
    const row = screen.getByText("Олена").closest(".an-person-line") as HTMLElement;
    await userEvent.click(within(row).getByRole("button", { name: /Змінити/ }));
    fireEvent.change(within(row).getByLabelText("Дата народження"), {
      target: { value: "1985-05-05" },
    });
    const name = within(row).getByLabelText("Підпис");
    await userEvent.clear(name);
    await userEvent.type(name, "Олена Н.");
    await userEvent.click(within(row).getByRole("button", { name: "Зберегти зміни" }));
    await waitFor(() =>
      expect(api.saveMyDate).toHaveBeenCalledWith({
        id: "1",
        date: "1985-05-05",
        name: "Олена Н.",
        type: "person",
      }),
    );
    await userEvent.click(within(row).getByRole("button", { name: /Видалити/ }));
    await waitFor(() => expect(api.deleteMyDate).toHaveBeenCalledWith("1"));

    const group = screen.getByText("Команда").closest(".an-person-line") as HTMLElement;
    await userEvent.click(within(group).getByRole("button", { name: /Змінити/ }));
    const groupInput = screen.getByLabelText("Нова назва групи");
    await userEvent.clear(groupInput);
    await userEvent.type(groupInput, "Команда 2");
    await userEvent.click(screen.getByRole("button", { name: "Зберегти групу" }));
    await waitFor(() =>
      expect(api.saveAnalysisSet).toHaveBeenCalledWith(
        expect.objectContaining({ id: "g1", name: "Команда 2" }),
      ),
    );
    await userEvent.click(within(group).getByRole("button", { name: /Видалити/ }));
    await waitFor(() => expect(api.deleteAnalysisSet).toHaveBeenCalledWith("g1"));
  });

  it("додає людину й зберігає групу з обраних", async () => {
    vi.mocked(api.fetchMyDates).mockResolvedValue(DATES);
    vi.mocked(api.fetchAnalysisSets).mockResolvedValue([]);
    vi.mocked(api.saveMyDate).mockResolvedValue();
    vi.mocked(api.saveAnalysisSet).mockResolvedValue();
    renderPage();

    await waitFor(() => expect(screen.getByText("Олена")).toBeTruthy());

    await userEvent.click(screen.getByRole("button", { name: "Додати людину" }));
    const dateInput = screen.getAllByLabelText("Дата народження")[0];
    await userEvent.type(dateInput, "2000-01-02");
    await userEvent.type(screen.getAllByPlaceholderText("За бажанням")[0], "Нова");
    await userEvent.click(screen.getByRole("button", { name: "Додати людину" }));
    await waitFor(() =>
      expect(api.saveMyDate).toHaveBeenCalledWith({
        date: "2000-01-02",
        name: "Нова",
        type: "person",
      }),
    );

    await userEvent.click(screen.getByLabelText("Обрати Олена"));
    await userEvent.click(screen.getByLabelText("Обрати Іван"));
    await userEvent.click(screen.getByRole("button", { name: "Нова група" }));
    await userEvent.type(screen.getByLabelText("Назва групи"), "Двійка");
    await userEvent.click(screen.getByRole("button", { name: "Створити групу" }));

    await waitFor(() => expect(api.saveAnalysisSet).toHaveBeenCalled());
    expect(vi.mocked(api.saveAnalysisSet).mock.calls[0][0]).toMatchObject({
      name: "Двійка",
      items: [
        { date: "1980-03-03", name: "Олена" },
        { date: "1991-12-31", name: "Іван" },
      ],
    });
  });
});
