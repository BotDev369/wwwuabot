// @vitest-environment jsdom
/**
 * Колонки: число колонок — структура, ширина — з CSS.
 * @module packages/ui/src/blocks/ColumnsBlock.dom.test
 */

import { describe, expect, it } from "vitest";
import { render } from "@testing-library/react";
import type { BlockComponentProps } from "@wwwuabot/shared/types/page-config";
import { ColumnsBlock } from "./ColumnsBlock";

function block(props: Record<string, unknown>, children?: React.ReactNode): BlockComponentProps {
  return {
    block: { id: "b1", type: "columns", order: 0, props },
    zone: "main",
    context: {} as BlockComponentProps["context"],
    children,
  };
}

describe("ColumnsBlock", () => {
  it("дві колонки типово", () => {
    const { container } = render(<ColumnsBlock {...block({})} />);

    expect(container.querySelectorAll(".wb-block-columns__col")).toHaveLength(2);
    expect((container.querySelector(".wb-block-columns") as HTMLElement).className).toContain(
      "wb-block-columns--2",
    );
  });

  it("три колонки — за `count`", () => {
    const { container } = render(<ColumnsBlock {...block({ count: "3" })} />);

    expect(container.querySelectorAll(".wb-block-columns__col")).toHaveLength(3);
    expect((container.querySelector(".wb-block-columns") as HTMLElement).className).toContain(
      "wb-block-columns--3",
    );
  });

  it("кількість описів колонок важливіша за `count`", () => {
    const { container } = render(
      <ColumnsBlock {...block({ count: "2", columns: [{}, {}, {}] })} />,
    );

    expect(container.querySelectorAll(".wb-block-columns__col")).toHaveLength(3);
  });

  it("вміст живе в кожній колонці", () => {
    const { container } = render(
      <ColumnsBlock {...block({ count: "2" }, <span className="probe">Текст</span>)} />,
    );

    expect(container.querySelectorAll(".probe")).toHaveLength(2);
  });
});
