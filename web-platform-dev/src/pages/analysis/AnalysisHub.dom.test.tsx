// @vitest-environment jsdom
/**
 * Головна фічі: назва, гасло й усі розділи з адресами. Ламається мовчки, якщо
 * на першому вході з'являються дані або розділ не має адреси.
 *
 * @module web-platform-dev/src/pages/analysis/AnalysisHub.dom.test
 */

import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { AnalysisHub } from "./AnalysisHub";

vi.mock("@wwwuabot/ui/nav", () => ({ useScreenChrome: () => {} }));

function renderHub(): void {
  render(
    <MemoryRouter initialEntries={["/analysis"]}>
      <Routes>
        <Route path="/analysis" element={<AnalysisHub />} />
        <Route path="/analysis/people" element={<p>люди</p>} />
      </Routes>
    </MemoryRouter>,
  );
}

afterEach(cleanup);

const SECTIONS: readonly [string, string][] = [
  ["Про системи аналізу", "/analysis/systems"],
  ["Типові якості людей і подій", "/analysis/qualities"],
  ["Аналізувати за датою", "/analysis/person"],
  ["Пройти тестування", "/analysis/tests"],
  ["Співставити", "/analysis/compare"],
  ["Люди і події", "/analysis/people"],
];

describe("головна аналізу", () => {
  it("називає платформу й показує шість рівноправних розділів", () => {
    renderHub();

    expect(screen.getByText("ПАЛЯНИЦЯ")).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Пізнай себе, оточуючих та події." })).toBeTruthy();
  });

  it("показує всі розділи фічі й веде кожен на свою адресу", () => {
    renderHub();

    for (const [title, href] of SECTIONS) {
      const link = screen.getByRole("link", { name: new RegExp(title) });
      expect(link.getAttribute("href")).toBe(href);
      expect(link.textContent?.length).toBeGreaterThan(title.length);
    }
  });

  it("на першому вході не показує ні даних, ні закликів щось вводити", () => {
    renderHub();

    expect(screen.queryByRole("checkbox")).toBeNull();
    expect(screen.queryByText(/Олена|Без імені|Без підпису/)).toBeNull();
    expect(screen.queryByText(/Додати/)).toBeNull();
    expect(screen.queryByText(/^Мої люди$/)).toBeNull();
  });
});
