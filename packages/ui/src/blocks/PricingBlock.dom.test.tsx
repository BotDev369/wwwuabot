// @vitest-environment jsdom
/**
 * Ціни: плани, «популярний» і те, що вигляд іде класами.
 * @module packages/ui/src/blocks/PricingBlock.dom.test
 */

import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import type { BlockComponentProps } from "@wwwuabot/shared/types/page-config";
import { PricingBlock } from "./PricingBlock";

function block(props: Record<string, unknown>): BlockComponentProps {
  return {
    block: { id: "b1", type: "pricing", order: 0, props },
    zone: "main",
    context: {} as BlockComponentProps["context"],
  };
}

const PLANS = [
  { name: "Базовий", price: "0 ₴", period: "/міс", features: ["Сторінка", "Тема"] },
  { name: "Про", price: "199 ₴", period: "/міс", highlighted: true, features: ["Все з базового"] },
];

describe("PricingBlock", () => {
  it("без планів нічого не малює", () => {
    const { container } = render(<PricingBlock {...block({ plans: [] })} />);
    expect(container.firstChild).toBeNull();
  });

  it("показує назву, ціну, період, склад і кнопку", () => {
    render(<PricingBlock {...block({ plans: PLANS, ctaText: "Обрати" })} />);

    expect(screen.getByText("Базовий")).toBeTruthy();
    expect(screen.getByText("0 ₴")).toBeTruthy();
    expect(screen.getAllByText("/міс")).toHaveLength(2);
    expect(screen.getByText("Тема")).toBeTruthy();
    expect(screen.getAllByRole("button", { name: "Обрати" })).toHaveLength(2);
  });

  it("«популярний» — це клас і чип, а не власні стилі", () => {
    const { container } = render(<PricingBlock {...block({ plans: PLANS })} />);
    const cards = container.querySelectorAll(".wb-block-pricing__card");

    expect(cards[0].className).not.toContain("--on");
    expect(cards[1].className).toContain("wb-block-pricing__card--on");
    expect(cards[1].querySelector(".wb-badge-accent")).toBeTruthy();
    expect(cards[1].getAttribute("style")).toBeNull();
  });

  it("свій підпис кнопки перекриває типовий", () => {
    render(
      <PricingBlock {...block({ plans: [{ name: "Про", price: "199 ₴", ctaText: "Купити" }] })} />,
    );

    expect(screen.getByRole("button", { name: "Купити" })).toBeTruthy();
  });
});
