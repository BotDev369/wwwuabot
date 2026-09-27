/**
 * Шапка вітрини — обкладинка, назва й опис.
 *
 * Перевіряємо те, що легко зламати мовчки: що зі знімком шапка несе клас
 * `--cover` (від нього залежить затемнення під підписом), що без знімка немає
 * ні класу, ні порожнього `<img>`, і що порожня назва дає слово «Магазин», а не
 * порожній заголовок.
 *
 * Середовище тестів — `node` (без DOM): перевіряємо розмітку, яку рендерить
 * React, а не дотики.
 */

import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { ShopHero } from "./ShopHero";

const COVER = "/api/shop/media/shop/34/cover.png";

function html(props: Partial<Parameters<typeof ShopHero>[0]> = {}): string {
  return renderToStaticMarkup(
    <ShopHero photoUrl={null} title="PageSlay" tagline="Кожна сторінка — шедевр" {...props} />,
  );
}

describe("ShopHero", () => {
  it("зі знімком шапка несе `--cover`: підпис ляже на затемнення, а не на темне тло", () => {
    const markup = html({ photoUrl: COVER });
    expect(markup).toContain("shop-store-hero--cover");
    expect(markup).toContain(COVER);
  });

  it("без знімка немає ні класу, ні порожнього фото", () => {
    const markup = html();
    expect(markup).toContain("shop-store-hero");
    expect(markup).not.toContain("shop-store-hero--cover");
    expect(markup).not.toContain("shop-store-cover");
  });

  it("порожня назва дає слово «Магазин», а порожній опис не малює рядка", () => {
    const markup = html({ title: "   ", tagline: "" });
    expect(markup).toContain(">Магазин<");
    expect(markup).not.toContain("shop-store-tagline");
  });
});
