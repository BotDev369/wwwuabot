// @vitest-environment jsdom
/**
 * Перемикач схеми: підпис, знак і сама дія.
 * @module packages/ui/src/blocks/ThemeToggleBlock.dom.test
 */

import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { BlockComponentProps } from "@wwwuabot/shared/types/page-config";

const toggleScheme = vi.hoisted(() => vi.fn());

vi.mock("@wwwuabot/shared", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@wwwuabot/shared")>();
  return { ...actual, useStyleTheme: () => ({ scheme: "dark", toggleScheme }) };
});

const { ThemeToggleBlock } = await import("./ThemeToggleBlock");

function block(props: Record<string, unknown>): BlockComponentProps {
  return {
    block: { id: "b1", type: "theme-toggle", order: 0, props },
    zone: "footer",
    context: {} as BlockComponentProps["context"],
  };
}

describe("ThemeToggleBlock", () => {
  it("підписує себе й каже, на що перемкне", () => {
    render(<ThemeToggleBlock {...block({})} />);

    expect(screen.getByText("Тема")).toBeTruthy();
    expect(screen.getByRole("button").getAttribute("aria-label")).toContain("світлу");
  });

  it("`showLabel: false` лишає сам знак", () => {
    render(<ThemeToggleBlock {...block({ showLabel: false })} />);

    expect(screen.queryByText("Тема")).toBeNull();
    expect(screen.getByRole("button").querySelector("svg")).toBeTruthy();
  });

  it("дотик перемикає схему", async () => {
    const user = userEvent.setup();
    render(<ThemeToggleBlock {...block({})} />);

    await user.click(screen.getByRole("button"));

    expect(toggleScheme).toHaveBeenCalledTimes(1);
  });
});
