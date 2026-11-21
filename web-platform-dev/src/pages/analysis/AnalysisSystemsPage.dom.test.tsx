// @vitest-environment jsdom
/**
 * Довідка «Системи аналізу»: чотири традиції з показниками й живим прикладом.
 *
 * Ламається мовчки: без показників система стає гаслом; без прикладу для дати
 * людина не бачить, що саме з неї взято; без стану помилки порожній список
 * виглядає як «систем немає».
 *
 * @module web-platform-dev/src/pages/analysis/AnalysisSystemsPage.dom.test
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { useDossiers } from "@wwwuabot/ui/analysis/useDossiers";
import type { DossierRead } from "@wwwuabot/ui/analysis/api";
import { AnalysisSystemsPage } from "./AnalysisSystemsPage";

vi.mock("@wwwuabot/ui/nav", () => ({ useScreenChrome: () => {} }));
vi.mock("@wwwuabot/ui/analysis/useDossiers", () => ({ useDossiers: vi.fn() }));

/** Одна система з двома показниками — те, що видно карткою. */
const SYSTEMS: DossierRead = {
  date: "2026-11-19",
  kind: "person",
  symbol: null,
  claims: [],
  note: null,
  systems: [
    {
      id: "western",
      name: "Західна астрологія",
      version: "2",
      about: "Тропічна астрологія читає положення Сонця.",
      gives: ["знак Сонця", "градус Сонця"],
      limits: [],
      source: "Птолемей",
      parameters: [
        { label: "Знак Сонця", value: "Скорпіон" },
        { label: "Градус Сонця", value: "27°14′ Скорпіона" },
      ],
    },
  ],
};

function renderPage(): void {
  render(
    <MemoryRouter>
      <AnalysisSystemsPage />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  vi.mocked(useDossiers).mockReturnValue({
    dossiers: [SYSTEMS],
    survey: null,
    loading: false,
    error: null,
  });
});
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("системи аналізу", () => {
  it("картка каже назву, кількість показників і що система бере з дати", () => {
    renderPage();

    expect(screen.getByRole("heading", { name: "Про системи аналізу" })).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Західна астрологія" })).toBeTruthy();
    expect(screen.getByText("2 показників")).toBeTruthy();
    expect(screen.getByText("Тропічна астрологія читає положення Сонця.")).toBeTruthy();
    expect(screen.getByText("Знак Сонця")).toBeTruthy();
    expect(screen.getByText("Скорпіон")).toBeTruthy();
    expect(screen.getByText(/Що бере з дати:/)).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Велика п'ятірка" })).toBeTruthy();
  });

  it("приклад рахується для обраної дати", () => {
    renderPage();

    fireEvent.change(screen.getByLabelText("Приклад для дати"), {
      target: { value: "1980-03-03" },
    });

    const lastCall = [...vi.mocked(useDossiers).mock.calls].pop();
    expect(lastCall?.[0]).toEqual(["1980-03-03"]);
  });

  it("помилка запиту не лишає порожню сторінку без слів", () => {
    vi.mocked(useDossiers).mockReturnValue({
      dossiers: [],
      survey: null,
      loading: false,
      error: "Помилка аналізу",
    });
    renderPage();

    expect(screen.getByText("Помилка аналізу")).toBeTruthy();
    expect(screen.queryByRole("heading", { name: "Західна астрологія" })).toBeNull();
  });
});
