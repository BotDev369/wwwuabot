// @vitest-environment jsdom
/**
 * Таблиця з HTML-контенту — та сама таблиця продукту.
 *
 * `richtext` і `html` приходять готовою розміткою, тож рамку, шапку й
 * закріплений перший стовпець їм дає `wrapContentTables`. Без цього широка
 * таблиця з контенту розтягувала сторінку вбік, а її шапка ховалась під смугою
 * вікна — виглядало як інший продукт на одному екрані.
 *
 * @module packages/ui/src/blocks/content-tables.dom.test
 */

import { describe, expect, it } from "vitest";
import { render } from "@testing-library/react";
import type { BlockComponentProps } from "@wwwuabot/shared/types/page-config";
import { HtmlBlock } from "./HtmlBlock";
import { RichTextBlock } from "./RichTextBlock";
import { wrapContentTables } from "./wrap-tables";

function block(props: Record<string, unknown>): BlockComponentProps {
  return {
    block: { id: "b1", type: "richtext", order: 0, props },
    zone: "main",
    context: {} as BlockComponentProps["context"],
  };
}

const TABLE = "<table><tbody><tr><td>1,2 млрд</td></tr></tbody></table>";

describe("таблиця з контенту", () => {
  it("RichTextBlock загортає її в рамку продукту", () => {
    const { container } = render(<RichTextBlock {...block({ html: TABLE })} />);

    expect(container.querySelector(".wb-table-scroll > table.wb-table")).toBeTruthy();
  });

  it("без тексту блок нічого не малює", () => {
    const { container } = render(<RichTextBlock {...block({ html: "" })} />);

    expect(container.firstChild).toBeNull();
  });

  it("HtmlBlock робить те саме — і в пісочниці, і без неї", () => {
    for (const sandbox of [true, false]) {
      const { container, unmount } = render(<HtmlBlock {...block({ code: TABLE, sandbox })} />);

      expect(container.querySelector(".wb-table-scroll > table.wb-table")).toBeTruthy();
      unmount();
    }
  });

  it("без коду блок нічого не малює", () => {
    const { container } = render(<HtmlBlock {...block({ code: "" })} />);

    expect(container.firstChild).toBeNull();
  });

  it("повторний виклик не дає другої рамки", () => {
    const root = document.createElement("div");
    root.innerHTML = TABLE;

    wrapContentTables(root);
    wrapContentTables(root);

    expect(root.querySelectorAll(".wb-table-scroll")).toHaveLength(1);
    expect(root.querySelector(".wb-table-scroll > table")?.className).toContain("wb-table");
  });

  it("без таблиць і без кореня нічого не робить", () => {
    const root = document.createElement("div");
    root.innerHTML = "<p>текст без таблиці</p>";

    wrapContentTables(root);
    expect(root.querySelector(".wb-table-scroll")).toBeNull();
    expect(() => wrapContentTables(null)).not.toThrow();
  });
});
