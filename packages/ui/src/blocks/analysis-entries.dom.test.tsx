// @vitest-environment jsdom
/**
 * Входи розділу: групи й місце, куди ведуть картки.
 *
 * Один вхід — одне питання: картка мусить нести і назву, і речення, інакше
 * знову виходять плитки «Аналізувати себе», де не сказано, що саме читають.
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
  it("групує входи за підписом і показує речення", () => {
    render(
      <AnalysisEntriesBlock
        {...block(
          [
            { group: "Один субʼєкт", title: "Аналізувати себе", lead: "Ваша дата", url: "/self" },
            { group: "Один субʼєкт", title: "Аналізувати інших", lead: "Чужа дата", url: "/p" },
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
    expect(screen.getByText("Чужа дата")).toBeTruthy();
  });

  it("порожній список не малює порожню секцію", () => {
    const { container } = render(<AnalysisEntriesBlock {...block([])} />);
    expect(container.firstChild).toBeNull();
  });
});
