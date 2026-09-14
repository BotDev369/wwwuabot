import { describe, expect, it } from "vitest";
import { FALLBACK_BANNER_TITLE, buildFallbackPhotoUrl } from "./photo";

const CLOUD = "ddoumoe5n";

describe("buildFallbackPhotoUrl", () => {
  it("бере текст із адреси сторінки", () => {
    const url = buildFallbackPhotoUrl("mydate", CLOUD);
    expect(url).toContain("l_text:Arial_52_bold:mydate");
    expect(url).toContain("fl_layer_apply");
    expect(url.endsWith("/placeholder.png")).toBe(true);
    expect(url.startsWith(`https://res.cloudinary.com/${CLOUD}/image/upload/`)).toBe(true);
  });

  it("для головної (порожній slug) підставляє назву платформи", () => {
    const url = buildFallbackPhotoUrl("", CLOUD);
    expect(url).toContain(`l_text:Arial_52_bold:${FALLBACK_BANNER_TITLE}`);
    expect(url).toContain("fl_layer_apply");
  });

  it("ніколи не лишає шар без тексту", () => {
    // Порожній `l_text` + `fl_layer_apply` — це 400 від Cloudinary,
    // тобто sendPhoto падає і бот не показує нічого.
    for (const slug of ["", "   ", "\n"]) {
      const url = buildFallbackPhotoUrl(slug, CLOUD);
      expect(url).not.toContain("l_text:Arial_52_bold:,co_white");
    }
  });

  it("кодує сегменти адреси, щоб слеш не рвав шлях трансформації", () => {
    const url = buildFallbackPhotoUrl("galyashop/cart", CLOUD);
    expect(url).toContain("l_text:Arial_52_bold:galyashop%2Fcart");
    expect(url.split("/placeholder.png")[0]).not.toContain("galyashop/cart");
  });
});
