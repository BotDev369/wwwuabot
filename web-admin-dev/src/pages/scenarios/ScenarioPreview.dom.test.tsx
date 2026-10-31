// @vitest-environment jsdom
/**
 * Прев'ю вкладок: порожній стан, рендер сторінки й кожен тип rich-блока.
 *
 * @module web-admin-dev/src/pages/scenarios/ScenarioPreview.dom.test
 */

import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";

vi.mock("@wwwuabot/ui", () => ({
  PageRenderer: ({ config }: { config: { version?: number } }) => (
    <div data-testid="page">version:{config.version}</div>
  ),
}));

const { TabPreview } = await import("./ScenarioPreview");

const PAGE_DATA = { version: 1, zones: { sidebar: [], header: [], main: [], footer: [] } };

describe("TabPreview", () => {
  it("веб-вкладка без сторінки каже, де її створити", () => {
    render(<TabPreview mainTab="web" fields={{}} slug="nastya" />);

    expect(screen.getByText("Сторінка порожня")).toBeTruthy();
    expect(screen.queryByTestId("page")).toBeNull();
  });

  it("веб-вкладка рендерить сторінку, коли вона є", () => {
    render(<TabPreview mainTab="web" fields={{ page_data: PAGE_DATA }} slug="nastya" />);

    expect(screen.getByTestId("page").textContent).toBe("version:1");
  });

  it("конструктор і спільні поля — різні прев'ю, не те саме", () => {
    render(<TabPreview mainTab="shared" fields={{ slug: "nastya", title: null }} slug="nastya" />);

    expect(screen.getByText("slug")).toBeTruthy();
    expect(screen.getByText("nastya")).toBeTruthy();
    expect(screen.getAllByText("—").length).toBeGreaterThan(0);
  });

  it("порожній rich-вміст не видає себе за готове повідомлення", () => {
    render(<TabPreview mainTab="bot_rich" fields={{ rich_data: [] }} slug="nastya" />);

    expect(screen.getByText("Rich Data порожній")).toBeTruthy();
  });

  it("кожен тип rich-блока малює свій вигляд", () => {
    const rich = [
      { type: "heading", level: 3, text: "Заголовок" },
      { type: "paragraph", text: "Абзац" },
      { type: "divider" },
      { type: "photo", url: "https://example.test/a.jpg" },
      { type: "list", items: ["раз", { a: 1 }] },
      { type: "blockquote", text: "Цитата", children: ["вкладене"] },
      { type: "details", summary: "Підсумок", children: ["тіло"] },
      { type: "footer", text: "Підпис" },
      { type: "slideshow" },
      { type: "magic" },
    ];
    render(
      <TabPreview mainTab="bot_rich" fields={{ rich_data: JSON.stringify(rich) }} slug="nastya" />,
    );

    expect(screen.getByText("Заголовок").className).toContain("tg-heading--h3");
    expect(screen.getByText("Абзац")).toBeTruthy();
    expect(screen.getByText("раз")).toBeTruthy();
    expect(screen.getByText("Цитата")).toBeTruthy();
    expect(screen.getByText("Підсумок")).toBeTruthy();
    expect(screen.getByText("Підпис")).toBeTruthy();
    expect(screen.getByText("Слайдшоу")).toBeTruthy();
    expect(screen.getByText("[magic]")).toBeTruthy();
    expect(screen.getByAltText("")).toBeTruthy();
  });

  it("бот-вкладка збирає підписи й кнопки", () => {
    render(
      <TabPreview
        mainTab="bot"
        fields={{
          photo_url: "https://example.test/p.jpg",
          caption_top: "Верх",
          caption_bot: "Низ",
          buttons: JSON.stringify([[{ text: "Так" }, "сира"], []]),
        }}
        slug="nastya"
      />,
    );

    expect(screen.getByText(/Верх/).textContent).toContain("Низ");
    expect(screen.getByText("Так")).toBeTruthy();
    expect(screen.getByText("сира")).toBeTruthy();
  });

  it("порожнє бот-повідомлення підписане як порожнє", () => {
    render(<TabPreview mainTab="bot" fields={{}} slug="nastya" />);

    expect(screen.getByText("Порожнє повідомлення")).toBeTruthy();
  });
});
