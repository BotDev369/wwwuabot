// @vitest-environment jsdom
/**
 * Введення дат: додати, прибрати й піти на аналіз.
 * @module packages/ui/src/blocks/CompareSetupBlock.dom.test
 */

import { describe, expect, it } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { BlockComponentProps } from "@wwwuabot/shared/types/page-config";
import { CompareSetupBlock } from "./CompareSetupBlock";

function block(props: Record<string, unknown> = {}): BlockComponentProps {
  return {
    block: { id: "b1", type: "compare-setup", order: 0, props },
    zone: "main",
    context: {} as BlockComponentProps["context"],
  };
}

function input(): HTMLInputElement {
  return document.querySelector("input[type='date']") as HTMLInputElement;
}

describe("CompareSetupBlock", () => {
  it("показує свої підписи й не дає піти без дат", () => {
    render(<CompareSetupBlock {...block({ title: "Мої дати" })} />);

    expect(screen.getByText("Мої дати")).toBeTruthy();
    expect(screen.getByRole("button", { name: /Додайте хоча б одну дату/ })).toBeTruthy();
  });

  it("додає дату й рахує її в дії", async () => {
    const user = userEvent.setup();
    render(<CompareSetupBlock {...block()} />);

    fireEvent.change(input(), { target: { value: "2020-01-05" } });
    await user.click(screen.getByRole("button", { name: "Додати дату" }));

    expect(screen.getByRole("button", { name: /Обрати системи для аналізу \(1\)/ })).toBeTruthy();
    expect(input().value).toBe("");
  });

  it("ту саму дату двічі не додає", async () => {
    const user = userEvent.setup();
    render(<CompareSetupBlock {...block()} />);

    for (let i = 0; i < 2; i++) {
      fireEvent.change(input(), { target: { value: "2020-01-05" } });
      await user.click(screen.getByRole("button", { name: "Додати дату" }));
    }

    expect(screen.getByRole("button", { name: /аналізу \(1\)/ })).toBeTruthy();
  });

  it("дату можна прибрати", async () => {
    const user = userEvent.setup();
    render(<CompareSetupBlock {...block()} />);

    fireEvent.change(input(), { target: { value: "2020-01-05" } });
    await user.click(screen.getByRole("button", { name: "Додати дату" }));
    await user.click(screen.getByTitle("Видалити"));

    expect(screen.getByRole("button", { name: /Додайте хоча б одну дату/ })).toBeTruthy();
  });
});
