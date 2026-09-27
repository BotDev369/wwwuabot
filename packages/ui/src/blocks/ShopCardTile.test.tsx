/**
 * Плитка товару — те, що ламається мовчки.
 *
 * Перевіряємо рівно те, чого не видно ні компілятору, ні оку на вітрині:
 *
 *   1. фото у вітрині **справді натискається** й кличе `onOpen` номером саме
 *      цього товару — не «десь» і не чужим;
 *   2. без `onOpen` (перегляд шаблону, сітка сторінки продавця) фото лишається
 *      полотном: кнопка, що нікуди не веде, — це та сама плитка-макет, через
 *      яку з'явилась правка;
 *   3. місце під фото, якого ще немає, лишається тієї ж мірки — і **не блоком**,
 *      бо цей самий вміст стоїть усередині кнопки.
 *
 * Середовище тестів — `node` (без DOM), тож перевіряємо розмітку й дерево
 * елементів, які рендерить React, а не дотики пальцем: так само зроблено в
 * `menu/MenuModal.test.tsx`.
 *
 * @module packages/ui/src/blocks/ShopCardTile.test
 */

import { Children, isValidElement, type ReactElement, type ReactNode } from "react";
import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import type { ShopCard } from "@wwwuabot/shared/shop";
import { ShopCardTile } from "./ShopCardTile";

const CARD: ShopCard = {
  id: 301,
  title: "Соларпанк",
  price: "USD 4.80",
  photoUrl: "/api/shop/media/abc.png",
  kindLabel: "Цифровий товар",
  summary: "20 сторінок · PDF для друку",
  category: "Фентезі",
};

function html(props: Partial<Parameters<typeof ShopCardTile>[0]> = {}): string {
  return renderToStaticMarkup(<ShopCardTile card={CARD} {...props} />);
}

/** Елемент за класом — обходом дерева React, без DOM. */
function findByClass(node: ReactNode, className: string): ReactElement | null {
  if (!isValidElement(node)) return null;
  const props = node.props as { className?: string; children?: ReactNode };
  if ((props.className ?? "").split(/\s+/).includes(className)) return node;
  for (const child of Children.toArray(props.children)) {
    const found = findByClass(child, className);
    if (found) return found;
  }
  return null;
}

describe("ShopCardTile", () => {
  it("дотик по фото відкриває товар — тим самим номером, що й «Детальніше»", () => {
    const opened: number[] = [];
    const tile = ShopCardTile({ card: CARD, onOpen: (id) => opened.push(id) });

    const button = findByClass(tile, "shop-card-media--open");
    expect(button).not.toBeNull();
    expect(button?.type).toBe("button");
    expect(button?.props["aria-label"]).toBe(`Детальніше: ${CARD.title}`);

    // Дотик по фото веде в товар **самого** фото, а не в сусідній: увесь сенс
    // правки в тому, що палець іде в зображення, а не в підпис під ним.
    const onClick = button?.props.onClick as (() => void) | undefined;
    onClick?.();
    expect(opened).toEqual([CARD.id]);
  });

  it("фото лишається на місці, а підпис «Детальніше» — під ним", () => {
    // Два входи в товар — не дубль: палець шукає фото, око шукає слово.
    const markup = html({ onOpen: () => {} });

    expect(markup).toContain("shop-card-media shop-card-media--open");
    expect(markup.indexOf("shop-card-media--open")).toBeLessThan(markup.indexOf("shop-card-img"));
    expect(markup).toContain("shop-card-details");
    expect(markup).toContain("Детальніше");
  });

  it("без `onOpen` фото лишається полотном: кнопки в нікуди немає", () => {
    // Перегляд шаблону й сітка сторінки продавця: товар там із прикладу або
    // відкривається не покупцем, і обіцяти дотик нема куди.
    const markup = html({ onEdit: () => {} });

    expect(markup).toContain('<div class="shop-card-media">');
    expect(markup).not.toContain("shop-card-media--open");
    expect(markup).toContain("Редагувати");
  });

  it("фото, якого немає, лишає місце й не стає блоком усередині кнопки", () => {
    const markup = renderToStaticMarkup(
      <ShopCardTile card={{ ...CARD, photoUrl: null }} onOpen={() => {}} />,
    );

    // `span`, а не `div`: цей самий вміст стоїть і в кнопці фото, а блоковий
    // елемент у ній — уже не розмітка, а те, що браузер мусить пробачити.
    expect(markup).toContain('<span class="shop-card-img shop-card-img--empty"');
    expect(markup).not.toContain('<div class="shop-card-img shop-card-img--empty"');
    // Мітка розділу лишається на фото — порожньому так само, як на справжньому.
    expect(markup).toContain("shop-card-badge");
  });

  it("дій немає — немає й смуги дій", () => {
    // Порожній стовпчик кнопок — це обіцянка дії, а не відступ.
    expect(html()).not.toContain("shop-card-actions");
  });
});
