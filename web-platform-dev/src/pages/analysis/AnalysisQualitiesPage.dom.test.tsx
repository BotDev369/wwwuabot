// @vitest-environment jsdom
/**
 * Довідник якостей: без дати показує опис і кнопку «Визначити», з датою —
 * порахований рівень і докази систем. Тест ловить мовчазну поломку: якість без
 * систем або кнопка, що нікуди не веде.
 *
 * @module web-platform-dev/src/pages/analysis/AnalysisQualitiesPage.dom.test
 */

import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { makeClaim } from "@wwwuabot/shared/qualities";
import { AnalysisQualitiesPage } from "./AnalysisQualitiesPage";

vi.mock("@wwwuabot/ui/nav", () => ({ useScreenChrome: () => {} }));
vi.mock("@wwwuabot/ui/analysis/api", () => ({ fetchMyDates: vi.fn() }));
vi.mock("@wwwuabot/ui/analysis/useDossiers", () => ({ useDossiers: vi.fn() }));

const api = await import("@wwwuabot/ui/analysis/api");
const hooks = await import("@wwwuabot/ui/analysis/useDossiers");

const EMPTY = { dossiers: [], survey: null, loading: false, error: null };

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

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("типові якості", () => {
  it("без дати показує довідник і веде «Визначити» у проходження", async () => {
    vi.mocked(api.fetchMyDates).mockResolvedValue([]);
    vi.mocked(hooks.useDossiers).mockReturnValue(EMPTY);
    renderPage();

    expect(screen.getByRole("heading", { name: "Типові якості людей і подій" })).toBeTruthy();
    expect(screen.getByText("Воля")).toBeTruthy();
    expect(screen.getByText("Цілеспрямованість")).toBeTruthy();
    expect(screen.getAllByText("Не визначено").length).toBeGreaterThan(0);

    const link = screen.getAllByRole("link", { name: /Визначити/ })[0];
    expect(link.getAttribute("href")).toContain("/analysis/person");
    expect(link.getAttribute("href")).toContain("quality=");
  });

  it("з датою показує рівень і перехід у профіль", async () => {
    vi.mocked(api.fetchMyDates).mockResolvedValue([]);
    vi.mocked(hooks.useDossiers).mockReturnValue({
      dossiers: [
        {
          date: "1980-03-03",
          kind: "person",
          symbol: "Овен",
          claims: [
            makeClaim({
              qualityId: "initiative",
              level: 4,
              layer: "symbolic",
              sourceId: "western",
              sourceVersion: "2",
              evidence: "Сонце в Овні: починає без дозволу",
            }),
          ],
          systems: [],
          note: null,
        },
      ],
      survey: null,
      loading: false,
      error: null,
    });
    renderPage("/analysis/qualities?date=1980-03-03&kind=person&label=Олена");

    await waitFor(() => expect(screen.getByText("Високий")).toBeTruthy());
    const link = screen.getByRole("link", { name: /Перевірити профіль/ });
    expect(decodeURIComponent(link.getAttribute("href") ?? "")).toContain("dates=1980-03-03");
  });
});
