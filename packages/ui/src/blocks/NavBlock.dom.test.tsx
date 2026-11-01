// @vitest-environment jsdom
/**
 * Меню: посилання, іконки й те, що вигляд іде класами.
 * @module packages/ui/src/blocks/NavBlock.dom.test
 */

import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import type { BlockComponentProps } from "@wwwuabot/shared/types/page-config";
import { NavBlock } from "./NavBlock";

function block(
  props: Record<string, unknown>,
  zone: "header" | "sidebar" = "header",
): BlockComponentProps {
  return {
    block: { id: "b1", type: "nav", order: 0, props },
    zone,
    context: {} as BlockComponentProps["context"],
  };
}

describe("NavBlock", () => {
  it("порожнє меню каже, що воно порожнє", () => {
    const { container } = render(<NavBlock {...block({ items: [] })} />);
    const nav = container.querySelector(".wb-block-nav") as HTMLElement;

    expect(nav.className).toContain("wb-block-nav--empty");
    expect(screen.getByText(/порожнє/)).toBeTruthy();
  });

  it("пункт із адресою — посилання, без адреси — підпис", () => {
    render(
      <NavBlock {...block({ items: [{ text: "Головна", url: "/" }, { text: "Про нас" }] })} />,
    );

    expect(screen.getByRole("link", { name: "Головна" }).getAttribute("href")).toBe("/");
    expect(document.querySelectorAll(".wb-block-nav__item")).toHaveLength(1);
  });

  it("у бічній панелі меню вертикальне", () => {
    const { container } = render(<NavBlock {...block({ items: [{ text: "Дати" }] }, "sidebar")} />);
    const nav = container.querySelector(".wb-block-nav") as HTMLElement;

    expect(nav.className).toContain("wb-block-nav--vertical");
    expect(nav.getAttribute("style")).toBeNull();
  });

  it("іконка стає частиною пункту й не ламає підпис", () => {
    const { container } = render(
      <NavBlock {...block({ items: [{ text: "Дати", icon: "📅" }] })} />,
    );

    expect(container.querySelectorAll(".wb-block-nav__icon")).toHaveLength(1);
    expect(screen.getByText("Дати")).toBeTruthy();
  });
});
