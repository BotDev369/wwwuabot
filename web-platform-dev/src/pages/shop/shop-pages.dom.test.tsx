// @vitest-environment jsdom
/**
 * Екрани магазину: товари, замовлення, одне замовлення й форма товару.
 *
 * Ці екрани живуть під номером сценарію (`/scenarios/:id/...`), і саме тому тут
 * перевіряється те, чого не видно з даних:
 *
 * - «назад» веде на **сторінку магазину** (`/<slug>`), а не в список, якого
 *   більше немає;
 * - вкладка відкривається лише в магазину, а інший шаблон каже про це словом;
 * - кнопки статусу — слова магазину, і натиск іде тим самим ключем.
 *
 * @module web-platform-dev/src/pages/shop/shop-pages.dom.test
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { resolveOrderStatuses, type ShopOrder, type ShopProduct } from "@wwwuabot/shared/shop";
import type { ManagedScenario } from "@wwwuabot/shared/pages";

const navigate = vi.fn();
let params: Record<string, string> = { id: "3" };
let managed: { page: ManagedScenario | null; loading: boolean; error: string | null };

vi.mock("react-router-dom", () => ({
  useParams: () => params,
  useNavigate: () => navigate,
}));

vi.mock("@/pages/scenarios/useManagedScenario", () => ({
  useManagedScenario: () => managed,
}));

let managedList: ManagedScenario[] = [];
vi.mock("@/pages/scenarios/useManagedScenarios", () => ({
  useManagedScenarios: () => ({ pages: managedList, loading: false, error: null }),
}));

const shopProducts = {
  products: [] as ShopProduct[],
  media: [] as unknown[],
  loading: false,
  error: null as string | null,
  remove: vi.fn(),
  save: vi.fn(async () => product(5)),
  upload: vi.fn(async () => null),
  dropMedia: vi.fn(),
};
vi.mock("./useShopProducts", () => ({ useShopProducts: () => shopProducts }));

const shopOrders = {
  orders: [] as ShopOrder[],
  statuses: resolveOrderStatuses(),
  loading: false,
  error: null as string | null,
  setStatus: vi.fn(async () => {}),
  save: vi.fn(async () => {}),
  remove: vi.fn(async () => {}),
};
vi.mock("./useShopOrders", () => ({ useShopOrders: () => shopOrders }));

const dialog = { confirm: vi.fn(async () => true), alert: vi.fn(async () => {}) };
vi.mock("@wwwuabot/ui/dialog", () => ({ useDialog: () => dialog }));

const shopApi = { removeProduct: vi.fn(async () => {}), removeMedia: vi.fn(async () => {}) };
vi.mock("@/shared/api/shop.api", () => ({ shopApi }));

beforeEach(() => {
  navigate.mockClear();
  dialog.confirm.mockClear();
  shopApi.removeProduct.mockClear();
  shopProducts.remove.mockClear();
  shopProducts.products = [];
  shopOrders.orders = [];
  params = { id: "3" };
  managed = { page: scenario(), loading: false, error: null };
  managedList = [];
});

function scenario(over: Partial<ManagedScenario> = {}): ManagedScenario {
  return {
    id: 3,
    slug: "kava",
    title: "Кава",
    template: "shop",
    values: {},
    isPublic: true,
    staff: [],
    role: "owner",
    updatedAt: "",
    ...over,
  };
}

function product(id: number, over: Partial<ShopProduct> = {}): ShopProduct {
  return {
    id,
    shopId: 3,
    slug: `p-${id}`,
    kind: "physical",
    title: `Товар ${id}`,
    category: "Кава",
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

function order(over: Partial<ShopOrder> = {}): ShopOrder {
  return {
    id: 12,
    shopId: 3,
    buyerId: 42,
    status: "new",
    contact: { name: "Олена", phone: "067", channel: "@olena" },
    note: "",
    sellerNote: "",
    items: [{ productId: 5, title: "Речі", price: "150 ₴", kind: "physical", qty: 2 }],
    createdAt: "2026-09-25 10:00:00",
    updatedAt: "2026-09-25 10:00:00",
    ...over,
  };
}

describe("вхід у товари на сторінці магазину", () => {
  it("власник бачить картку з товарами й замовленнями", async () => {
    managedList = [scenario()];
    const { ShopOwnerPanel } = await import("./ShopOwnerPanel");
    render(<ShopOwnerPanel scenarioId={3} loading={false} count={4} error={null} />);

    expect(screen.getByRole("button", { name: /Додати товар/ })).toBeTruthy();
    expect(screen.getByText("Товарів у магазині: 4")).toBeTruthy();
  });

  it("покупець картки не бачить: він не веде цей магазин", async () => {
    const { ShopOwnerPanel } = await import("./ShopOwnerPanel");
    const { container } = render(
      <ShopOwnerPanel scenarioId={3} loading={false} count={0} error={null} />,
    );

    expect(container.innerHTML).toBe("");
  });
});

describe("товари магазину", () => {
  it("«назад» веде на сторінку магазину, а не в зниклий список", async () => {
    const { ShopProductsPage } = await import("./ShopProductsPage");
    render(<ShopProductsPage />);

    await userEvent.click(screen.getByRole("button", { name: "Назад" }));

    expect(navigate).toHaveBeenCalledWith("/kava");
  });

  it("товар відкриває правку, а прибирання питає підтвердження", async () => {
    shopProducts.products = [product(5, { title: "Кава в зернах" })];
    const { ShopProductsPage } = await import("./ShopProductsPage");
    render(<ShopProductsPage />);

    await userEvent.click(screen.getByText("Кава в зернах"));
    expect(navigate).toHaveBeenCalledWith("/scenarios/3/products/5");

    await userEvent.click(screen.getByRole("button", { name: "Прибрати Кава в зернах" }));
    await waitFor(() => expect(shopApi.removeProduct).toHaveBeenCalledWith(3, 5));
    expect(shopProducts.remove).toHaveBeenCalledWith(5);
  });

  it("не магазин каже про це словом, а не порожнім списком", async () => {
    managed = { page: scenario({ template: "card" }), loading: false, error: null };
    const { ShopProductsPage } = await import("./ShopProductsPage");
    render(<ShopProductsPage />);

    expect(screen.getByText("Товари бувають лише в магазину.")).toBeTruthy();
  });
});

describe("черга замовлень", () => {
  it("картка показує статус словом магазину й веде в одне замовлення", async () => {
    shopOrders.orders = [order()];
    const { ShopOrdersPage } = await import("./ShopOrdersPage");
    render(<ShopOrdersPage />);

    expect(screen.getAllByText(/Нове/).length).toBeGreaterThan(0);
    await userEvent.click(screen.getByRole("button", { name: /Відкрити/ }));

    expect(navigate).toHaveBeenCalledWith("/scenarios/3/orders/12");
  });

  it("кнопка статусу міняє замовлення тим самим ключем", async () => {
    shopOrders.orders = [order()];
    const { ShopOrdersPage } = await import("./ShopOrdersPage");
    render(<ShopOrdersPage />);

    await userEvent.click(screen.getByRole("button", { name: "Підтверджено" }));

    await waitFor(() => expect(shopOrders.setStatus).toHaveBeenCalledWith(12, "confirmed"));
  });
});

describe("одне замовлення", () => {
  it("позиції й контакт приходять зі знімка замовлення", async () => {
    params = { id: "3", orderId: "12" };
    shopOrders.orders = [order()];
    shopProducts.products = [product(5)];
    const { ShopOrderPage } = await import("./ShopOrderPage");
    render(<ShopOrderPage />);

    expect(screen.getByDisplayValue("Олена")).toBeTruthy();
    expect(screen.getByDisplayValue("067")).toBeTruthy();
  });

  it("замовлення без номера в адресі — чесне «немає», а не порожня форма", async () => {
    params = { id: "3", orderId: "999" };
    const { ShopOrderPage } = await import("./ShopOrderPage");
    render(<ShopOrderPage />);

    expect(screen.getByText("Такого замовлення немає.")).toBeTruthy();
  });

  it("«назад» веде до черги, а «Зберегти» віддає правку магазину", async () => {
    params = { id: "3", orderId: "12" };
    // Цифровий товар не питає адреси, тож знімок контакту проходить перевірку.
    shopOrders.orders = [
      order({ items: [{ productId: 5, title: "Файл", price: "150 ₴", kind: "digital", qty: 1 }] }),
    ];
    shopOrders.save.mockClear();
    navigate.mockClear();
    const { ShopOrderPage } = await import("./ShopOrderPage");
    render(<ShopOrderPage />);

    await userEvent.click(screen.getByRole("button", { name: "Назад" }));
    expect(navigate).toHaveBeenCalledWith("/scenarios/3/orders");

    await userEvent.click(screen.getByRole("button", { name: /Зберегти/ }));
    await waitFor(() => expect(shopOrders.save).toHaveBeenCalledWith(12, expect.anything()));
  });

  it("«Прибрати замовлення» питає підтвердження й прибирає", async () => {
    params = { id: "3", orderId: "12" };
    shopOrders.orders = [order()];
    const { ShopOrderPage } = await import("./ShopOrderPage");
    render(<ShopOrderPage />);

    await userEvent.click(screen.getByRole("button", { name: /Прибрати замовлення/ }));

    await waitFor(() => expect(shopOrders.remove).toHaveBeenCalledWith(12));
    expect(dialog.confirm).toHaveBeenCalled();
  });
});

describe("форма товару", () => {
  it("новий товар показує порожню форму з підказкою адреси", async () => {
    const { ShopProductForm } = await import("./ShopProductForm");
    render(<ShopProductForm />);

    expect(screen.getByText("Новий товар")).toBeTruthy();
    expect(screen.getByPlaceholderText("Кава в зернах")).toBeTruthy();
  });

  it("правка бере текст із товару, а назад веде до списку товарів", async () => {
    params = { id: "3", productId: "5" };
    shopProducts.products = [product(5, { title: "Кава в зернах" })];
    const { ShopProductForm } = await import("./ShopProductForm");
    render(<ShopProductForm />);

    expect(screen.getByDisplayValue("Кава в зернах")).toBeTruthy();
    await userEvent.click(screen.getByRole("button", { name: "Назад" }));

    expect(navigate).toHaveBeenCalledWith("/scenarios/3/products");
  });

  it("порожня назва не доходить до сервера — форма каже, чого бракує", async () => {
    const { ShopProductForm } = await import("./ShopProductForm");
    render(<ShopProductForm />);

    await userEvent.click(screen.getByRole("button", { name: /Зберегти/ }));

    expect(shopProducts.save).not.toHaveBeenCalled();
  });

  it("заповнений товар зберігається й повертає до списку", async () => {
    const { ShopProductForm } = await import("./ShopProductForm");
    render(<ShopProductForm />);

    await userEvent.type(screen.getByPlaceholderText("Кава в зернах"), "Кава в зернах");
    await userEvent.type(screen.getByPlaceholderText("2 000 ₴ або договірна"), "200 ₴");
    await userEvent.click(screen.getByRole("button", { name: /Зберегти/ }));

    await waitFor(() => expect(shopProducts.save).toHaveBeenCalled());
    expect(navigate).toHaveBeenCalledWith("/scenarios/3/products", { replace: true });
  });
});
