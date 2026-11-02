// @vitest-environment jsdom
/**
 * Шрифт на екрані: тема задає **заголовки**, основний текст лишається родиною
 * продукту.
 *
 * @module packages/shared/src/styles/font-dom.dom.test
 */

import { beforeEach, describe, expect, it } from "vitest";
import { applyDisplayFont, applyFont } from "./font-dom";

function root(): CSSStyleDeclaration {
  return document.documentElement.style;
}

beforeEach(() => {
  document.documentElement.removeAttribute("style");
  document.head.innerHTML = "";
});

describe("applyDisplayFont", () => {
  it("ставить шрифт заголовків і не чіпає основний текст", () => {
    applyDisplayFont("playfair");

    expect(root().getPropertyValue("--font-display")).toContain("Playfair");
    expect(root().getPropertyValue("--font-ui")).toBe("");
  });

  it("підвантажує родину одним посиланням", () => {
    applyDisplayFont("playfair");

    const link = document.getElementById("wb-font-link") as HTMLLinkElement | null;
    expect(link?.rel).toBe("stylesheet");
    expect(link?.href).toContain("Playfair");
  });

  it("порожній вибір знімає змінну й посилання", () => {
    applyDisplayFont("playfair");
    applyDisplayFont("");

    expect(root().getPropertyValue("--font-display")).toBe("");
    expect(document.getElementById("wb-font-link")).toBeNull();
  });
});

describe("applyFont", () => {
  it("ставить обидві родини — текст і заголовки", () => {
    applyFont("lora");

    expect(root().getPropertyValue("--font-ui")).toContain("Lora");
    expect(root().getPropertyValue("--font-display")).toContain("Lora");
  });

  it("порожній вибір повертає типографіку продукту", () => {
    applyFont("lora");
    applyFont(null);

    expect(root().getPropertyValue("--font-ui")).toBe("");
    expect(root().getPropertyValue("--font-display")).toBe("");
  });
});
