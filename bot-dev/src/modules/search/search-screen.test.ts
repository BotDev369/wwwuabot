import { describe, expect, it } from "vitest";
import type { SearchMatch } from "@wwwuabot/shared/search";
import { searchScreenHtml } from "./search-screen";

const platform = "https://platform.test";

function match(kind: "page" | "product", over: Partial<SearchMatch["entry"]> = {}): SearchMatch {
  return {
    score: 90,
    entry: {
      kind,
      slug: kind === "page" ? "galyashop" : "astrahal",
      shopSlug: kind === "product" ? "galyashop" : undefined,
      title: kind === "page" ? "GalyaShop" : "Астрагал",
      subtitle: kind === "page" ? "Магазин" : "GalyaShop",
      description: kind === "page" ? "Трави й квіти для здоров'я" : "Трава для настою",
      price: kind === "product" ? "120 ₴" : "",
      photo: "https://api.test/api/shop/media/shop/defaults/page.webp",
      terms: [],
      href: kind === "page" ? "/galyashop" : "/galyashop/p/astrahal",
      ...over,
    },
  };
}

describe("searchScreenHtml", () => {
  it("один збіг — відкритий акордеон без шапки «Знайдено»", () => {
    const html = searchScreenHtml("галяшоп", [match("page")], platform, true);

    expect(html).toContain("<details open><summary>GalyaShop</summary>");
    expect(html).toContain("Трави й квіти для здоров'я");
    expect(html).not.toContain("Знайдено на платформі");
    expect(html).not.toContain("За запитом");
    expect(html).not.toContain("<h1");
    expect(html).not.toContain("<h3");
  });

  it("назва живе тільки в заголовку акордеона", () => {
    const html = searchScreenHtml("астрагал", [match("product")], platform, true);
    expect(html.match(/Астрагал/g)).toHaveLength(1);
    expect(html).toContain("<summary>Астрагал</summary>");
  });

  it("товар показує опис і ціну, без кнопок кошика", () => {
    const html = searchScreenHtml("астрагал", [match("product")], platform, true);

    expect(html).toContain("Трава для настою");
    expect(html).toContain("120 ₴");
    expect(html).toContain(`url="${platform}/galyashop/p/astrahal"`);
    expect(html).not.toContain("?add=1");
    expect(html).not.toContain("?order=1");
    expect(html).toContain("Відкрити");
  });

  it("Відкрити — один рядок на всю ширину, без align", () => {
    const html = searchScreenHtml("галяшоп", [match("page")], platform, true);
    expect(html).toContain('<tg-button-row><tg-button type="web_app"');
    expect(html).not.toContain('align="center"');
  });

  it("порожній опис не лишає порожнього абзацу", () => {
    const html = searchScreenHtml("галяшоп", [match("page", { description: "" })], platform, true);
    expect(html).not.toContain("<p></p>");
  });

  it("кілька збігів — перший відкритий, решта згорнуті", () => {
    const html = searchScreenHtml(
      "трава",
      [
        match("page", { title: "GalyaShop", description: "" }),
        match("product", { title: "Звіробій", description: "" }),
        match("product", { title: "Іван-чай", description: "" }),
      ],
      platform,
      true,
    );

    expect(html.match(/<details/g)).toHaveLength(3);
    expect(html.match(/<details open>/g)).toHaveLength(1);
    expect(html.indexOf("<details open>")).toBeLessThan(
      html.indexOf("<summary>Звіробій</summary>"),
    );
    expect(html).toContain("<summary>Іван-чай</summary>");
    expect(html).not.toContain("<hr/>");
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
    expect(html).not.toContain("<details");
  });

  it("товар без кошика має «Додати в кошик» — колбек, не текст", () => {
    const html = searchScreenHtml("астрагал", [match("product", { id: 12 })], platform, true);

    expect(html).toContain('<tg-button type="callback_data" data="cart:add:12">Додати в кошик');
    expect(html).not.toContain("cart:inc");
  });

  it("кількість із серверного кошика показує крок і checkout", () => {
    const html = searchScreenHtml("астрагал", [match("product", { id: 12 })], platform, true, {
      cart: new Map([[12, 2]]),
    });

    expect(html).toContain('data="cart:dec:12"');
    expect(html).toContain('<tg-button type="disabled">2 шт</tg-button>');
    expect(html).toContain('data="cart:inc:12"');
    expect(html).toContain(`url="${platform}/galyashop/p/astrahal?order=1&amp;qty=2"`);
    expect(html).toContain("Замовити відразу");
  });

  it("після тапу відкритий саме цей акордеон", () => {
    const html = searchScreenHtml(
      "трава",
      [
        match("page", { title: "GalyaShop", description: "" }),
        match("product", { title: "Астрагал", id: 12, description: "" }),
      ],
      platform,
      true,
      { cart: new Map([[12, 1]]), openProductId: 12 },
    );

    expect(html).toContain("<details><summary>GalyaShop</summary>");
    expect(html).toContain("<details open><summary>Астрагал</summary>");
  });

  it("екранує лапки й амперсанди в назві та описі", () => {
    const evil = match("page", {
      title: 'Трава "А" & B',
      description: 'Опис <b>"сильний"</b> & корисний',
    });
    const html = searchScreenHtml("трава", [evil], platform, true);
    expect(html).toContain("&quot;А&quot; &amp; B");
    expect(html).toContain("&lt;b&gt;&quot;сильний&quot;&lt;/b&gt; &amp; корисний");
  });
});
