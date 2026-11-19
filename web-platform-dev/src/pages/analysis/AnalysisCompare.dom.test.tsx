// @vitest-environment jsdom
/**
 * Співставлення: спільне, різні опори й чесні прогалини. Стережеться те, що
 * ламається мовчки: непокрита якість не стає розбіжністю, рівні стоять під
 * іменем своєї людини, а внесок систем видно без розкриття.
 *
 * @module web-platform-dev/src/pages/analysis/AnalysisCompare.dom.test
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { useDossiers } from "@wwwuabot/ui/analysis/useDossiers";
import type { DossierRead } from "@wwwuabot/ui/analysis/api";
import type { QualityClaim, QualityLevel } from "@wwwuabot/shared/qualities";
import { AnalysisCompare } from "./AnalysisCompare";

vi.mock("@wwwuabot/ui/nav", () => ({ useScreenChrome: () => {} }));
vi.mock("@wwwuabot/ui/analysis/useDossiers", () => ({ useDossiers: vi.fn() }));

function claim(qualityId: string, level: QualityLevel, sourceId = "western"): QualityClaim {
  return {
    qualityId,
    level,
    layer: "symbolic",
    sourceId,
    sourceVersion: "1",
    evidence: `${qualityId}: ${level}`,
    method: "mapped",
    temporal: "trait",
    confidence: 0.8,
  };
}

function dossier(date: string, claims: readonly QualityClaim[]): DossierRead {
  return { date, kind: "person", symbol: null, claims: [...claims], systems: [], note: null };
}

const ANNA = dossier("1980-03-03", [
  claim("initiative", 5),
  claim("empathy", 5),
  claim("discipline", 3, "numerology"),
]);
const BOHDAN = dossier("1991-12-31", [claim("initiative", 5), claim("empathy", 3)]);

function renderCompare(search: string): void {
  window.history.replaceState({}, "", `/analysis/compare/result${search}`);
  render(
    <MemoryRouter>
      <AnalysisCompare />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  vi.mocked(useDossiers).mockReturnValue({
    dossiers: [ANNA, BOHDAN],
    survey: null,
    loading: false,
    error: null,
  });
});
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("співставлення", () => {
  it("називає людей, їхню покритість і внесок систем", () => {
    renderCompare("?dates=1980-03-03,1991-12-31&labels=Анна|Богдан");

    expect(screen.getByRole("heading", { name: "Що вас об'єднує" })).toBeTruthy();
    expect(screen.getAllByText("Анна").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Богдан").length).toBeGreaterThan(0);
    expect(screen.getByText("3 із 36 якостей")).toBeTruthy();
    expect(screen.getByText("2 із 36 якостей")).toBeTruthy();
    expect(screen.getAllByText(/Західна астрологія · 2/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Нумерологія · 1/).length).toBeGreaterThan(0);
  });

  it("спільну якість, різні опори й доповнення показує різними блоками", () => {
    renderCompare("?dates=1980-03-03,1991-12-31&labels=Анна|Богдан");

    expect(screen.getAllByText("Ініціатива").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Емпатія").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Дисципліна").length).toBeGreaterThan(0);
    // Якість, якої немає в Богдана, не стає «розбіжністю»: у його клітинці
    // чесно стоїть «немає даних».
    expect(screen.getAllByText("немає даних").length).toBeGreaterThan(0);
  });

  it("показує домени з найвищим збігом і рахує покритість", () => {
    renderCompare("?dates=1980-03-03,1991-12-31&labels=Анна|Богдан");

    expect(screen.getByRole("heading", { name: "Домени з найвищим збігом" })).toBeTruthy();
    expect(screen.getByText("1 з 1")).toBeTruthy();
    expect(screen.getByText(/2 якості порівнюються в усіх/)).toBeTruthy();
  });

  it("без двох дат не вдає співставлення", () => {
    renderCompare("?dates=1980-03-03&labels=Анна");
    expect(screen.getByRole("heading", { name: "Кого співставляємо?" })).toBeTruthy();
    expect(screen.getByText(/Додайте ще одну дату/)).toBeTruthy();
  });

  it("помилку запиту показує словами", () => {
    vi.mocked(useDossiers).mockReturnValue({
      dossiers: [],
      survey: null,
      loading: false,
      error: "Помилка аналізу",
    });
    renderCompare("?dates=1980-03-03,1991-12-31&labels=Анна|Богдан");
    expect(screen.getByText("Помилка аналізу")).toBeTruthy();
  });
});
