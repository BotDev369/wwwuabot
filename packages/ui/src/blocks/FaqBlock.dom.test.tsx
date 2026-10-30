// @vitest-environment jsdom
/**
 * FAQ: заголовок, незалежні відповіді й закритий стартовий стан.
 *
 * @module packages/ui/src/blocks/FaqBlock.dom.test
 */

import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { BlockComponentProps } from "@wwwuabot/shared/types/page-config";
import { FaqBlock } from "./FaqBlock";

function block(props: Record<string, unknown>): BlockComponentProps {
  return {
    block: { id: "b1", type: "faq", order: 0, props },
    zone: "main",
    context: {} as BlockComponentProps["context"],
  };
}

const ITEMS = [
  { question: "Скільки?", answer: "Стільки" },
  { question: "Коли?", answer: "Завтра" },
];

describe("FaqBlock", () => {
  it("без питань нічого не малює", () => {
    const { container } = render(<FaqBlock {...block({ items: [] })} />);
    expect(container.firstChild).toBeNull();
  });

  it("типовий заголовок — «Часті питання», відповіді закриті", () => {
    render(<FaqBlock {...block({ items: ITEMS })} />);

    expect(screen.getByText("Часті питання")).toBeTruthy();
    expect(screen.queryByText("Стільки")).toBeNull();
  });

  it("свій заголовок замінює типовий", () => {
    render(<FaqBlock {...block({ items: ITEMS, title: "Питання покупців" })} />);
    expect(screen.getByText("Питання покупців")).toBeTruthy();
  });

  it("відповіді відкриваються незалежно одна від одної", async () => {
    const user = userEvent.setup();
    render(<FaqBlock {...block({ items: ITEMS })} />);

    await user.click(screen.getByRole("button", { name: /^Скільки\?/ }));
    await user.click(screen.getByRole("button", { name: /^Коли\?/ }));

    expect(screen.getByText("Стільки")).toBeTruthy();
    expect(screen.getByText("Завтра")).toBeTruthy();
  });

  it("повторний клік ховає відповідь", async () => {
    const user = userEvent.setup();
    render(<FaqBlock {...block({ items: ITEMS })} />);

    await user.click(screen.getByRole("button", { name: /^Скільки\?/ }));
    await user.click(screen.getByRole("button", { name: /^Скільки\?/ }));

    expect(screen.queryByText("Стільки")).toBeNull();
  });
});
