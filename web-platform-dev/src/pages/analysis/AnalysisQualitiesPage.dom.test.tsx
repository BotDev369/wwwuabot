// @vitest-environment jsdom
/**
 * Довідник якостей: акордеон із описом, плюсом/мінусом і системами; «Визначити»
 * рахує лише обрану якість, а результат переживає reload. Тест ловить мовчазну
 * поломку: кнопку, що рахує весь портрет, і значення, яке зникає після reload.
 *
 * @module web-platform-dev/src/pages/analysis/AnalysisQualitiesPage.dom.test
 */

import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { makeClaim } from "@wwwuabot/shared/qualities";
import { AnalysisQualitiesPage } from "./AnalysisQualitiesPage";

vi.mock("@wwwuabot/ui/nav", () => ({ useScreenChrome: () => {} }));
vi.mock("@wwwuabot/ui/analysis/api", () => ({
  fetchMyDates: vi.fn(),
  fetchDossiers: vi.fn(),
}));

const api = await import("@wwwuabot/ui/analysis/api");

function renderPage(path = "/analysis/qualities"): void {
  window.history.replaceState({}, "", path);
  render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/analysis/qualities" element={<AnalysisQualitiesPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

const PATH = "/analysis/qualities?date=1980-03-03&kind=person&label=Олена";

afterEach(() => {
  cleanup();
  window.localStorage.clear();
  vi.clearAllMocks();
});

describe("типові якості", () => {
  it("без дати показує акордеони й кнопку, яка просить вибрати профіль", async () => {
    vi.mocked(api.fetchMyDates).mockResolvedValue([]);
    renderPage();

    expect(screen.getByRole("heading", { name: "Типові якості людей і подій" })).toBeTruthy();
    expect(screen.getByText("Воля")).toBeTruthy();
    expect(screen.getByText("Цілеспрямованість")).toBeTruthy();
    expect(screen.getAllByText("Не визначено").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Що це:").length).toBeGreaterThan(0);

    fireEvent.click(screen.getAllByText("Визначити")[0]);
    expect(screen.getByRole("status").textContent).toContain("Спершу виберіть людину");
    expect(api.fetchDossiers).not.toHaveBeenCalled();
  });

  it("рахує лише обрану якість, показує рівень і зберігає його після reload", async () => {
    vi.mocked(api.fetchMyDates).mockResolvedValue([]);
    vi.mocked(api.fetchDossiers).mockResolvedValue({
      dossiers: [
        {
          date: "1980-03-03",
          kind: "person",
          symbol: "Овен",
          claims: [
            makeClaim({
              qualityId: "control",
              level: 4,
              layer: "symbolic",
              sourceId: "western",
              sourceVersion: "2",
              evidence: "Сонце в Овні: тримає кермо",
            }),
          ],
          systems: [],
          note: null,
        },
      ],
      survey: null,
    });
    renderPage(PATH);

    const quality = document.querySelector<HTMLElement>('[data-quality-id="control"]');
    expect(quality).not.toBeNull();
    fireEvent.click(within(quality as HTMLElement).getByText("Визначити"));

    await waitFor(() =>
      expect(api.fetchDossiers).toHaveBeenCalledWith(
        ["1980-03-03"],
        "person",
        ["western"],
        false,
        "control",
      ),
    );
    await waitFor(() => expect(within(quality as HTMLElement).getByText("Високий")).toBeTruthy());
    expect(window.localStorage.getItem("analysis-quality:v1:person:1980-03-03:Олена")).toContain(
      "control",
    );

    cleanup();
    renderPage(PATH);
    await waitFor(() =>
      expect(
        within(
          document.querySelector<HTMLElement>('[data-quality-id="control"]') as HTMLElement,
        ).getByText("Високий"),
      ).toBeTruthy(),
    );
  });
});
