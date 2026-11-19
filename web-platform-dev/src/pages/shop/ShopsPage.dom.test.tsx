// @vitest-environment jsdom
/**
 * «Магазини» — список відкритих магазинів, який повернувся в меню.
 *
 * Тест тримає те, що ламається мовчки: рядок веде на **адресу магазину**
 * (`/<slug>`), порожній список каже, що він порожній (а не вдає поломку
 * завантаження), і помилка не лишає на екрані «немає магазинів».
 *
 * @module web-platform-dev/src/pages/shop/ShopsPage.dom.test
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const navigate = vi.fn();
let shops: () => Promise<{ id: number; slug: string; title: string }[]> = async () => [];

vi.mock("react-router-dom", () => ({ useNavigate: () => navigate }));
vi.mock("@wwwuabot/ui/nav", () => ({ useScreenChrome: () => {} }));
vi.mock("@/shared/api/shop.api", () => ({
  shopApi: { shops: () => shops() },
}));

const { ShopsPage } = await import("./ShopsPage");

beforeEach(() => {
  vi.clearAllMocks();
  shops = async () => [];
});

describe("екран «Магазини»", () => {
  it("показує магазини, які віддав запит", async () => {
    shops = async () => [
      { id: 3, slug: "kava", title: "Кав'ярня" },
      { id: 5, slug: "salon", title: "Салон" },
    ];
    render(<ShopsPage />);

    expect(await screen.findByText("Кав'ярня")).toBeTruthy();
    expect(screen.getByText("Салон")).toBeTruthy();
  });

  it("дотик відкриває вітрину за адресою магазину, а не за номером", async () => {
    shops = async () => [{ id: 3, slug: "kava", title: "Кав'ярня" }];
    render(<ShopsPage />);

    await userEvent.click(await screen.findByRole("button", { name: /Кав'ярня/ }));

    expect(navigate).toHaveBeenCalledWith("/kava");
  });

  it("порожній список каже, що магазинів немає", async () => {
    render(<ShopsPage />);

    expect(await screen.findByText("Відкритих магазинів ще немає.")).toBeTruthy();
    expect(screen.queryByRole("button")).toBeNull();
  });

  it("помилку показує текстом, а не як порожній список", async () => {
    shops = async () => {
      throw new Error("Немає зв'язку");
    };
    render(<ShopsPage />);

    expect(await screen.findByText("Немає зв'язку")).toBeTruthy();
    expect(screen.queryByText("Відкритих магазинів ще немає.")).toBeNull();
  });
});
