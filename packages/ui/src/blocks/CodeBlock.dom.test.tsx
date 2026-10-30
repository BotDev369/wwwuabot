// @vitest-environment jsdom
/**
 * Код: копіювання, нумерація рядків і вимкнена кнопка — те, що видно оком, не видно тесту.
 *
 * @module packages/ui/src/blocks/CodeBlock.dom.test
 */

import { afterEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { BlockComponentProps } from "@wwwuabot/shared/types/page-config";
import { CodeBlock } from "./CodeBlock";

function block(props: Record<string, unknown>): BlockComponentProps {
  return {
    block: { id: "b1", type: "code", order: 0, props },
    zone: "main",
    context: {} as BlockComponentProps["context"],
  };
}

function stubClipboard(writeText = vi.fn(async () => undefined)): void {
  Object.defineProperty(navigator, "clipboard", {
    configurable: true,
    value: { writeText },
  });
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("CodeBlock", () => {
  it("без коду нічого не малює", () => {
    const { container } = render(<CodeBlock {...block({})} />);
    expect(container.firstChild).toBeNull();
  });

  it("показує заголовок, мову й сам код", () => {
    render(<CodeBlock {...block({ code: "npm test", title: "Запуск", language: "bash" })} />);

    expect(screen.getByText("Запуск")).toBeTruthy();
    expect(screen.getByText("npm test")).toBeTruthy();
  });

  it("без заголовка підписом стає мова", () => {
    render(<CodeBlock {...block({ code: "SELECT 1", language: "sql" })} />);
    expect(screen.getByText("sql")).toBeTruthy();
  });

  it("копіює код і каже про це, а потім вертає підпис", async () => {
    const writeText = vi.fn(async () => undefined);
    stubClipboard(writeText);
    render(<CodeBlock {...block({ code: "console.log(1)", language: "ts" })} />);

    // `fireEvent`, а не `userEvent`: його `setup()` ставить власний буфер обміну
    // й перекриває наш — і тоді перевірялося б не те, що ми підклали.
    fireEvent.click(screen.getByRole("button", { name: /Копіювати/ }));

    expect(writeText).toHaveBeenCalledWith("console.log(1)");
    await waitFor(() => expect(screen.getByText("✓ Скопійовано")).toBeTruthy());
  });

  it("з `copyable: false` кнопки немає", () => {
    render(<CodeBlock {...block({ code: "x", copyable: false })} />);
    expect(screen.queryByRole("button", { name: /Копіювати/ })).toBeNull();
  });

  it("нумерує рядки, коли просять", () => {
    render(<CodeBlock {...block({ code: "перший\nдругий", showLineNumbers: true })} />);

    expect(screen.getByText("1")).toBeTruthy();
    expect(screen.getByText("2")).toBeTruthy();
    expect(screen.getByText("другий")).toBeTruthy();
  });

  it("мовчить, якщо буфер обміну недоступний", async () => {
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: {
        writeText: async () => {
          throw new Error("немає дозволу");
        },
      },
    });
    render(<CodeBlock {...block({ code: "x", language: "ts" })} />);

    fireEvent.click(screen.getByRole("button", { name: /Копіювати/ }));

    expect(screen.queryByText("✓ Скопійовано")).toBeNull();
  });
});
