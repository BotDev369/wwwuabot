import { describe, expect, it } from "vitest";
import type { SearchMatch } from "@wwwuabot/shared/search";
import { searchScreenHtml } from "./search-screen";

const platform = "https://platform.test";

function match(kind: "page" | "product"): SearchMatch {
  return {
    score: 90,
    entry: {
      kind,
      slug: kind === "page" ? "galyashop" : "astrahal",
      shopSlug: kind === "product" ? "galyashop" : undefined,
      title: kind === "page" ? "GalyaShop" : "Астрагал",
      subtitle: kind === "page" ? "Магазин" : "GalyaShop",
      price: kind === "product" ? "120 ₴" : "",
      photo: "https://api.test/api/shop/media/shop/defaults/page.webp",
      terms: [],
      href: kind === "page" ? "/galyashop" : "/galyashop/p/astrahal",
    },
  };
}

describe("searchScreenHtml", () => {
  it("картка має фото й кнопку на всю ширину без align", () => {
    const html = searchScreenHtml("галяшоп", [match("page")], platform, true);
    expect(html).toContain('<img src="https://api.test/api/shop/media/shop/defaults/page.webp"/>');
    expect(html).toContain('<tg-button-row><tg-button type="web_app"');
    expect(html).not.toContain('align="center"');
    expect(html).toContain(`url="${platform}/galyashop"`);
  });

  it("товар отримує «У кошик» і «Замовити» з підставленими параметрами", () => {
    const html = searchScreenHtml("астрагал", [match("product")], platform, true);
    expect(html).toContain(`url="${platform}/galyashop/p/astrahal?add=1"`);
    expect(html).toContain(`url="${platform}/galyashop/p/astrahal?order=1"`);
    expect(html).toContain("120 ₴");
  });

  it("у групі кнопки — звичайні url, без web_app", () => {
    const html = searchScreenHtml("галяшоп", [match("page")], platform, false);
    expect(html).toContain('<tg-button type="url"');
    expect(html).not.toContain('type="web_app"');
  });

  it("порожній результат каже, що нічого не знайдено", () => {
    const html = searchScreenHtml("абракадабра", [], platform, true);
    expect(html).toContain("Нічого не знайдено");
    expect(html).toContain("Спробуйте написати по-іншому");
    expect(html).not.toContain("<img");
  });

  it("екранує лапки й амперсанди в назві", () => {
    const evil = match("page");
    evil.entry.title = 'Трава "А" & B';
    const html = searchScreenHtml("трава", [evil], platform, true);
    expect(html).toContain("&quot;А&quot; &amp; B");
  });
});
