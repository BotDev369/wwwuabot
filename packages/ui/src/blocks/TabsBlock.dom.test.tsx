// @vitest-environment jsdom
/**
 * Вкладки: активна перша, перемикання міняє вміст, а не лише підсвітку.
 *
 * @module packages/ui/src/blocks/TabsBlock.dom.test
 */

import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { BlockComponentProps } from "@wwwuabot/shared/types/page-config";
import { TabsBlock } from "./TabsBlock";

function block(props: Record<string, unknown>): BlockComponentProps {
  return {
    block: { id: "b1", type: "tabs", order: 0, props },
    zone: "main",
    context: {} as BlockComponentProps["context"],
  };
}

const TABS = [
  { label: "Перша", content: "Вміст першої" },
  { label: "Друга", content: "Вміст другої" },
];

describe("TabsBlock", () => {
  it("без вкладок нічого не малює", () => {
    const { container } = render(<TabsBlock {...block({ tabs: [] })} />);
    expect(container.firstChild).toBeNull();
  });

  it("перша вкладка активна й показує свій вміст", () => {
    render(<TabsBlock {...block({ tabs: TABS })} />);

    expect(screen.getByRole("tab", { name: "Перша" }).getAttribute("aria-selected")).toBe("true");
    expect(screen.getByRole("tabpanel").textContent).toBe("Вміст першої");
  });

  it("клік перемикає вміст і підсвітку", async () => {
    const user = userEvent.setup();
    render(<TabsBlock {...block({ tabs: TABS })} />);

    await user.click(screen.getByRole("tab", { name: "Друга" }));

    expect(screen.getByRole("tab", { name: "Друга" }).getAttribute("aria-selected")).toBe("true");
    expect(screen.getByRole("tab", { name: "Перша" }).getAttribute("aria-selected")).toBe("false");
    expect(screen.getByRole("tabpanel").textContent).toBe("Вміст другої");
  });

  it("значок вкладки живе поруч із підписом", () => {
    render(<TabsBlock {...block({ tabs: [{ label: "Зі значком", icon: "★", content: "" }] })} />);
    expect(screen.getByRole("tab").textContent).toContain("★");
  });

  it("варіант `pills` підсвічує активну вкладку фоном", async () => {
    const user = userEvent.setup();
    render(<TabsBlock {...block({ tabs: TABS, style: "pills" })} />);

    expect((screen.getByRole("tab", { name: "Перша" }) as HTMLElement).style.background).toContain(
      "var(--accent-dim)",
    );

    await user.click(screen.getByRole("tab", { name: "Друга" }));
    expect((screen.getByRole("tab", { name: "Друга" }) as HTMLElement).style.background).toContain(
      "var(--accent-dim)",
    );
  });
});
