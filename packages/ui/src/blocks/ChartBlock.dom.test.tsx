// @vitest-environment jsdom
/**
 * Графік: стовпчики й сектори, де інлайн — це дані.
 * @module packages/ui/src/blocks/ChartBlock.dom.test
 */

import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import type { BlockComponentProps } from "@wwwuabot/shared/types/page-config";
import { ChartBlock } from "./ChartBlock";

function block(props: Record<string, unknown>): BlockComponentProps {
  return {
    block: { id: "b1", type: "chart", order: 0, props },
    zone: "main",
    context: {} as BlockComponentProps["context"],
  };
}

const DATA = [
  { label: "Січень", value: 10 },
  { label: "Лютий", value: 5, color: "#ff0000" },
];

describe("ChartBlock", () => {
  it("без даних нічого не малює", () => {
    const { container } = render(<ChartBlock {...block({ data: [] })} />);
    expect(container.firstChild).toBeNull();
  });

  it("стовпчик бере висоту з даних, а не з розмітки", () => {
    const { container } = render(<ChartBlock {...block({ data: DATA, title: "Динаміка" })} />);
    const bars = container.querySelectorAll(".wb-block-chart__bar") as NodeListOf<HTMLElement>;

    expect(screen.getByText("Динаміка")).toBeTruthy();
    expect(bars).toHaveLength(2);
    expect(bars[0].style.height).toBe("100%");
    expect(bars[1].style.height).toBe("50%");
    expect(bars[1].style.background).toContain("255, 0, 0");
  });

  it("підпис значення можна вимкнути", () => {
    const { container } = render(<ChartBlock {...block({ data: DATA, showLabels: false })} />);

    expect(container.querySelectorAll(".wb-block-chart__pct")).toHaveLength(0);
  });

  it("сектор показує частку кожної позиції", () => {
    const { container } = render(<ChartBlock {...block({ data: DATA, type: "pie" })} />);
    const pie = container.querySelector(".wb-block-chart__pie") as HTMLElement;

    expect(pie.style.background).toContain("conic-gradient");
    expect(screen.getByText("67%")).toBeTruthy();
    expect(screen.getByText("33%")).toBeTruthy();
  });

  it("нахил малює лінію й дві точки на кожен рядок", () => {
    const { container } = render(
      <ChartBlock
        {...block({
          type: "slope",
          fromLabel: "2010",
          toLabel: "2020",
          data: [
            { label: "Християни", from: 30.6, to: 28.8 },
            { label: "Мусульмани", from: 23.8, to: 25.6 },
          ],
        })}
      />,
    );

    expect(container.querySelectorAll(".wb-block-chart__slope-line")).toHaveLength(2);
    expect(container.querySelectorAll(".wb-block-chart__slope circle")).toHaveLength(4);
    expect(screen.getByText("Християни")).toBeTruthy();
    expect(screen.getByText("2010")).toBeTruthy();
  });

  it("теплова карта тримає числа в таблиці, а насиченість — у даних", () => {
    const { container } = render(
      <ChartBlock
        {...block({
          type: "heatmap",
          columns: ["Pew", "WRD"],
          unit: "%",
          rows: [
            { label: "Християни", cells: [28.8, 32.18] },
            { label: "Мусульмани", cells: [25.6, 25.16] },
          ],
        })}
      />,
    );
    const cells = container.querySelectorAll(".wb-block-chart__heat td") as NodeListOf<HTMLElement>;

    expect(cells).toHaveLength(4);
    expect(cells[0].textContent).toBe("28.8%");
    expect(cells[0].style.background).toContain("color-mix");
    expect(container.querySelectorAll(".wb-block-chart__heat tbody tr")).toHaveLength(2);
  });
});
