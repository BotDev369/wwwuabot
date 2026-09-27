/**
 * Правка замовлення — картки, які бачить продавець.
 *
 * Тут ламається тихо: досить прибрати крок кількості — і замовлення знову
 * редагують лише видаленням; досить показати примітку покупця **полем** — і
 * продавець переписує чужі слова, не помітивши цього; а досить прибрати
 * пояснення до коментаря — і його сприймуть як повідомлення покупцеві, яке
 * нікуди не поїде. Тому перевіряється:
 *
 * - **позиція несе знімок замовлення** й має крок кількості з прибиранням;
 * - **рядок без номера товару редагувати нічим** (спадок давнішого запису), але
 *   його видно — і прибрати його мовчки не можна;
 * - **кнопка додавання позиції є лише тоді, коли є що додати**, і порожній
 *   список пояснює себе словом, а не зникає;
 * - **примітка покупця — текст, а не поле**, і **коментар продавця названий
 *   внутрішнім** до того, як його напишуть.
 *
 * Середовище тестів — `node` (без DOM), тож перевіряємо розмітку, яку рендерить
 * React, а не дотики: так само зроблено в `page-screens.test.tsx`.
 *
 * @module web-platform-dev/src/pages/shop/order-cards.test
 */

import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { orderContactFields, type ShopProduct } from "@wwwuabot/shared/shop";
import { ShopOrderBuyerCard } from "./ShopOrderBuyerCard";
import { ShopOrderItemsCard } from "./ShopOrderItemsCard";
import type { EditableOrderItem } from "./order-view";

const noop = (): void => {};

function product(id: number, over: Partial<ShopProduct> = {}): ShopProduct {
  return {
    id,
    shopId: 3,
    slug: `p-${id}`,
    kind: "physical",
    title: `Товар ${id}`,
    category: "",
    summary: "",
    description: "",
    price: "150 ₴",
    images: [],
    attributes: [],
    isActive: true,
    createdAt: "",
    updatedAt: "",
    ...over,
  };
}

const placed: EditableOrderItem[] = [
  { productId: 5, title: "Рецепти", price: "150 ₴", kind: "digital", qty: 2, isNew: false },
];

function items(markupItems: EditableOrderItem[], available: ShopProduct[], hasProducts: boolean) {
  return renderToStaticMarkup(
    <ShopOrderItemsCard
      items={markupItems}
      available={available}
      shopHasProducts={hasProducts}
      onQty={noop}
      onDrop={noop}
      onAdd={noop}
    />,
  );
}

describe("картка позицій", () => {
  it("позиція несе знімок замовлення й крок кількості", () => {
    const markup = items(placed, [], true);

    expect(markup).toContain("Рецепти");
    expect(markup).toContain("150 ₴");
    expect(markup).toContain('aria-label="Менше: Рецепти"');
    expect(markup).toContain('aria-label="Більше: Рецепти"');
    expect(markup).toContain('aria-label="Прибрати: Рецепти"');
  });

  it("щойно додану позицію видно як нову: знімок для неї ще дасть база", () => {
    const markup = items([{ ...placed[0], isNew: true }], [], true);
    expect(markup).toContain("Нова позиція");
  });

  it("рядок без номера товару показується, але редагувати його нічим", () => {
    const legacy: EditableOrderItem[] = [
      { productId: null, title: "Стара позиція", price: "", kind: "", qty: 1, isNew: false },
    ];
    const markup = items(legacy, [], true);

    expect(markup).toContain("Стара позиція");
    expect(markup).not.toContain("aria-label=");
    expect(markup).not.toContain("Прибрати");
  });

  it("кнопка додавання є лише тоді, коли є що додати", () => {
    expect(items(placed, [product(6)], true)).toContain("Додати позицію");
  });

  it("коли додати нічого — це сказано словом, а не порожнім місцем", () => {
    const all = items(placed, [], true);
    expect(all).not.toContain("Додати позицію");
    expect(all).toContain("Усі товари магазину вже в замовленні.");
  });

  it("порожній магазин каже, чого саме немає", () => {
    expect(items(placed, [], false)).toContain("У магазині ще немає товарів");
  });
});

describe("картка покупця й коментарів", () => {
  function buyer(over: Partial<Parameters<typeof ShopOrderBuyerCard>[0]> = {}) {
    return renderToStaticMarkup(
      <ShopOrderBuyerCard
        fields={orderContactFields(true)}
        contact={{ name: "Олена", phone: "067", address: "Київ" }}
        note="передзвоніть після 18:00"
        sellerNote="оплата на картку"
        onContact={noop}
        onSellerNote={noop}
        {...over}
      />,
    );
  }

  it("контакт — поля з підписами, які питали в покупця", () => {
    const markup = buyer();
    expect(markup).toContain("Адреса доставки");
    expect(markup).toContain('value="Київ"');
  });

  it("примітка покупця читається текстом, а не правиться полем", () => {
    const markup = buyer();

    expect(markup).toContain('<p class="shop-order-contact">передзвоніть після 18:00</p>');
    expect(markup).not.toContain("Примітка покупця:</span>");
  });

  it("коментар продавця названо внутрішнім до того, як його напишуть", () => {
    const markup = buyer();

    expect(markup).toContain("Коментар продавця");
    expect(markup).toContain("оплата на картку");
    expect(markup).toContain("Коментар бачать лише ті, хто веде магазин");
  });

  it("порожнього контакту й порожньої примітки не видно", () => {
    const markup = buyer({
      contact: { name: "Олена", phone: "067", address: "" },
      note: "",
    });

    expect(markup).not.toContain("Примітка покупця");
    expect(markup).toContain('value=""');
  });
});
