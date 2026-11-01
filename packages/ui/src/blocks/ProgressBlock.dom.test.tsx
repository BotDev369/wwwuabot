// @vitest-environment jsdom
/**
 * Прогрес: відсоток приходить із даних, тон — класом.
 * @module packages/ui/src/blocks/ProgressBlock.dom.test
 */

import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import type { BlockComponentProps } from "@wwwuabot/shared/types/page-config";
import { ProgressBlock } from "./ProgressBlock";

function block(props: Record<string, unknown>): BlockComponentProps {
  return {
    block: { id: "b1", type: "progress", order: 0, props },
    zone: "main",
    context: {} as BlockComponentProps["context"],
  };
}

const fill = (container: HTMLElement) =>
  container.querySelector(".wb-block-progress__fill") as HTMLElement;

describe("ProgressBlock", () => {
  it("показує підпис і порахований відсоток", () => {
    render(<ProgressBlock {...block({ label: "Зібрано", value: 25, max: 50 })} />);

    expect(screen.getByText("Зібрано")).toBeTruthy();
    expect(screen.getByText("50%")).toBeTruthy();
  });

  it("ширина заливки — єдине значення, що приходить із даних", () => {
    const { container } = render(<ProgressBlock {...block({ value: 30, max: 100 })} />);

    expect(fill(container).style.width).toBe("30%");
    expect(fill(container).className).toContain("wb-block-progress__fill");
    expect(
      (container.querySelector(".wb-block-progress__track") as HTMLElement).getAttribute("style"),
    ).toBeNull();
  });

  it("виходить за межі — не виходить за межі", () => {
    const over = render(<ProgressBlock {...block({ value: 250, max: 100 })} />);
    expect(fill(over.container).style.width).toBe("100%");
    over.unmount();

    const under = render(<ProgressBlock {...block({ value: -20, max: 100 })} />);
    expect(fill(under.container).style.width).toBe("0%");
  });

  it("тон — клас кирпичика, невідомий тон лишається акцентом", () => {
    const green = render(<ProgressBlock {...block({ value: 10, color: "green" })} />);
    expect(fill(green.container).className).toContain("wb-block-progress__fill--green");
    green.unmount();

    const odd = render(<ProgressBlock {...block({ value: 10, color: "magenta" })} />);
    expect(fill(odd.container).className).not.toContain("magenta");
  });
});
