// @vitest-environment jsdom
/**
 * Картки переваг: сітка, підписи й необов'язкові частини.
 *
 * @module packages/ui/src/blocks/FeatureCardBlock.dom.test
 */

import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import type { BlockComponentProps } from "@wwwuabot/shared/types/page-config";
import { FeatureCardBlock } from "./FeatureCardBlock";

function block(props: Record<string, unknown>): BlockComponentProps {
  return {
    block: { id: "b1", type: "feature-card", order: 0, props },
    zone: "main",
    context: {} as BlockComponentProps["context"],
  };
}

const ITEMS = [{ icon: "✓", title: "Швидко", description: "Без черг" }, { title: "Дешево" }];

describe("FeatureCardBlock", () => {
  it("без карток нічого не малює", () => {
    const { container } = render(<FeatureCardBlock {...block({ items: [] })} />);
    expect(container.firstChild).toBeNull();
  });

  it("показує заголовки, описи й значки тих карток, де вони є", () => {
    render(<FeatureCardBlock {...block({ items: ITEMS })} />);

    expect(screen.getByText("Швидко")).toBeTruthy();
    expect(screen.getByText("Без черг")).toBeTruthy();
    expect(screen.getByText("✓")).toBeTruthy();
    expect(screen.getByText("Дешево")).toBeTruthy();
  });

  it("сітку міряє CSS, а не число колонок із props", () => {
    const { container } = render(<FeatureCardBlock {...block({ items: ITEMS, columns: "3" })} />);
    const grid = container.querySelector(".wb-block-features") as HTMLElement;

    expect(grid.className).toContain("wb-block-features");
    expect(grid.getAttribute("style")).toBeNull();
    expect(grid.querySelectorAll(".wb-block-features__card")).toHaveLength(2);
  });

  it("показники стає парою, а прозові картки — одним стовпцем", () => {
    const figures = render(
      <FeatureCardBlock
        {...block({
          items: [
            { title: "28,8%", description: "християни" },
            { title: "+1,8 в.п.", description: "приріст ісламу" },
          ],
        })}
      />,
    );
    expect(figures.container.querySelector(".wb-block-features--figures")).toBeTruthy();
    figures.unmount();

    const prose = render(
      <FeatureCardBlock
        {...block({
          items: [
            { title: "Кожен блок — окреме дослідження", description: "Своя дата." },
            { title: "Відсотки завжди в межах 100%", description: "І методологія поруч." },
          ],
        })}
      />,
    );
    expect(prose.container.querySelector(".wb-block-features--figures")).toBeNull();
  });
});
