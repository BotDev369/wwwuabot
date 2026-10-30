// @vitest-environment jsdom
/**
 * Кнопка-посилання: розмір, вирівнювання, іконка й перехід у застосунку.
 *
 * @module packages/ui/src/blocks/LinkButtonBlock.dom.test
 */

import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import type {
  BlockComponentProps,
  BlockContext,
  PageBlock,
} from "@wwwuabot/shared/types/page-config";
import { LinkButtonBlock } from "./LinkButtonBlock";

function pageBlock(props: Record<string, unknown>): PageBlock {
  return { id: "b1", type: "link-button", order: 0, props };
}

function context(navigate?: (href: string) => void): BlockContext {
  return { slug: "viruvannia-a1", title: null, photoUrl: null, navigate };
}

function draw(props: Record<string, unknown>, navigate?: (href: string) => void) {
  const blockProps: BlockComponentProps = {
    block: pageBlock(props),
    context: context(navigate),
    zone: "footer",
  };
  return render(<LinkButtonBlock {...blockProps} />);
}

describe("LinkButtonBlock", () => {
  it("показує підпис і веде на адресу", () => {
    draw({ text: "Усі блоки дослідження", url: "/viruvannia" });

    const link = screen.getByRole("link", { name: "Усі блоки дослідження" });
    expect(link.getAttribute("href")).toBe("/viruvannia");
    expect(link.getAttribute("target")).toBe("_blank");
  });

  it("`_self` лишає перехід у тому самому вікні", () => {
    draw({ text: "Назад", url: "/viruvannia", target: "_self" });

    expect(screen.getByRole("link", { name: "Назад" }).getAttribute("target")).toBe("_self");
  });

  it("іконка з реєстру стає знаком, невідома — ні", () => {
    const withIcon = draw({ text: "Читати", url: "/viruvannia-a2", icon: "arrow-right" });
    expect(withIcon.container.querySelector("a span svg")).toBeTruthy();

    withIcon.unmount();
    const withoutIcon = draw({ text: "Читати", url: "/viruvannia-a2", icon: "не-іконка" });
    expect(withoutIcon.container.querySelector("a span svg")).toBeNull();
  });

  it("вирівнювання `full` розтягує кнопку на всю ширину", () => {
    const full = draw({ text: "Широка", url: "/viruvannia", align: "full" });
    expect((screen.getByRole("link", { name: "Широка" }) as HTMLElement).style.width).toBe("100%");

    full.unmount();
    draw({ text: "Центрована", url: "/viruvannia", align: "center" });
    const wrapper = screen.getByRole("link", { name: "Центрована" }).parentElement as HTMLElement;
    expect(wrapper.style.justifyContent).toBe("center");
  });

  it("розмір `lg` дає більший кегль, ніж типовий", () => {
    draw({ text: "Велика", url: "/viruvannia", size: "lg" });

    expect((screen.getByRole("link", { name: "Велика" }) as HTMLElement).style.fontSize).toBe(
      "16px",
    );
  });

  it("внутрішню адресу віддає роутеру, а не браузеру", () => {
    const navigate = vi.fn();
    draw({ text: "Назад", url: "/viruvannia", target: "_self" }, navigate);

    fireEvent.click(screen.getByRole("link", { name: "Назад" }));

    expect(navigate).toHaveBeenCalledWith("/viruvannia");
  });
});
