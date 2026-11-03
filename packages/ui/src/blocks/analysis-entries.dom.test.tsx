// @vitest-environment jsdom
/**
 * Входи розділу: групи, місце, куди ведуть картки, і знак кожного входу.
 *
 * Один вхід — одне питання, і пояснень під назвою немає: речення під кожною
 * карткою подвоювало рядок і робило список сірим. Різницю тримають знак і тон.
 *
 * @module packages/ui/src/blocks/analysis-entries.dom.test
 */

import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import type { BlockComponentProps } from "@wwwuabot/shared/types/page-config";
import { AnalysisEntriesBlock } from "./AnalysisEntriesBlock";

function block(items: unknown[], title?: string): BlockComponentProps {
  return {
    block: { id: "b1", type: "analysis-entries", order: 0, props: { title, items } },
    zone: "main",
    context: {} as BlockComponentProps["context"],
  };
}

describe("AnalysisEntriesBlock", () => {
  it("групує входи за підписом і показує знак кожного", () => {
    const { container } = render(
      <AnalysisEntriesBlock
        {...block(
          [
            {
              group: "Один субʼєкт",
              title: "Аналізувати себе",
              url: "/self",
              icon: "user",
              tone: "2",
            },
            {
              group: "Один субʼєкт",
              title: "Аналізувати інших",
              url: "/p",
              icon: "users",
              tone: "4",
            },
            { group: "Порівняння", title: "Порівняння людей", url: "/c" },
          ],
          "Входи",
        )}
      />,
    );

    expect(screen.getByText("Входи")).toBeTruthy();
    expect(screen.getAllByText("Один субʼєкт")).toHaveLength(1);
    expect(screen.getByText("Порівняння")).toBeTruthy();
    expect(screen.getByRole("link", { name: /Аналізувати себе/ }).getAttribute("href")).toBe(
      "/self",
    );

    const entries = container.querySelectorAll(".wb-entry");
    expect(entries).toHaveLength(3);
    expect(entries[0].getAttribute("data-tone")).toBe("2");
    expect(entries[0].querySelector("svg")).toBeTruthy();
    expect(entries[2].getAttribute("data-tone")).toBe("1");
  });

  it("порожній список не малює порожню секцію", () => {
    const { container } = render(<AnalysisEntriesBlock {...block([])} />);
    expect(container.firstChild).toBeNull();
  });
});
