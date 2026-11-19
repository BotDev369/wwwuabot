// @vitest-environment jsdom
/**
 * Головна фічі: три входи, збережені люди й метод трьома кроками.
 *
 * Ламається мовчки: без входу людина не починає аналіз; без збережених людей
 * головна не веде в готовий профіль; без кроків незрозуміло, що буде далі.
 *
 * @module web-platform-dev/src/pages/analysis/AnalysisHub.dom.test
 */

import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { fetchMyDates } from "@wwwuabot/ui/analysis/api";
import type { MyDate } from "@wwwuabot/shared/types/mydate";
import { AnalysisHub } from "./AnalysisHub";

vi.mock("@wwwuabot/ui/nav", () => ({ useScreenChrome: () => {} }));
vi.mock("@wwwuabot/ui/analysis/api", () => ({ fetchMyDates: vi.fn() }));

function person(id: string, name: string, date: string): MyDate {
  return {
    id,
    user_id: 1,
    date,
    type: "person",
    name,
    tags: [],
    notes: "",
    created_at: "2026-01-01 00:00:00",
    updated_at: "2026-01-01 00:00:00",
  };
}

const saved = [person("1", "Олена", "1980-03-03"), person("2", "", "1991-12-31")];

function Probe(): React.ReactElement {
  const location = useLocation();
  return <p>{`${location.pathname}${location.search}`}</p>;
}

function renderHub(): void {
  render(
    <MemoryRouter initialEntries={["/analysis"]}>
      <Routes>
        <Route path="/analysis" element={<AnalysisHub />} />
        <Route path="/analysis/person" element={<p>крок даних</p>} />
        <Route path="/analysis/compare/result" element={<Probe />} />
      </Routes>
    </MemoryRouter>,
  );
}

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("головна аналізу", () => {
  it("показує три входи й веде в потік людини", async () => {
    vi.mocked(fetchMyDates).mockResolvedValue([]);
    renderHub();

    expect(screen.getByRole("heading", { name: "Хто перед вами?" })).toBeTruthy();
    for (const title of ["Людина", "Подія", "Співставлення"]) {
      expect(screen.getByText(title)).toBeTruthy();
    }
    expect(screen.queryByText("Мої люди")).toBeNull();

    await userEvent.click(screen.getByRole("button", { name: /Людина/ }));
    expect(screen.getByText("крок даних")).toBeTruthy();
  });

  it("збережені люди ведуть одразу в профіль, безіменна підписана датою", async () => {
    vi.mocked(fetchMyDates).mockResolvedValue(saved);
    renderHub();

    await waitFor(() => expect(screen.getByText("Мої люди")).toBeTruthy());
    const olena = screen.getByRole("link", { name: /Олена/ });
    expect(olena.getAttribute("href")).toContain("/analysis/person/result?dates=1980-03-03");
    expect(olena.getAttribute("href")).toContain("labels=%D0%9E%D0%BB%D0%B5%D0%BD%D0%B0");
    expect(screen.getByText("Без імені")).toBeTruthy();
    expect(screen.getByText("31.12.1991")).toBeTruthy();
  });

  it("двоє з «Моїх людей» відкривають співставлення", async () => {
    vi.mocked(fetchMyDates).mockResolvedValue(saved);
    renderHub();

    await waitFor(() => expect(screen.getByText("Мої люди")).toBeTruthy());
    await userEvent.click(screen.getByRole("button", { name: "Співставити" }));

    const boxes = screen.getAllByRole("checkbox");
    expect(boxes).toHaveLength(2);
    await userEvent.click(boxes[0]);
    const action = screen.getByRole("button", { name: "Співставити обраних (1)" });
    expect((action as HTMLButtonElement).disabled).toBe(true);

    await userEvent.click(boxes[1]);
    await userEvent.click(screen.getByRole("button", { name: "Співставити обраних (2)" }));

    const probe = screen.getByText(/^\/analysis\/compare\/result\?/);
    const url = decodeURIComponent(probe.textContent ?? "");
    expect(url).toContain("dates=1980-03-03,1991-12-31");
    expect(url).toContain("labels=Олена|");
    expect(url).toContain("lenses=");
  });

  it("без списку збережених головна лишається робочою", async () => {
    vi.mocked(fetchMyDates).mockRejectedValue(new Error("мережа"));
    renderHub();

    expect(screen.getByText("Одна дата — більше нічого не потрібно.")).toBeTruthy();
    expect(screen.getByText("36 якостей із рівнем і розрахунком кожної.")).toBeTruthy();
    expect(screen.getByRole("link", { name: /Системи аналізу/ })).toBeTruthy();
    expect(screen.getByRole("link", { name: /^Тести$/ })).toBeTruthy();
    await waitFor(() => expect(fetchMyDates).toHaveBeenCalled());
  });
});
