// @vitest-environment jsdom
/**
 * Головна: обкладинка з назвою й меню, що дублює сайдбар.
 *
 * Ламається мовчки у двох місцях: обкладинка без назви продукту й меню, у
 * якому пункт веде не на свій екран. Тому перевіряємо склад груп і адресу
 * кожного рядка, а не сам факт наявності кнопок.
 *
 * @module web-platform-dev/src/pages/entry/EntryPage.dom.test
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const hooks = { navigate: vi.fn() };

vi.mock("react-router-dom", () => ({ useNavigate: () => hooks.navigate }));
// Перший кадр: `/api/screens` ще не відповів — меню будується з реєстру.
vi.mock("@/layout/useScreens", () => ({
  useScreens: () => ({ rows: [], ready: false, byKey: new Map() }),
}));

const { EntryPage } = await import("./EntryPage");

function labels(selector: string): string[] {
  return [...document.querySelectorAll(selector)].map((node) => node.textContent?.trim() ?? "");
}

beforeEach(() => {
  hooks.navigate.mockReset();
});

describe("головна", () => {
  it("називає продукт і обіцянку на обкладинці", () => {
    render(<EntryPage />);

    expect(screen.getByRole("heading", { name: "ПАЛЯНИЦЯ" })).toBeTruthy();
    expect(screen.getByText("платформа для своїх")).toBeTruthy();
  });

  it("дублює меню картками без підписів, у порядку груп", () => {
    render(<EntryPage />);

    // Підписів груп на головній немає: групу читає сама картка, як у Tribute.
    expect(document.querySelectorAll(".wb-showcase-group-title")).toHaveLength(0);
    expect(document.querySelectorAll(".wb-showcase-list")).toHaveLength(5);
    expect(labels(".wb-showcase-row-label")).toEqual([
      "Мій день",
      "Аналіз людей і подій",
      "Трекери",
      "Нотатки",
      "Крамниці",
      "Замовлення",
      "Обране",
      "Гурт",
      "Повідомлення",
      "Контакти",
      "Оголошення",
      "Ігри",
      "Дослідження",
      "Сервіси",
      "Акаунт",
    ]);
  });

  it("кожна плитка залита своїм тоном палітри", () => {
    render(<EntryPage />);

    const tones = [...document.querySelectorAll(".wb-showcase-row-icon")].map((node) =>
      node.getAttribute("data-tone"),
    );

    expect(tones).toHaveLength(15);
    expect(new Set(tones).size).toBeGreaterThan(3);
    for (const tone of tones) expect(Number(tone)).toBeGreaterThanOrEqual(1);
  });

  it("кожен рядок веде на свій екран", async () => {
    render(<EntryPage />);

    await userEvent.click(screen.getByRole("link", { name: "Крамниці" }));
    await userEvent.click(screen.getByRole("link", { name: "Нотатки" }));

    expect(hooks.navigate.mock.calls.map((call) => call[0])).toEqual(["/shops", "/notes"]);
  });
});
