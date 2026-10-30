// @vitest-environment jsdom
/**
 * Цитата: підпис автора, роль і варіанти оформлення.
 *
 * @module packages/ui/src/blocks/QuoteBlock.dom.test
 */

import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import type { BlockComponentProps } from "@wwwuabot/shared/types/page-config";
import { QuoteBlock } from "./QuoteBlock";

function block(props: Record<string, unknown>): BlockComponentProps {
  return {
    block: { id: "b1", type: "quote", order: 0, props },
    zone: "main",
    context: {} as BlockComponentProps["context"],
  };
}

describe("QuoteBlock", () => {
  it("без тексту нічого не малює", () => {
    const { container } = render(<QuoteBlock {...block({ author: "Хтось" })} />);
    expect(container.firstChild).toBeNull();
  });

  it("малює текст без підпису, якщо автора немає", () => {
    const { container } = render(<QuoteBlock {...block({ text: "Слова" })} />);

    expect(screen.getByText("Слова")).toBeTruthy();
    expect(container.querySelector("footer")).toBeNull();
  });

  it("підписує автора й роль", () => {
    render(<QuoteBlock {...block({ text: "Слова", author: "Олена", role: "дослідниця" })} />);

    expect(screen.getByText(/Олена/)).toBeTruthy();
    expect(screen.getByText(/дослідниця/)).toBeTruthy();
  });

  it("варіант оформлення змінює рамку, а не текст", () => {
    const bordered = render(<QuoteBlock {...block({ text: "Слова" })} />);
    const left = bordered.container.querySelector("blockquote") as HTMLElement;
    expect(left.style.borderLeft).toContain("3px solid");
    bordered.unmount();

    const filled = render(<QuoteBlock {...block({ text: "Слова", style: "filled" })} />);
    const box = filled.container.querySelector("blockquote") as HTMLElement;
    expect(box.style.borderLeft).toBe("");
    expect(box.style.background).toContain("var(--bg-2)");
    expect(screen.getByText("Слова")).toBeTruthy();
  });
});
