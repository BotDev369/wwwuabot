// @vitest-environment jsdom
/**
 * Графік вимірів: лінія по самих записах, а не стовпчики суми.
 *
 * Два зважування за день — два виміри, тож точки йдуть по часі, а не по днях.
 * Перевіряємо три межі: порожнє вікно, ціль (є й немає) і один запис.
 *
 * @module web-platform-dev/src/pages/trackers/TrackerTrend.dom.test
 */

import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import type { TrackerEntry } from "@wwwuabot/shared/trackers";
import { TrackerTrend } from "./TrackerTrend";

const entry = (id: number, day: string, value: number): TrackerEntry => ({
  id,
  day,
  value,
  note: "",
  loggedAt: `${day} 08:00:00`,
});

const three = [entry(1, "2026-10-05", 1.5), entry(2, "2026-10-08", 1), entry(3, "2026-10-12", 2)];

function renderTrend(records: readonly TrackerEntry[], goal: number | null) {
  return render(<TrackerTrend records={records} goal={goal} unit="л" title="Вода" />);
}

describe("графік вимірів", () => {
  it("порожнє вікно — підпис, а не графік без точок", () => {
    const { container } = renderTrend([], 2);
    expect(screen.getByText("Немає записів за цей період")).toBeTruthy();
    expect(screen.queryByRole("img")).toBeNull();
    expect(container.querySelector(".wb-tracker-trend-line")).toBeNull();
  });

  it("лінія йде по часі, остання точка підсвічена, ціль має мітку", () => {
    const { container } = renderTrend(three, 2);

    const plot = screen.getByRole("img");
    const label = plot.getAttribute("aria-label") ?? "";
    expect(label).toContain("3 записів");
    expect(label).toContain("Останній — 2 л 12.10");
    expect(label).toContain("ціль 2 л");

    const points = container.querySelector(".wb-tracker-trend-line polyline");
    const xs = (points?.getAttribute("points") ?? "").split(" ").map((pair) => pair.split(",")[0]);
    expect(xs).toEqual(["0.00", "50.00", "100.00"]);

    const dots = container.querySelectorAll(".wb-tracker-dot");
    expect(dots).toHaveLength(3);
    expect(dots[2].className).toContain("wb-tracker-dot--last");
    expect(screen.getByTitle("12.10 — 2 л")).toBeTruthy();

    expect(container.querySelector(".wb-tracker-goal-line")).toBeTruthy();
    expect(screen.getByText("ціль 2 л")).toBeTruthy();
    expect(screen.getByText("05.10")).toBeTruthy();
    expect(screen.getByText("12.10")).toBeTruthy();
  });

  it("без цілі — ні лінії цілі, ні слова «ціль» у підписі", () => {
    const { container } = renderTrend(three, null);
    expect(container.querySelector(".wb-tracker-goal-line")).toBeNull();
    expect(screen.queryByText(/ціль/)).toBeNull();
    expect(screen.getByRole("img").getAttribute("aria-label")).not.toContain("ціль");
  });

  it("один запис — точка на правому краї, а не лінія з однієї точки", () => {
    const { container } = renderTrend([three[2]], null);
    const dots = container.querySelectorAll<HTMLElement>(".wb-tracker-dot");
    expect(dots).toHaveLength(1);
    expect(dots[0].style.left).toBe("100%");
    expect(dots[0].style.bottom).toBe("50%");
    expect(container.querySelector(".wb-tracker-goal-line")).toBeNull();
  });
});
