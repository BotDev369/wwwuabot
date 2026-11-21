// @vitest-environment jsdom
/**
 * Сторінка варіантів: **три розкладки й три посилання**, інакше «варіанти» є
 * лише словами. Перевіряємо, що кожен блок справді несе свій `data-variant` —
 * саме він перемикає стилі.
 *
 * @module web-platform-dev/src/pages/analysis/AnalysisVariantsPage.dom.test
 */

import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { AnalysisVariantsPage } from "./AnalysisVariantsPage";

vi.mock("@wwwuabot/ui/nav", () => ({ useScreenChrome: () => {} }));

function renderPage(): void {
  render(
    <MemoryRouter initialEntries={["/analysis/variants"]}>
      <Routes>
        <Route path="/analysis/variants" element={<AnalysisVariantsPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

afterEach(cleanup);

describe("сторінка варіантів головної", () => {
  it("показує три варіанти з підписами й посиланнями", () => {
    renderPage();

    for (const n of [1, 2, 3]) {
      expect(screen.getByRole("heading", { name: `Варіант ${n}` })).toBeTruthy();
      expect(screen.getByRole("link", { name: `Відкрити варіант ${n}` }).getAttribute("href")).toBe(
        `/analysis/variant/${n}`,
      );
    }
  });

  it("кожен блок несе свою розкладку, а не копію першої", () => {
    renderPage();

    const frames = [...document.querySelectorAll("[data-variant]")].map((node) =>
      node.getAttribute("data-variant"),
    );
    expect(frames).toEqual(["1", "2", "3"]);
    // По шість розділів у кожному варіанті — вміст той самий.
    expect(document.querySelectorAll("a.an-entry")).toHaveLength(18);
  });
});
