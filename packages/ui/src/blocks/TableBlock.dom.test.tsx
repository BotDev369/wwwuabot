// @vitest-environment jsdom
/**
 * Таблиця сторінки: шапка, рядки й те, що вона не малює без шапки.
 *
 * Блок ставить ту саму `DataTable`, що й адмінка: окремих таблиць у продукті
 * немає, тож тест перевіряє спільні класи, а не власну розмітку комірок.
 *
 * @module packages/ui/src/blocks/TableBlock.dom.test
 */

import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import type { BlockComponentProps } from "@wwwuabot/shared/types/page-config";
import { TableBlock } from "./TableBlock";

function block(props: Record<string, unknown>): BlockComponentProps {
  return {
    block: { id: "b1", type: "table", order: 0, props },
    zone: "main",
    context: {} as BlockComponentProps["context"],
  };
}

describe("TableBlock", () => {
  it("без шапки нічого не малює", () => {
    const { container } = render(<TableBlock {...block({ headers: [], rows: [] })} />);
    expect(container.firstChild).toBeNull();
  });

  it("ставить спільну таблицю, а не власну розмітку комірок", () => {
    const { container } = render(
      <TableBlock {...block({ headers: ["Країна", "Частка"], rows: [["Індія", "1,2 млрд"]] })} />,
    );

    expect(container.querySelector(".wb-block-table")).toBeTruthy();
    // Рамка скролить в обидва боки, шапка й перший стовпець закріплені —
    // це дає `DataTable`, а не блок.
    expect(container.querySelector(".wb-table-scroll")).toBeTruthy();
    expect(container.querySelector("table")?.className).toContain("wb-table");
    expect(screen.getByText("Країна").tagName).toBe("TH");
    expect(screen.getByText("1,2 млрд").tagName).toBe("TD");
  });

  it("рядок без комірок не ламає таблицю", () => {
    const { container } = render(
      <TableBlock {...block({ headers: ["Група", "Частка"], rows: [["Християни"]] })} />,
    );

    const cells = container.querySelectorAll("td");
    expect(cells).toHaveLength(2);
    expect(cells[1].textContent).toBe("");
  });

  it("не тримає власного вигляду в розмітці", () => {
    const { container } = render(
      <TableBlock {...block({ headers: ["Один"], rows: [["1"]], striped: false })} />,
    );

    expect(
      (container.querySelector(".wb-block-table") as HTMLElement).getAttribute("style"),
    ).toBeNull();
  });
});
