// @vitest-environment jsdom
/**
 * Акордеон: те, що ламається мовчки — режим «одна панель» і стан із props.
 *
 * @module packages/ui/src/blocks/AccordionBlock.dom.test
 */

import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { BlockComponentProps } from "@wwwuabot/shared/types/page-config";
import { AccordionBlock } from "./AccordionBlock";

function block(props: Record<string, unknown>): BlockComponentProps {
  return {
    block: { id: "b1", type: "accordion", order: 0, props },
    zone: "main",
    context: {} as BlockComponentProps["context"],
  };
}

const ITEMS = [
  { title: "Перше", content: "Тіло першого" },
  { title: "Друге", content: "Тіло другого" },
];

describe("AccordionBlock", () => {
  it("без пунктів нічого не малює", () => {
    const { container } = render(<AccordionBlock {...block({ items: [] })} />);
    expect(container.firstChild).toBeNull();
  });

  it("пункт із `open: true` відкритий одразу, решта — закрыті", () => {
    render(<AccordionBlock {...block({ items: [{ ...ITEMS[0], open: true }, ITEMS[1]] })} />);

    expect(screen.getByText("Тіло першого")).toBeTruthy();
    expect(screen.queryByText("Тіло другого")).toBeNull();
  });

  it("типово відкритий лише один: наступний закриває попередній", async () => {
    const user = userEvent.setup();
    render(<AccordionBlock {...block({ items: ITEMS })} />);

    await user.click(screen.getByRole("button", { name: /^Перше/ }));
    await user.click(screen.getByRole("button", { name: /^Друге/ }));

    expect(screen.queryByText("Тіло першого")).toBeNull();
    expect(screen.getByText("Тіло другого")).toBeTruthy();
  });

  it("з `multiple` відкриті панелі не закривають одна одну", async () => {
    const user = userEvent.setup();
    render(<AccordionBlock {...block({ items: ITEMS, multiple: true })} />);

    await user.click(screen.getByRole("button", { name: /^Перше/ }));
    await user.click(screen.getByRole("button", { name: /^Друге/ }));

    expect(screen.getByText("Тіло першого")).toBeTruthy();
    expect(screen.getByText("Тіло другого")).toBeTruthy();
  });

  it("повторний клік закриває власну панель", async () => {
    const user = userEvent.setup();
    render(<AccordionBlock {...block({ items: ITEMS })} />);

    await user.click(screen.getByRole("button", { name: /^Перше/ }));
    await user.click(screen.getByRole("button", { name: /^Перше/ }));

    expect(screen.queryByText("Тіло першого")).toBeNull();
  });
});
