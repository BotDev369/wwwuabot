// @vitest-environment jsdom
/**
 * Профіль: огляд, провідні якості й 36 якостей по доменах; розрахунок і
 * джерело — під розкриттям.
 *
 * Ламається мовчки: без розрахунку рівень стає недоказовим; без «Різні
 * відповіді» дві системи зводяться в одне число; без дати екран мусить
 * сказати про це, а не показати порожні домени.
 *
 * @module web-platform-dev/src/pages/analysis/AnalysisProfile.dom.test
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { useDossiers } from "@wwwuabot/ui/analysis/useDossiers";
import type { DossierRead } from "@wwwuabot/ui/analysis/api";
import type { QualityClaim } from "@wwwuabot/shared/qualities";
import { AnalysisProfile } from "./AnalysisProfile";

vi.mock("@wwwuabot/ui/nav", () => ({ useScreenChrome: () => {} }));
vi.mock("@wwwuabot/ui/analysis/useDossiers", () => ({ useDossiers: vi.fn() }));

const INITIATIVE: QualityClaim = {
  qualityId: "initiative",
  level: 4,
  layer: "symbolic",
  sourceId: "western",
  sourceVersion: "1",
  evidence: "Сонце в Овні: початок без дозволу",
  method: "mapped",
  temporal: "trait",
  confidence: 0.16,
  details: ["Дата: 1980-03-03", "Сонце в Овні, 13°02′ — знак Овен"],
};

const EMPATHY_WEST: QualityClaim = {
  ...INITIATIVE,
  qualityId: "empathy",
  level: 4,
  evidence: "Сонце у Рибах: чує і те, що не сказано",
};

const EMPATHY_NUMBER: QualityClaim = {
  ...EMPATHY_WEST,
  level: 3,
  sourceId: "numerology",
  evidence: "Число життєвого шляху 6: помічає зміну настрою",
};

const DOSSIER: DossierRead = {
  date: "1980-03-03",
  kind: "person",
  symbol: "Овен",
  claims: [INITIATIVE, EMPATHY_WEST, EMPATHY_NUMBER],
  systems: [],
  note: null,
};

const state = {
  dossiers: [DOSSIER] as DossierRead[],
  survey: null,
  loading: false,
  error: null as string | null,
};

function renderProfile(search = "?dates=1980-03-03&labels=Іван&lenses=western,numerology"): void {
  window.history.replaceState({}, "", `/analysis/person/result${search}`);
  render(
    <MemoryRouter>
      <AnalysisProfile mode="person" />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  vi.mocked(useDossiers).mockReturnValue(state);
});
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("профіль", () => {
  it("називає людину, дату й скільки якостей відомо", () => {
    renderProfile();

    expect(screen.getByRole("heading", { name: "Іван" })).toBeTruthy();
    expect(screen.getByText("3.03.1980 · 2 із 36 якостей")).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Провідні якості" })).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Якості за доменами" })).toBeTruthy();
  });

  it("рівень, джерело й розрахунок видно під якістю", () => {
    renderProfile();

    expect(screen.getByText("Сонце в Овні: початок без дозволу")).toBeTruthy();
    expect(screen.getAllByText(/Західна астрологія/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Високий/).length).toBeGreaterThan(0);
    expect(screen.getAllByText("Сонце в Овні, 13°02′ — знак Овен").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Розрахунок").length).toBeGreaterThan(0);
  });

  it("дві системи з різними рівнями не зводяться в одне число", () => {
    renderProfile();

    expect(screen.getAllByText("Різні відповіді").length).toBeGreaterThan(0);
    expect(screen.getByText(/Число життєвого шляху 6/)).toBeTruthy();
  });

  it("без дати каже про це й не просить запит", () => {
    renderProfile("");
    expect(screen.getByText("Немає дати для аналізу.")).toBeTruthy();
  });

  it("помилку запиту показує словами, а не порожніми доменами", () => {
    vi.mocked(useDossiers).mockReturnValue({
      dossiers: [],
      survey: null,
      loading: false,
      error: "Помилка аналізу",
    });
    renderProfile();
    expect(screen.getByText("Помилка аналізу")).toBeTruthy();
    expect(screen.queryByText("Якості за доменами")).toBeNull();
  });
});
