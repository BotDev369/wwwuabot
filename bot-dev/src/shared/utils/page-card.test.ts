import { describe, expect, it } from "vitest";
import { pageCardBlocks } from "./page-card";

describe("картка сторінки для діплінка", () => {
  it("назва й фото — заголовок і зображення", () => {
    expect(pageCardBlocks("PageSlay", "https://cdn.example/p.png")).toEqual([
      { type: "heading", text: "PageSlay" },
      { type: "photo", photo: { type: "photo", media: "https://cdn.example/p.png" } },
    ]);
  });

  it("⛔ без фото лишається сама назва, без порожнього блока", () => {
    expect(pageCardBlocks("PageSlay", null)).toEqual([{ type: "heading", text: "PageSlay" }]);
  });

  it("⛔ без назви — тільки фото, а не порожній заголовок", () => {
    expect(pageCardBlocks("   ", "https://cdn.example/p.png")).toEqual([
      { type: "photo", photo: { type: "photo", media: "https://cdn.example/p.png" } },
    ]);
  });
});
