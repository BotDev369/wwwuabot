// @vitest-environment jsdom
/**
 * Чипи сторінки: тони й те, що блок не вигадує власних кольорів.
 *
 * @module packages/ui/src/blocks/BadgeBlock.dom.test
 */

import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import type { BlockComponentProps } from "@wwwuabot/shared/types/page-config";
import { BadgeBlock } from "./BadgeBlock";

function block(props: Record<string, unknown>): BlockComponentProps {
  return {
    block: { id: "b1", type: "badge", order: 0, props },
    zone: "main",
    context: {} as BlockComponentProps["context"],
  };
}

describe("BadgeBlock", () => {
  it("без чипів нічого не малює", () => {
    const { container } = render(<BadgeBlock {...block({ items: [] })} />);
    expect(container.firstChild).toBeNull();
  });

  it("тон стає класом кирпичика, типовий — акцент", () => {
    render(
      <BadgeBlock
        {...block({
          items: [{ text: "Успіх", variant: "green" }, { text: "Типово" }],
        })}
      />,
    );

    expect(screen.getByText("Успіх").className).toContain("wb-badge-green");
    expect(screen.getByText("Типово").className).toContain("wb-badge-accent");
    expect(screen.getByText("Типово").getAttribute("style")).toBeNull();
  });

  it("невідомий тон не створює нового вигляду", () => {
    render(<BadgeBlock {...block({ items: [{ text: "Дивний", variant: "magenta" }] })} />);

    expect(screen.getByText("Дивний").className).toContain("wb-badge-accent");
  });
});
