// @vitest-environment jsdom
/**
 * Проходження тесту під фічею: після відповідей людина йде в **свій профіль**,
 * а не в той самий список.
 *
 * Ламається мовчки: без дати результат веде в порожній профіль; без
 * `survey=1` виміряні відповіді не потрапляють у картину; невідомий ключ дає
 * білий екран замість виходу до списку.
 *
 * @module web-platform-dev/src/pages/analysis/AnalysisTestScreen.dom.test
 */

import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { fetchMyDates } from "@wwwuabot/ui/analysis/api";
import { useAssessments } from "@/pages/assessments/useAssessments";
import type { AssessmentTest } from "@wwwuabot/shared/assessments";
import type { MyDate } from "@wwwuabot/shared/types/mydate";
import { AnalysisTestScreen } from "./AnalysisTestScreen";

vi.mock("@wwwuabot/ui/nav", () => ({ useScreenChrome: () => {} }));
vi.mock("@wwwuabot/ui/analysis/api", () => ({ fetchMyDates: vi.fn() }));
vi.mock("@/pages/assessments/useAssessments", () => ({ useAssessments: vi.fn() }));
vi.mock("@/pages/assessments/AssessmentRun", () => ({
  AssessmentRun: (props: { resultHref?: string; resultLabel?: string }) => (
    <p>{`${props.resultLabel ?? "—"}|${props.resultHref ?? ""}`}</p>
  ),
}));

const BIGFIVE = {
  key: "bigfive",
  title: "Велика п'ятірка",
  lead: "П'ять шкал",
  icon: "growth",
  items: [{ text: "Питання" }],
  options: [],
} as unknown as AssessmentTest;

function testsState(tests: readonly AssessmentTest[]): ReturnType<typeof useAssessments> {
  return {
    tests,
    results: [],
    peers: {},
    loading: false,
    saving: false,
    error: null,
    submit: vi.fn(),
    clearError: vi.fn(),
  };
}

function renderScreen(key: string): void {
  render(
    <MemoryRouter initialEntries={[`/analysis/tests/${key}`]}>
      <Routes>
        <Route path="/analysis/tests/:key" element={<AnalysisTestScreen />} />
      </Routes>
    </MemoryRouter>,
  );
}

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("проходження тесту", () => {
  it("після результату веде в профіль із датою й виміряними відповідями", async () => {
    vi.mocked(useAssessments).mockReturnValue(testsState([BIGFIVE]));
    vi.mocked(fetchMyDates).mockResolvedValue([
      {
        id: "1",
        user_id: 1,
        date: "1980-03-03",
        type: "person",
        name: "Я",
        tags: [],
        notes: "",
        created_at: "2026-01-01 00:00:00",
        updated_at: "2026-01-01 00:00:00",
      } satisfies MyDate,
    ]);
    renderScreen("bigfive");

    await waitFor(() => expect(screen.getByText(/До мого профілю\|/)).toBeTruthy());
    const text = screen.getByText(/До мого профілю\|/).textContent ?? "";
    expect(text).toContain("/analysis/person/result?dates=1980-03-03");
    expect(text).toContain("survey=1");
  });

  it("без своєї дати веде на крок даних, а не в порожній профіль", async () => {
    vi.mocked(useAssessments).mockReturnValue(testsState([BIGFIVE]));
    vi.mocked(fetchMyDates).mockResolvedValue([]);
    renderScreen("bigfive");

    await waitFor(() =>
      expect(screen.getByText("Додати дату й побачити профіль|/analysis/person")).toBeTruthy(),
    );
  });

  it("невідомий ключ веде до списку тестів", () => {
    vi.mocked(useAssessments).mockReturnValue(testsState([]));
    vi.mocked(fetchMyDates).mockResolvedValue([]);
    renderScreen("nope");

    expect(screen.getByText(/Завантажуємо тест… або його ще немає/)).toBeTruthy();
    expect(screen.getByRole("link", { name: "До списку" }).getAttribute("href")).toBe(
      "/analysis/tests",
    );
  });
});
