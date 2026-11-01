// @vitest-environment jsdom
/**
 * Кнопки блоку: адреса, варіант, одна розкладка й перехід у застосунку.
 *
 * @module packages/ui/src/blocks/ButtonsBlock.dom.test
 */

import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import type {
  BlockComponentProps,
  BlockContext,
  PageBlock,
} from "@wwwuabot/shared/types/page-config";
import { ButtonsBlock } from "./ButtonsBlock";

function pageBlock(props: Record<string, unknown>): PageBlock {
  return { id: "b1", type: "buttons", order: 0, props };
}

function context(navigate?: (href: string) => void): BlockContext {
  return { slug: "viruvannia", title: null, photoUrl: null, navigate };
}

function draw(props: Record<string, unknown>, navigate?: (href: string) => void) {
  const blockProps: BlockComponentProps = {
    block: pageBlock(props),
    context: context(navigate),
    zone: "main",
  };
  return render(<ButtonsBlock {...blockProps} />);
}

describe("ButtonsBlock", () => {
  it("без пунктів нічого не малює", () => {
    const { container } = draw({ items: [] });
    expect(container.firstChild).toBeNull();
  });

  it("пункт з адресою стає посиланням, без адреси — кнопкою", () => {
    draw({
      items: [
        { text: "Читати", url: "/viruvannia-a1" },
        { text: "Далі", action: "next" },
      ],
    });

    const link = screen.getByRole("link", { name: "Читати" });
    expect(link.getAttribute("href")).toBe("/viruvannia-a1");
    expect(link.getAttribute("target")).toBe("_blank");
    expect(screen.getByRole("button", { name: "Далі" }).getAttribute("data-action")).toBe("next");
  });

  it("варіант дає свій клас, типово — основний", () => {
    draw({ items: [{ text: "Основна" }, { text: "Тиха", variant: "ghost" }] });

    expect(screen.getByRole("button", { name: "Основна" }).className).toContain("wb-btn-primary");
    expect(screen.getByRole("button", { name: "Тиха" }).className).toContain("wb-btn-ghost");
  });

  it("розкладка одна на продукт — з props вона не змінюється", () => {
    const column = draw({ layout: "column", items: [{ text: "Один" }] });
    const columnRow = column.container.firstChild as HTMLElement;
    expect(columnRow.className).toContain("wb-block-buttons");
    expect(columnRow.getAttribute("style")).toBeNull();
  });

  it("внутрішню адресу віддає роутеру", () => {
    const navigate = vi.fn();
    draw({ items: [{ text: "Читати", url: "/viruvannia-a1" }] }, navigate);

    fireEvent.click(screen.getByRole("link", { name: "Читати" }));

    expect(navigate).toHaveBeenCalledWith("/viruvannia-a1");
  });

  it("чужу адресу роутеру не віддає", () => {
    const navigate = vi.fn();
    draw({ items: [{ text: "Джерело", url: "https://pewresearch.org" }] }, navigate);

    fireEvent.click(screen.getByRole("link", { name: "Джерело" }));

    expect(navigate).not.toHaveBeenCalled();
  });
});
