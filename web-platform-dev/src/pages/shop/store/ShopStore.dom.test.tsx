// @vitest-environment jsdom
/**
 * Вітрина магазину — кошик і поверхні, які покупець відкриває з полиці.
 *
 * Перевіряється те, що легко зламати мовчки: кошик читається зі сховища й
 * показує набране числом, плитка кладе товар у кошик без відкриття картки,
 * картка товару й кошик відкриваються поверхнею (а не новою сторінкою), а
 * вибір розділу звужує сітку — усе це на одному екрані, без переходів.
 *
 * @module web-platform-dev/src/pages/shop/store/ShopStore.dom.test
 */

import { beforeEach, describe, expect, it } from "vitest";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import type { BlockContext, PageConfig } from "@wwwuabot/shared/types/page-config";
import type { ShopProduct } from "@wwwuabot/shared/shop";
import { ShopStore } from "./ShopStore";
import { cartStorageKey } from "./useShopCart";

const SLUG = "kav-yarnya";

const CONFIG: PageConfig = {
  version: 1,
  zones: { sidebar: [], header: [], main: [], footer: [] },
};

const CONTEXT: BlockContext = { slug: SLUG, title: "Кав’ярня", photoUrl: null };

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

const PRODUCTS = [product(1, "Кава в зернах", "Кава"), product(2, "Кружка", "Посуд")];

function renderStore(): void {
  render(
    <ShopStore
      slug={SLUG}
      title="Кав’ярня"
      photoUrl={null}
      config={CONFIG}
      context={CONTEXT}
      products={PRODUCTS}
      media={[]}
      loading={false}
    />,
  );
}

beforeEach(() => {
  cleanup();
  window.localStorage.clear();
});

describe("ShopStore — кошик", () => {
  it("читає кошик зі сховища: набране видно числом, ще до першого дотику", () => {
    window.localStorage.setItem(cartStorageKey(SLUG), JSON.stringify([{ productId: 1, qty: 2 }]));
    renderStore();

    expect(screen.getByRole("button", { name: "Кошик · 2" })).toBeTruthy();
    // Плаваюча смуга зʼявляється тоді, коли в кошику щось є.
    expect(screen.getByLabelText("Швидкий доступ до кошика")).toBeTruthy();
  });

  it("плитка кладе товар у кошик, не відкриваючи картку", () => {
    renderStore();

    fireEvent.click(screen.getByRole("button", { name: "В кошик: Кава в зернах" }));

    expect(screen.getByRole("button", { name: "Кошик · 1" })).toBeTruthy();
    // Картка товару не відкрилась: покупець лишився на полиці.
    expect(screen.queryByRole("dialog", { name: "Кава в зернах" })).toBeNull();
  });

  it("кошик відкривається поверхнею й рахує одиниці", () => {
    renderStore();
    fireEvent.click(screen.getByRole("button", { name: "В кошик: Кава в зернах" }));
    fireEvent.click(screen.getByRole("button", { name: "Кошик · 1" }));

    const cart = screen.getByRole("dialog", { name: /Кошик/ });
    fireEvent.click(within(cart).getByLabelText("Більше"));

    expect(screen.getByRole("button", { name: "Кошик · 2" })).toBeTruthy();
  });

  it("смуга кошика веде до кошика, не змушуючи шукати кнопку вгорі", () => {
    window.localStorage.setItem(cartStorageKey(SLUG), JSON.stringify([{ productId: 1, qty: 1 }]));
    renderStore();

    fireEvent.click(screen.getByRole("button", { name: "Переглянути" }));

    expect(screen.getByRole("dialog", { name: /Кошик/ })).toBeTruthy();
  });

  it("порожній кошик каже, що робити далі", () => {
    renderStore();
    fireEvent.click(screen.getByRole("button", { name: "Кошик" }));

    expect(screen.getByRole("dialog", { name: /Кошик/ }).textContent).toContain("порожн");
  });
});

describe("ShopStore — поверхні полиці", () => {
  it("картка товару відкривається поверхнею й показує опис", () => {
    renderStore();

    // Вхід у товар є двічі — фото й підпис; покупцеві байдуже, який із них.
    fireEvent.click(screen.getAllByRole("button", { name: "Детальніше: Кружка" })[0]);

    const card = screen.getByRole("dialog", { name: "Кружка" });
    expect(card.textContent).toContain("Довгий опис");
    fireEvent.click(within(card).getByRole("button", { name: "Закрити" }));
    expect(screen.queryByRole("dialog", { name: "Кружка" })).toBeNull();
  });

  it("вибір розділу звужує сітку, не йдучи зі сторінки", () => {
    renderStore();
    fireEvent.click(screen.getByRole("button", { name: /Розділ каталогу/ }));

    const picker = screen.getByRole("dialog", { name: "Розділ каталогу" });
    fireEvent.click(within(picker).getByText(/^Посуд/));

    expect(screen.getByText("Кружка")).toBeTruthy();
    expect(screen.queryByText("Кава в зернах")).toBeNull();
  });
});
