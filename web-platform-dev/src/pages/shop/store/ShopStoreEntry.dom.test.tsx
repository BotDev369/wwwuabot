// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import type { BlockContext, PageConfig } from "@wwwuabot/shared/types/page-config";
import type { ShopProduct } from "@wwwuabot/shared/shop";
import { ShopStore } from "./ShopStore";

const SLUG = "kav-yarnya";
const CONFIG: PageConfig = {
  version: 1,
  zones: { sidebar: [], header: [], main: [], footer: [] },
};
const CONTEXT: BlockContext = { slug: SLUG, title: "Кав’ярня", photoUrl: null };

const PRODUCT: ShopProduct = {
  id: 1,
  shopId: 7,
  slug: "kava-v-zernakh",
  kind: "physical",
  title: "Кава в зернах",
  category: "Кава",
  summary: "",
  description: "",
  price: "250 ₴",
  images: [],
  attributes: [],
  isActive: true,
  createdAt: "",
  updatedAt: "",
};

const TEA: ShopProduct = {
  ...PRODUCT,
  id: 2,
  slug: "chay",
  title: "Чай",
  category: "Чай",
};

function renderEntry(
  routeProductSlug: string | null,
  intent: "add" | "order" | null,
  products: ShopProduct[] = [PRODUCT],
  loading = false,
  intentQty = 1,
): void {
  render(
    <ShopStore
      slug={SLUG}
      title="Кав’ярня"
      photoUrl={null}
      config={CONFIG}
      context={CONTEXT}
      products={products}
      media={[]}
      loading={loading}
      routeProductSlug={routeProductSlug}
      intent={intent}
      intentQty={intentQty}
    />,
  );
}

beforeEach(() => {
  cleanup();
  window.localStorage.clear();
});

describe("ShopStore — вхід з адреси", () => {
  it("посилання на товар відкриває його картку", () => {
    renderEntry("kava-v-zernakh", null);
    expect(screen.getByRole("dialog", { name: "Кава в зернах" })).toBeTruthy();
  });

  it("?add=1 кладе товар у кошик і показує кошик", () => {
    renderEntry("kava-v-zernakh", "add");

    expect(screen.getByRole("button", { name: "Кошик · 1" })).toBeTruthy();
    expect(screen.getByRole("dialog", { name: /Кошик/ })).toBeTruthy();
  });

  it("?order=1 відкриває підтвердження швидкого замовлення", () => {
    renderEntry("kava-v-zernakh", "order");
    expect(screen.getByRole("dialog", { name: /Швидке замовлення/ })).toBeTruthy();
  });

  it("?order=1&qty=3 бере кількість із бота, а не одну штуку", () => {
    renderEntry("kava-v-zernakh", "order", [PRODUCT], false, 3);

    const dialog = screen.getByRole("dialog", { name: /Швидке замовлення/ });
    expect(dialog.textContent).toContain("750 ₴");
  });

  it("невідомий товар лишає покупця на вітрині", () => {
    renderEntry("nema-takoho", null);
    expect(screen.queryByRole("dialog")).toBeNull();
  });
});

describe("ShopStore — полиця", () => {
  it("порожній магазин каже, що товарів ще немає", () => {
    renderEntry(null, null, []);
    expect(screen.getByText(/ще немає товарів/)).toBeTruthy();
  });

  it("поки каталог вантажиться, сітки немає", () => {
    renderEntry(null, null, [PRODUCT], true);
    expect(screen.getByText(/Завантажуємо каталог/)).toBeTruthy();
  });

  it("пошук без збігів радить змінити умову", () => {
    renderEntry(null, null);
    fireEvent.change(screen.getByLabelText("Пошук товару"), { target: { value: "цукор" } });

    expect(screen.getByText(/нічого не знайшлось/)).toBeTruthy();
  });

  it("розділ каталогу звужує сітку до своїх товарів", () => {
    renderEntry(null, null, [PRODUCT, TEA]);
    expect(screen.getByText("Кава в зернах")).toBeTruthy();
    expect(screen.getAllByText("Чай").length).toBeGreaterThan(0);

    fireEvent.click(screen.getByRole("button", { name: /Розділ каталогу/ }));
    fireEvent.click(screen.getByText(/Чай · 1/));

    expect(screen.queryByText("Кава в зернах")).toBeNull();
    expect(screen.getAllByText("Чай").length).toBeGreaterThan(0);
  });

  it("з кошика можна перейти до оформлення", () => {
    renderEntry("kava-v-zernakh", "add");
    expect(screen.getByRole("dialog", { name: /Кошик/ })).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: /Оформити/ }));

    expect(screen.getByRole("dialog", { name: /Оформлення/ })).toBeTruthy();
  });
});
