// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import type { ShopProduct } from "@wwwuabot/shared/shop";

const state = vi.hoisted(() => ({
  fail: false,
  calls: [] as { slug: string; items: { productId: number; qty: number }[] }[],
}));

vi.mock("@/shared/api/shop.api", () => ({
  shopApi: {
    quickOrder: async (slug: string, items: { productId: number; qty: number }[]) => {
      if (state.fail) throw new Error("Ліміт вичерпано");
      state.calls.push({ slug, items });
      return { id: 12 };
    },
  },
}));

const { ShopQuickOrderModal } = await import("./ShopQuickOrderModal");

const PRODUCT: ShopProduct = {
  id: 1,
  shopId: 7,
  slug: "romashka",
  kind: "physical",
  title: "Ромашка",
  category: "Трави",
  summary: "",
  description: "",
  price: "120 ₴",
  images: [],
  attributes: [],
  isActive: true,
  createdAt: "",
  updatedAt: "",
};

function renderModal(onPlaced = vi.fn()): void {
  render(
    <ShopQuickOrderModal
      shopSlug="galyashop"
      lines={[{ productId: 1, qty: 1 }]}
      products={[PRODUCT]}
      onClose={vi.fn()}
      onPlaced={onPlaced}
    />,
  );
}

beforeEach(() => {
  cleanup();
  state.fail = false;
  state.calls = [];
});

describe("ShopQuickOrderModal", () => {
  it("підтверджує одним дотиком і показує номер замовлення", async () => {
    renderModal();
    expect(screen.getByRole("dialog", { name: /Швидке замовлення/ })).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: /Підтвердити замовлення/ }));

    expect(await screen.findByText(/Замовлення №12/)).toBeTruthy();
    expect(state.calls).toEqual([{ slug: "galyashop", items: [{ productId: 1, qty: 1 }] }]);
  });

  it("відмова сервера показується словами, а не мовчанням", async () => {
    state.fail = true;
    renderModal();

    fireEvent.click(screen.getByRole("button", { name: /Підтвердити замовлення/ }));

    expect(await screen.findByText("Ліміт вичерпано")).toBeTruthy();
  });
});
