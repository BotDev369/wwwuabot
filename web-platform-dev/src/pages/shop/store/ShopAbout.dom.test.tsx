// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { registerAllBlocks } from "@wwwuabot/ui/blocks";
import type { PageConfig } from "@wwwuabot/shared/types/page-config";
import { ShopAbout } from "./ShopAbout";

registerAllBlocks();

const CONTEXT = { slug: "kava", title: "Кав’ярня", photoUrl: null };

function config(main: PageConfig["zones"]["main"]): PageConfig {
  return { version: 1, zones: { sidebar: [], header: [], main, footer: [] } };
}

describe("ShopAbout", () => {
  it("показує текст продавця окремим розділом", () => {
    render(
      <ShopAbout
        config={config([
          {
            id: "delivery",
            type: "card",
            order: 1,
            props: { title: "Доставка" },
            children: [
              { id: "delivery-text", type: "text", order: 0, props: { content: "Завтра" } },
            ],
          },
        ])}
        context={CONTEXT}
      />,
    );

    expect(screen.getByText("Доставка")).toBeTruthy();
    expect(screen.getByText("Завтра")).toBeTruthy();
  });

  it("сітку товарів і заголовок магазину не повторює", () => {
    cleanup();
    render(
      <ShopAbout
        config={config([
          { id: "head", type: "text", order: 0, props: { content: "Заголовок" } },
          { id: "grid", type: "shop-grid", order: 1, props: {} },
        ])}
        context={CONTEXT}
      />,
    );

    expect(screen.queryByText("Заголовок")).toBeNull();
    expect(screen.queryByText("Завтра")).toBeNull();
  });
});
