// @vitest-environment jsdom
/**
 * Розділ «Дослідження»: зміст книжки з розділів і рядків блоків.
 *
 * @module web-platform-dev/src/pages/research/ResearchPage
 */

import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

vi.mock("./useResearchCatalog", () => ({
  useResearchCatalog: () => ({
    loading: false,
    catalog: {
      title: "Дослідження: тест",
      slug: "viruvannia",
      updatedAt: "2026-11-01",
      blocks: [
        {
          id: "a1",
          slug: "viruvannia-a1",
          group: "A",
          groupTitle: "Масштаб",
          title: "Сто відсотків",
          oneLiner: "Сім категорій, які дають 100%.",
          dataDate: "2020",
          publishedDate: "2025-06-09",
          dataStatus: "verified",
          readingTime: 7,
          keyFigures: [{ label: "Християни", value: "28,8%" }],
        },
        {
          id: "b1",
          slug: "viruvannia-b1",
          group: "B",
          groupTitle: "Релігії",
          title: "Християнство",
          oneLiner: "Найбільша релігія світу.",
          dataDate: "2020",
          publishedDate: "2025-06-09",
          dataStatus: "estimate",
          readingTime: 5,
          keyFigures: [],
        },
      ],
    },
  }),
}));

import { ResearchPage } from "./ResearchPage";

describe("ResearchPage", () => {
  it("показує назву дослідження й масштаб", () => {
    render(
      <MemoryRouter>
        <ResearchPage />
      </MemoryRouter>,
    );

    expect(screen.getByRole("heading", { level: 1, name: "Дослідження: тест" })).toBeTruthy();
    expect(screen.getByText("блоків")).toBeTruthy();
    expect(screen.getByText("розділів")).toBeTruthy();
    expect(screen.getByText("12")).toBeTruthy();
  });

  it("групує блоки в розділи й показує ключові цифри", () => {
    render(
      <MemoryRouter>
        <ResearchPage />
      </MemoryRouter>,
    );

    expect(screen.getByRole("heading", { level: 2, name: "Масштаб" })).toBeTruthy();
    expect(screen.getByRole("heading", { level: 2, name: "Релігії" })).toBeTruthy();
    expect(screen.getByText("Сто відсотків")).toBeTruthy();
    expect(screen.getByText("28,8%")).toBeTruthy();
    expect(screen.getByText("Перевірено за джерелом", { exact: false })).toBeTruthy();
  });

  it("веде до методології", () => {
    render(
      <MemoryRouter>
        <ResearchPage />
      </MemoryRouter>,
    );

    expect(screen.getByRole("button", { name: "Методологія й джерела" })).toBeTruthy();
  });
});
