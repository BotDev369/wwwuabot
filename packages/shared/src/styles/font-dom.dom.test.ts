// @vitest-environment jsdom
/**
 * Шрифт на екрані: вибір людини ставить обидві родини — текст і заголовки.
 *
 * @module packages/shared/src/styles/font-dom.dom.test
 */

import { beforeEach, describe, expect, it } from "vitest";
import { applyFont } from "./font-dom";

function root(): CSSStyleDeclaration {
  return document.documentElement.style;
}

beforeEach(() => {
  document.documentElement.removeAttribute("style");
  document.head.innerHTML = "";
});

describe("applyFont", () => {
  it("ставить обидві родини — текст і заголовки", () => {
    applyFont("lora");

    expect(root().getPropertyValue("--font-ui")).toContain("Lora");
    expect(root().getPropertyValue("--font-display")).toContain("Lora");
  });

  it("підвантажує родину одним посиланням", () => {
    applyFont("lora");

    const link = document.getElementById("wb-font-link") as HTMLLinkElement | null;
    expect(link?.rel).toBe("stylesheet");
    expect(link?.href).toContain("Lora");
  });

  it("порожній вибір повертає типографіку продукту", () => {
    applyFont("lora");
    applyFont(null);

    expect(root().getPropertyValue("--font-ui")).toBe("");
    expect(root().getPropertyValue("--font-display")).toBe("");
    expect(document.getElementById("wb-font-link")).toBeNull();
  });
});
