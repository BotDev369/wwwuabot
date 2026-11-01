// @vitest-environment jsdom
/**
 * Список сторінки: зміст, маркований чи нумерований, підписи пунктів.
 *
 * Вигляд малює `blocks.css`, тож тест тримає клас, а не інлайн-стиль.
 *
 * @module packages/ui/src/blocks/ListBlock.dom.test
 */

import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import type { BlockComponentProps } from "@wwwuabot/shared/types/page-config";
import { ListBlock } from "./ListBlock";

function block(props: Record<string, unknown>): BlockComponentProps {
  return {
    block: { id: "b1", type: "list", order: 0, props },
    zone: "main",
    context: {} as BlockComponentProps["context"],
  };
}

describe("ListBlock", () => {
  it("без пунктів нічого не малює", () => {
    const { container } = render(<ListBlock {...block({ items: [] })} />);
    expect(container.firstChild).toBeNull();
  });

  it("типово — маркований список", () => {
    const { container } = render(<ListBlock {...block({ items: [{ text: "Раз" }] })} />);
    const list = container.querySelector("ul") as HTMLElement;

    expect(list).toBeTruthy();
    expect(list.className).toContain("wb-block-list");
    expect(list.className).not.toContain("wb-block-list--ordered");
    expect(list.getAttribute("style")).toBeNull();
  });

  it("`ordered` робить список нумерованим", () => {
    const { container } = render(
      <ListBlock {...block({ ordered: true, items: [{ text: "Перший" }] })} />,
    );

    expect(container.querySelector("ol")).toBeTruthy();
    expect(container.querySelector(".wb-block-list--ordered")).toBeTruthy();
  });

  it("підпис пункту живе поруч із текстом, а без нього — не малюється", () => {
    const withDesc = render(
      <ListBlock {...block({ items: [{ text: "Раз", description: "подробиця" }] })} />,
    );
    expect(screen.getByText(/подробиця/).className).toContain("wb-block-list__desc");

    withDesc.unmount();
    const plain = render(<ListBlock {...block({ items: [{ text: "Два" }] })} />);
    expect(plain.container.querySelector(".wb-block-list__desc")).toBeNull();
  });
});
