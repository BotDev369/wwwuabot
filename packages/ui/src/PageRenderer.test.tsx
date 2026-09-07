import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { PageRenderer } from "./PageRenderer";
import type { PageConfig, BlockContext } from "@wwwuabot/shared/types/page-config";

const dummyContext: BlockContext = {
  codeword: "test",
  title: "Test Page",
  photoUrl: null,
};

describe("PageRenderer", () => {
  it("renders floating hamburger button when sidebar has blocks and header has none", () => {
    const config: PageConfig = {
      version: 1,
      zones: {
        sidebar: [{ id: "b1", type: "nav", order: 0, props: { items: [{ text: "Link 1" }] } }],
        header: [],
        main: [{ id: "b2", type: "text", order: 0, props: { content: "Hello" } }],
        footer: [],
      },
    };

    const html = renderToStaticMarkup(
      <PageRenderer config={config} context={dummyContext} />
    );

    expect(html).toContain("page-hamburger--floating");
    expect(html).toContain("page-zone--sidebar");
    expect(html).toContain("page-sidebar-close");
  });

  it("renders hamburger inside header when both header and sidebar have blocks", () => {
    const config: PageConfig = {
      version: 1,
      zones: {
        sidebar: [{ id: "b1", type: "nav", order: 0, props: { items: [{ text: "Link 1" }] } }],
        header: [{ id: "b2", type: "text", order: 0, props: { content: "Header Title" } }],
        main: [{ id: "b3", type: "text", order: 0, props: { content: "Hello" } }],
        footer: [],
      },
    };

    const html = renderToStaticMarkup(
      <PageRenderer config={config} context={dummyContext} />
    );

    expect(html).not.toContain("page-hamburger--floating");
    expect(html).toContain("page-hamburger");
    expect(html).toContain("page-zone--header");
    expect(html).toContain("page-zone--sidebar");
  });

  it("does not render hamburger button when sidebar is empty", () => {
    const config: PageConfig = {
      version: 1,
      zones: {
        sidebar: [],
        header: [{ id: "b1", type: "text", order: 0, props: { content: "Header" } }],
        main: [{ id: "b2", type: "text", order: 0, props: { content: "Main" } }],
        footer: [],
      },
    };

    const html = renderToStaticMarkup(
      <PageRenderer config={config} context={dummyContext} />
    );

    expect(html).not.toContain("page-hamburger");
    expect(html).not.toContain("page-zone--sidebar");
  });

  it("safely handles undefined zones in partial PageConfig", () => {
    const config = {
      version: 1,
      zones: {},
    } as unknown as PageConfig;

    const html = renderToStaticMarkup(
      <PageRenderer config={config} context={dummyContext} />
    );

    expect(html).not.toContain("page-hamburger");
    expect(html).not.toContain("page-zone--sidebar");
  });
});
