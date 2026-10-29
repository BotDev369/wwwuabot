/**
 * Вітрина магазину — те, що вона каже клавіатурі телефона й що показує без
 * товарів.
 *
 * Перевіряємо рівно те, що легко зламати мовчки: пошук товару просить клавішу
 * «Знайти», не віддає запит словнику (автопідказки, автозаголовки, орфографія),
 * а порожній каталог пояснює себе словами, а не порожнечею.
 *
 * Середовище тестів — `node` (без DOM): перевіряємо розмітку, яку рендерить
 * React, а не дотики.
 */

/// <reference types="node" />

import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import type { BlockContext, PageConfig } from "@wwwuabot/shared/types/page-config";
import type { ShopProduct } from "@wwwuabot/shared/shop";
import { ShopStore } from "./ShopStore";

const CONFIG: PageConfig = {
  version: 1,
  zones: { sidebar: [], header: [], main: [], footer: [] },
};

const CONTEXT: BlockContext = {
  slug: "kav-yarnya",
  title: "Кав’ярня",
  photoUrl: null,
};

function product(id: number, title: string, category: string): ShopProduct {
  return {
    id,
    shopId: 7,
    slug: `tovar-${id}`,
    kind: "physical",
    title,
    category,
    summary: "Короткий опис",
    description: "Довгий опис",
    price: "250 ₴",
    images: [],
    attributes: [],
    isActive: true,
    createdAt: "2026-10-01T00:00:00.000Z",
    updatedAt: "2026-10-01T00:00:00.000Z",
  };
}

function html(products: ShopProduct[], loading = false): string {
  return renderToStaticMarkup(
    <ShopStore
      slug="kav-yarnya"
      title="Кав’ярня"
      photoUrl={null}
      config={CONFIG}
      context={CONTEXT}
      products={products}
      media={[]}
      loading={loading}
    />,
  );
}

/**
 * Розмітка в нижньому регістрі — лише для атрибутів: імена атрибутів у HTML
 * не регістрозалежні, а текст на сторінці регістр зберігає.
 */
function attributes(markup: string): string {
  return markup.toLowerCase();
}

const PRODUCTS = [product(1, "Кава в зернах", "Кава"), product(2, "Кружка", "Посуд")];

describe("ShopStore — пошук товару", () => {
  it("питає клавіатуру телефона про «Знайти»", () => {
    expect(attributes(html(PRODUCTS))).toContain('enterkeyhint="search"');
  });

  it("не віддає назву товару словнику й не виправляє її", () => {
    const markup = attributes(html(PRODUCTS));
    expect(markup).toContain('autocomplete="off"');
    expect(markup).toContain('autocorrect="off"');
    expect(markup).toContain('spellcheck="false"');
  });
});

describe("ShopStore — стани каталогу", () => {
  it("показує товари, коли вони є", () => {
    const markup = html(PRODUCTS);
    expect(markup).toContain("Кава в зернах");
    expect(markup).toContain("Кружка");
  });

  it("порожній магазин пояснює себе словами", () => {
    expect(html([])).toContain("У магазині ще немає товарів");
  });

  it("завантаження каже, що каталог іде, а не що він порожній", () => {
    const markup = html(PRODUCTS, true);
    expect(markup).toContain("Завантажуємо каталог");
    expect(markup).not.toContain("Кава в зернах");
  });

  it("розділів більше одного — є чим звузити каталог", () => {
    expect(html(PRODUCTS)).toContain("shop-pick");
  });
});
