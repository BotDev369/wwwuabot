// @vitest-environment jsdom
/**
 * Цитата: підпис автора, роль і один канонічний вигляд.
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

  it("вигляд один: рамку малює клас, а не значення з props", () => {
    const { container } = render(<QuoteBlock {...block({ text: "Слова", style: "filled" })} />);
    const quote = container.querySelector("blockquote") as HTMLElement;

    expect(quote.className).toContain("wb-block-quote");
    expect(quote.getAttribute("style")).toBeNull();
    expect(screen.getByText("Слова")).toBeTruthy();
  });
});
