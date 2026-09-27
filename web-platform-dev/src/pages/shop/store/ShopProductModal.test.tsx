/**
 * Картка товару — порядок і згортання.
 *
 * Перевіряємо те, що легко зламати мовчки: що характеристики стоять **під
 * ціною**, а не в кінці картки (там вони відповідали на те саме питання, тільки
 * після п'яти екранів опису), що смуга покупки **липне** до низу аркуша й несе
 * ціну, що примітка про оплату стоїть **у потоці над смугою**, а не в ній, і що
 * розділ із назвою згортається, лишаючи розкритим лише перший.
 *
 * Частина перевірок — про CSS, і це навмисно: «липне» і «межа тане» живуть у
 * правилах, а не в розмітці, тож тест тримає їх разом із нею. Так само зроблено
 * в `notes/NotesToolbar.test.tsx`.
 *
 * Середовище тестів — `node` (без DOM): перевіряємо розмітку, яку рендерить
 * React, і правила CSS, а не дотики.
 */

/// <reference types="node" />

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import type { ShopProduct } from "@wwwuabot/shared/shop";
import { ShopProductModal } from "./ShopProductModal";

/** Стилі вітрини: картку товару малює спільний файл, тож і правила там. */
const CSS = readFileSync(
  join(
    fileURLToPath(new URL("../../../../../", import.meta.url)),
    "packages/shared/src/styles/shop-storefront.css",
  ),
  "utf8",
).replace(/\/\*[\s\S]*?\*\//g, "");

/** Тіло правила за його селектором — як у сусідніх тестах стилів. */
function rule(selector: string): string {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return CSS.match(new RegExp(`${escaped}\\s*\\{([^}]*)\\}`))?.[1] ?? "";
}

const noop = () => {};

/** Опис тієї ж будови, що в базі: вступ абзацами, далі розділи з пунктами. */
const DESCRIPTION = [
  "Ви знаєте цю мармизу, яку робить ваша кицька?",
  "Ми перетворили її на витвір мистецтва — 20 разів. Прошу.",
  "",
  "Що всередині",
  "- 20 унікальних розмальовок із сердитими котами",
  "",
  "Для кого",
  "- Для тих, хто живе з котом",
  "",
  "Як отримати",
  "- Після підтвердження замовлення продавець надсилає PDF у розмові",
].join("\n");

const PRODUCT: ShopProduct = {
  id: 305,
  shopId: 34,
  slug: "angry-cats",
  kind: "digital",
  title: "Сердиті коти — 20 розмальовок",
  category: "Тварини",
  summary: "20 сторінок · PDF для друку",
  description: DESCRIPTION,
  price: "USD 4.80",
  images: [],
  attributes: [
    { name: "Формат", value: "PDF · A4 + Letter" },
    { name: "Сторінок", value: "20" },
  ],
  isActive: true,
  createdAt: "2026-09-27 14:57:31",
  updatedAt: "2026-09-27 17:39:53",
};

function html(inCart = 0): string {
  return renderToStaticMarkup(
    <ShopProductModal
      product={PRODUCT}
      media={[]}
      inCart={inCart}
      onClose={noop}
      onAdd={noop}
      onSetQty={noop}
      onOpenCart={noop}
    />,
  );
}

describe("ShopProductModal", () => {
  it("характеристики стоять під ціною, а не в кінці картки", () => {
    const markup = html();
    expect(markup).toContain("shop-detail-attrs");
    expect(markup.indexOf("shop-detail-attrs")).toBeGreaterThan(markup.indexOf("shop-detail-lead"));
    expect(markup.indexOf("shop-detail-attrs")).toBeLessThan(
      markup.indexOf("shop-detail-sections"),
    );
    // Плитки, а не рядки на всю ширину: пара «назва / значення» займала смугу
    // екрана на кожну.
    expect(rule(".shop-detail-attrs")).toContain("display: grid");
  });

  it("смуга покупки липне до низу аркуша й несе ціну", () => {
    const markup = html();
    expect(rule(".shop-detail-buy")).toContain("position: sticky");
    expect(rule(".shop-detail-buy")).toContain("bottom: 0");
    expect(markup).toContain("shop-detail-buy-price");
    expect(markup).toContain("USD 4.80");
    expect(markup).toContain("Додати в кошик");
  });

  it("примітка про оплату стоїть над смугою, а не в ній", () => {
    const markup = html();
    expect(markup).toContain("shop-detail-note");
    expect(markup.indexOf("shop-detail-note")).toBeLessThan(markup.indexOf("shop-detail-buy"));
    // У липкій смузі вона забрала б третину екрана, тож її правила стоять
    // окремо від смуги.
    expect(rule(".shop-detail-note")).toContain("text-align: center");
    expect(rule(".shop-detail-buy")).not.toContain("text-align: center");
  });

  it("розділ із назвою згортається, і розкритий лише перший", () => {
    const markup = html();
    const details = markup.match(/<details[^>]*>/g) ?? [];
    expect(details).toHaveLength(3);
    expect(details[0]).toContain("open");
    expect(details[1]).not.toContain("open");
    expect(details[2]).not.toContain("open");
    // Шеврон — єдина позначка стану, і він показує, що розділ розкривається.
    expect(markup).toContain("shop-detail-chevron");
    expect(rule(".shop-detail-section[open] > summary .shop-detail-chevron")).toContain(
      "rotate(180deg)",
    );
  });

  it("вступ без назви лишається на виду", () => {
    const markup = html();
    // Перший розділ — той, у якого назви немає: це голос продавця, і згортати
    // в ньому нічого.
    const leadEnd = markup.indexOf("<details");
    expect(leadEnd).toBeGreaterThan(0);
    const lead = markup.slice(0, leadEnd);
    expect(lead).toContain("Ви знаєте цю мармизу");
    expect(lead).toContain("20 разів. Прошу.");
    expect(lead).toContain("shop-detail-section");
    // Вступ читається темнішим за абзац усередині розділу.
    expect(rule(".shop-detail-section:first-child > .shop-detail-text:first-child")).toContain(
      "var(--text-primary)",
    );
  });

  it("межа під заголовком розділу тане до правого краю", () => {
    expect(rule(".shop-detail-heading")).toContain("border-image");
  });

  it("товару в кошику немає — картка пропонує додати", () => {
    const markup = html();
    expect(markup).toContain("Додати в кошик");
    expect(markup).not.toContain("Перейти до кошика");
    expect(markup).not.toContain("shop-detail-incart");
  });

  it("товар уже в кошику — це видно в картці, і кнопка веде далі", () => {
    const markup = html(2);
    // Стан, а не ще одна ціна: покупець мусить бачити, що товар уже додано.
    expect(markup).toContain("shop-detail-incart");
    expect(markup).toContain("У кошику · 9.60 USD");
    expect(markup).toContain("2 шт");
    // Кнопка стає наступним кроком: додавати той самий товар удруге нічого.
    expect(markup).toContain("Перейти до кошика");
    expect(markup).not.toContain("Додати в кошик");
    // Рядок кошика — той самий кирпичик, що в плитці вітрини.
    expect(rule(".shop-detail-incart")).toContain("color: var(--accent)");
  });
});
