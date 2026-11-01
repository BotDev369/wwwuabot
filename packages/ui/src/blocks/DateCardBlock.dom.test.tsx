// @vitest-environment jsdom
/**
 * Картка дати: знак, стихія й число рахуються з дати, мірки — з CSS.
 * @module packages/ui/src/blocks/DateCardBlock.dom.test
 */

import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import type { BlockComponentProps } from "@wwwuabot/shared/types/page-config";
import { DateCardBlock } from "./DateCardBlock";

function block(
  props: Record<string, unknown>,
  user?: Record<string, unknown>,
): BlockComponentProps {
  return {
    block: { id: "b1", type: "date-card", order: 0, props },
    zone: "main",
    context: { user } as unknown as BlockComponentProps["context"],
  };
}

/** Полудень за UTC: доба не з'їжджає в сусідню при жодному поясі. */
const CUSTOM = { dateSource: "custom", customDate: "1990-08-25T12:00:00.000Z" };

describe("DateCardBlock", () => {
  it("без дати каже, що дати немає", () => {
    const { container } = render(<DateCardBlock {...block({})} />);

    expect(screen.getByText("Дату не вказано")).toBeTruthy();
    expect((container.firstChild as HTMLElement).className).toContain("wb-empty");
  });

  it("повна картка називає знак, стихію й число", () => {
    const { container } = render(<DateCardBlock {...block(CUSTOM)} />);
    const card = container.querySelector(".wb-block-date-card") as HTMLElement;

    expect(card.className).toContain("--full");
    expect(screen.getAllByText("Діва").length).toBeGreaterThan(0);
    expect(screen.getByText("Земля")).toBeTruthy();
    expect(screen.getByText("7")).toBeTruthy();
    expect(card.getAttribute("style")).toBeNull();
  });

  it("компактна картка лишає знак і дату", () => {
    const { container } = render(<DateCardBlock {...block({ ...CUSTOM, layout: "compact" })} />);

    expect((container.querySelector(".wb-block-date-card") as HTMLElement).className).toContain(
      "--compact",
    );
    expect(container.querySelector(".wb-block-date-card__symbol")!.textContent).toBe("♍");
  });

  it("рядок показує лише знак і його межі", () => {
    const { container } = render(
      <DateCardBlock {...block({ ...CUSTOM, layout: "minimal", showElement: false })} />,
    );

    expect((container.querySelector(".wb-block-date-card") as HTMLElement).className).toContain(
      "--minimal",
    );
    expect(screen.queryByText("Земля")).toBeNull();
  });

  it("дата народження береться з профілю людини", () => {
    render(
      <DateCardBlock
        {...block({}, { username: "tester", birthday: "1990-08-25T12:00:00.000Z" })}
      />,
    );

    expect(screen.getAllByText("Діва").length).toBeGreaterThan(0);
  });

  it("кінець грудня завертає коло на Козеріга, а не за список", () => {
    render(<DateCardBlock {...block({ dateSource: "custom", customDate: "1990-12-25" })} />);

    expect(screen.getAllByText("Козеріг").length).toBeGreaterThan(0);
  });
});
