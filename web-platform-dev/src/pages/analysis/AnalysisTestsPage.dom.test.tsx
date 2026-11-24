// @vitest-environment jsdom
/**
 * Каталог тестів усередині фічі: назва, час, кількість питань і скільки
 * якостей тест додає.
 *
 * Ламається мовчки: без оцінки часу людина не знає, на що підписується; без
 * лічильника якостей тест виглядає як окрема розвага, а не другий вектор ядра.
 *
 * @module web-platform-dev/src/pages/analysis/AnalysisTestsPage.dom.test
 */

import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { useAssessments } from "@/pages/assessments/useAssessments";
import type { AssessmentTest } from "@wwwuabot/shared/assessments";
import { AnalysisTestsPage } from "./AnalysisTestsPage";

vi.mock("@wwwuabot/ui/nav", () => ({ useScreenChrome: () => {} }));
vi.mock("@/pages/assessments/useAssessments", () => ({ useAssessments: vi.fn() }));

function test(key: string, title: string, items: number): AssessmentTest {
  return {
    key,
    title,
    lead: `${title} — коротко`,
    icon: "growth",
    items: Array.from({ length: items }, (_, index) => ({ text: `Питання ${index + 1}` })),
    options: [],
  } as unknown as AssessmentTest;
}

const TESTS = [test("bigfive", "Велика п'ятірка", 6), test("who5", "Самопочуття", 3)];

function renderPage(): void {
  render(
    <MemoryRouter initialEntries={["/analysis/tests"]}>
      <Routes>
        <Route path="/analysis/tests" element={<AnalysisTestsPage />} />
        <Route path="/analysis/tests/who5" element={<p>проходження</p>} />
      </Routes>
    </MemoryRouter>,
  );
}

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("каталог тестів", () => {
  it("каже час, кількість питань і скільки якостей додає", () => {
    vi.mocked(useAssessments).mockReturnValue({
      tests: TESTS,
      results: [],
      peers: {},
      loading: false,
      saving: false,
      error: null,
      submit: vi.fn(),
      clearError: vi.fn(),
    });
    renderPage();

    // Назву й підпис малює каркас — сторінка їх не дублює.
    expect(screen.queryByRole("heading", { name: "Пройти тестування" })).toBeNull();
    expect(screen.getByText("6 питань · 2 хвилини · додає 16 якостей")).toBeTruthy();
    // Тест без відомих якостей не обіцяє цифру, якої не знає.
    expect(screen.getByText("3 питання · 1 хвилина")).toBeTruthy();
  });

  it("картка веде в проходження цього тесту", async () => {
    vi.mocked(useAssessments).mockReturnValue({
      tests: TESTS,
      results: [],
      peers: {},
      loading: false,
      saving: false,
      error: null,
      submit: vi.fn(),
      clearError: vi.fn(),
    });
    renderPage();

    await userEvent.click(screen.getByRole("button", { name: /Самопочуття/ }));
    expect(screen.getByText("проходження")).toBeTruthy();
  });

  it("поки список їде, каже про завантаження", () => {
    vi.mocked(useAssessments).mockReturnValue({
      tests: [],
      results: [],
      peers: {},
      loading: true,
      saving: false,
      error: null,
      submit: vi.fn(),
      clearError: vi.fn(),
    });
    renderPage();

    expect(screen.getByText("Завантажуємо тести…")).toBeTruthy();
  });
});
