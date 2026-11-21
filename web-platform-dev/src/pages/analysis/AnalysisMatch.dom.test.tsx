// @vitest-environment jsdom
/**
 * Підбір ролі: опора, ризик, нейтральне й чесні прогалини. Стережеться те, що
 * ламається мовчки: ризик не рахується з одного низького рівня, а «немає
 * даних» не стає низьким.
 *
 * @module web-platform-dev/src/pages/analysis/AnalysisMatch.dom.test
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { useDossiers } from "@wwwuabot/ui/analysis/useDossiers";
import type { DossierRead } from "@wwwuabot/ui/analysis/api";
import type { QualityClaim, QualityLevel } from "@wwwuabot/shared/qualities";
import { AnalysisMatch } from "./AnalysisMatch";

vi.mock("@wwwuabot/ui/nav", () => ({ useScreenChrome: () => {} }));
vi.mock("@wwwuabot/ui/analysis/useDossiers", () => ({ useDossiers: vi.fn() }));

function claim(
  qualityId: string,
  level: QualityLevel,
  sourceId = "western",
  layer: QualityClaim["layer"] = "symbolic",
): QualityClaim {
  return {
    qualityId,
    level,
    layer,
    sourceId,
    sourceVersion: "1",
    evidence: `${qualityId}: ${level}`,
    method: layer === "measured" ? "direct" : "mapped",
    temporal: "trait",
    confidence: layer === "measured" ? 0.9 : 0.3,
  };
}

function dossier(date: string, claims: readonly QualityClaim[]): DossierRead {
  return { date, kind: "person", symbol: null, claims: [...claims], systems: [], note: null };
}

const ANNA = dossier("1980-03-03", [
  claim("empathy", 5),
  claim("empathy", 5, "numerology"),
  claim("care", 5),
  claim("honesty", 2),
  claim("listening", 4),
  claim("closeness", 3),
  claim("cooperation", 3),
  claim("stressResilience", 3),
]);
const BOHDAN = dossier("1991-12-31", [
  claim("empathy", 3),
  claim("care", 4),
  claim("honesty", 2),
  claim("listening", 3),
  claim("closeness", 3),
  claim("cooperation", 3),
]);

function renderMatch(search: string): void {
  render(
    <MemoryRouter initialEntries={[`/analysis/match${search}`]}>
      <AnalysisMatch />
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

describe("підбір ролі", () => {
  it("спочатку просить роль і дві дати, першу підставляє", () => {
    renderMatch("?dates=1980-03-03&labels=%D0%86%D0%B2%D0%B0%D0%BD");

    expect(screen.getByRole("heading", { name: "Під кого підбираємо?" })).toBeTruthy();
    expect(
      screen.getAllByRole("button", { name: /Половинка|Друг|Партнер|Працівник/ }),
    ).toHaveLength(4);
    const dates = screen.getAllByLabelText("Дата народження") as HTMLInputElement[];
    expect(dates.map((input) => input.value)).toEqual(["1980-03-03", ""]);
  });

  it("для двох людей показує опору, ризик, нейтральне й прогалину", () => {
    renderMatch(
      "?dates=1980-03-03,1991-12-31&labels=%D0%90%D0%BD%D0%BD%D0%B0%7C%D0%91%D0%BE%D0%B3%D0%B4%D0%B0%D0%BD&role=partner",
    );

    expect(screen.getByRole("heading", { name: "Половинка" })).toBeTruthy();
    expect(screen.getAllByText("Анна").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Богдан").length).toBeGreaterThan(0);

    expect(screen.getByRole("heading", { name: "Опора" })).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Зона ризику" })).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Нейтрально" })).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Немає даних" })).toBeTruthy();

    // Честність низька в обох — це спільна прогалина, а не «ризик одного».
    const risk = screen.getByRole("heading", { name: "Зона ризику" }).closest("section");
    expect(risk?.textContent).toContain("Чесність");

    // Стрес: в Анни рівень є, у Богдана — ні; це не ризик.
    const unknown = screen.getByRole("heading", { name: "Немає даних" }).closest("section");
    expect(unknown?.textContent).toContain("Стійкість до стресу");
    expect(unknown?.textContent).toContain("немає даних");
  });

  it("підписує джерела й кількість систем під рівнем", () => {
    renderMatch(
      "?dates=1980-03-03,1991-12-31&labels=%D0%90%D0%BD%D0%BD%D0%B0%7C%D0%91%D0%BE%D0%B3%D0%B4%D0%B0%D0%BD&role=partner",
    );

    expect(screen.getAllByText(/Західна астрологія, Нумерологія · 2/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/· 1$/).length).toBeGreaterThan(0);
  });

  it("перемикає роль і показує її власні правила", () => {
    renderMatch(
      "?dates=1980-03-03,1991-12-31&labels=%D0%90%D0%BD%D0%BD%D0%B0%7C%D0%91%D0%BE%D0%B3%D0%B4%D0%B0%D0%BD&role=employee",
    );

    expect(screen.getByRole("heading", { name: "Працівник" })).toBeTruthy();
    const active = screen.getByRole("button", { name: "Працівник" });
    expect(active.getAttribute("aria-pressed")).toBe("true");
    expect(screen.getByText(/Barrick & Mount/)).toBeTruthy();
  });

  it("помилку аналізу показує словами", () => {
    vi.mocked(useDossiers).mockReturnValue({
      dossiers: [],
      survey: null,
      loading: false,
      error: "Помилка аналізу",
    });
    renderMatch("?dates=1980-03-03,1991-12-31&role=partner");
    expect(screen.getByText("Помилка аналізу")).toBeTruthy();
  });
});
