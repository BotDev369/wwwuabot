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
});
