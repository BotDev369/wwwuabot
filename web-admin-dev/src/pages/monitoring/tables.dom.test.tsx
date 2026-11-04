// @vitest-environment jsdom
/**
 * Таблиці моніторингу — та сама `DataTable`, що й усюди.
 *
 * Тест тримає дві речі: числа йдуть у спільну таблицю (а не у власну розмітку)
 * і порожній зріз каже причину, а не показує порожні клітинки.
 *
 * @module web-admin-dev/src/pages/monitoring/tables.dom.test
 */

import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import type { MetricValue, SnapshotPoint } from "@wwwuabot/shared/monitoring";
import { MetricDynamics } from "./MetricDynamics";
import { SnapshotHistory } from "./SnapshotHistory";
import { WorkspaceTable } from "./WorkspaceTable";

const POINT: SnapshotPoint = {
  id: 7,
  collectedAt: "2026-09-25T08:14:00.000Z",
  status: "ok",
  trigger: "cron",
  ref: "a9c7d3e012345",
  totals: {
    "total|code.size_bytes": 2_400_000,
    "total|code.lines": 41_000,
    "total|code.files": 310,
  },
};

const PARTIAL: SnapshotPoint = {
  id: 6,
  collectedAt: "2026-09-24T08:14:00.000Z",
  status: "partial",
  trigger: "manual",
  ref: null,
  totals: { "total|code.size_bytes": 2_300_000 },
};

/** Спільна таблиця: рамка зі скролом і сама таблиця з одним класом. */
function expectSharedTable(container: HTMLElement): void {
  expect(container.querySelector(".wb-table-scroll")).toBeTruthy();
  expect(container.querySelector("table")?.className).toContain("wb-table");
  expect(container.querySelector("thead th")).toBeTruthy();
}

describe("SnapshotHistory", () => {
  it("малює спільну таблицю зі зрізами", () => {
    const { container } = render(<SnapshotHistory history={[POINT, PARTIAL]} />);

    expectSharedTable(container);
    expect(screen.getByText("Коли")).toBeTruthy();
    expect(screen.getByText("Коміт")).toBeTruthy();
    // Частковий зріз видно позначкою, а не числом.
    expect(screen.getByText("частковий")).toBeTruthy();
    expect(container.querySelectorAll("tbody tr")).toHaveLength(2);
  });

  it("порожня історія каже це словами", () => {
    render(<SnapshotHistory history={[]} />);
    expect(screen.getByText("Зрізів ще немає.")).toBeTruthy();
  });
});

describe("WorkspaceTable", () => {
  const values: readonly MetricValue[] = [
    { group: "total", metric: "code.size_bytes", value: 1000 },
    { group: "api-dev", metric: "code.size_bytes", value: 600 },
    { group: "packages", metric: "code.size_bytes", value: 400 },
  ];

  it("показує воркспейси у спільній таблиці", () => {
    const { container } = render(<WorkspaceTable values={values} />);

    expectSharedTable(container);
    expect(screen.getByText("Воркспейс")).toBeTruthy();
    expect(screen.getByText("api-dev")).toBeTruthy();
    expect(screen.getByText("packages")).toBeTruthy();
    // «total» — не воркспейс, а зведення: рядка в розбивці немає.
    expect(screen.queryByText("total")).toBeNull();
  });

  it("порожня розбивка не малює порожньої таблиці", () => {
    render(<WorkspaceTable values={[]} />);
    expect(screen.getByText("У цьому зрізі немає розбивки по воркспейсах.")).toBeTruthy();
  });
});

describe("MetricDynamics", () => {
  it("ставить колонку на кожен зріз і колонку зміни", () => {
    const { container } = render(
      <MetricDynamics history={[POINT, PARTIAL]} open onToggle={() => {}} />,
    );

    expectSharedTable(container);
    expect(screen.getByText("Показник")).toBeTruthy();
    expect(screen.getByText("Δ за період")).toBeTruthy();
    expect(container.querySelectorAll("thead th")).toHaveLength(4);
  });

  it("без зрізів каже, коли таблиця заповниться", () => {
    render(<MetricDynamics history={[]} open onToggle={() => {}} />);
    expect(screen.getByText(/таблиця заповниться після першого збору/)).toBeTruthy();
  });
});
