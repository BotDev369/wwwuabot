// @vitest-environment jsdom
/**
 * Вітрина — головний екран.
 *
 * Ламається мовчки у двох місцях: вхід, що веде не на екран (обіцянка без
 * сторінки), і «Попросити доступ», який нічого не надсилає — тоді людина
 * чекає відповіді, якої ніхто не отримає.
 *
 * @module web-platform-dev/src/pages/entry/EntryPage.dom.test
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { DAY_PATH, PAGES_PATH, USERS_PATH } from "@/app/routes";

const hooks = {
  navigate: vi.fn(),
  sendAccessRequest: vi.fn(async () => true),
};

vi.mock("react-router-dom", () => ({ useNavigate: () => hooks.navigate }));
vi.mock("@/shared/api/access.api", () => ({
  sendAccessRequest: hooks.sendAccessRequest,
}));

const { EntryPage } = await import("./EntryPage");

beforeEach(() => {
  hooks.navigate.mockReset();
  hooks.sendAccessRequest.mockClear();
  hooks.sendAccessRequest.mockResolvedValue(true);
});

describe("вітрина", () => {
  it("називає продукт і обіцянку, а не порожній екран", () => {
    render(<EntryPage />);

    expect(screen.getByRole("heading", { name: "Ділова платформа для Своїх" })).toBeTruthy();
    expect(screen.getByText("Вхід за запрошенням")).toBeTruthy();
  });

  it("«Увійти» веде в «Мій день»", async () => {
    render(<EntryPage />);

    await userEvent.click(screen.getByRole("button", { name: "Увійти" }));

    expect(hooks.navigate).toHaveBeenCalledWith(DAY_PATH);
  });

  it("кожен вхід веде на свій наявний екран", async () => {
    render(<EntryPage />);

    await userEvent.click(screen.getByRole("button", { name: /Крамниця/ }));
    await userEvent.click(screen.getByRole("button", { name: /Гурт/ }));
    await userEvent.click(screen.getByRole("button", { name: /Мій день/ }));

    expect(hooks.navigate.mock.calls.map((call) => call[0])).toEqual([
      PAGES_PATH,
      USERS_PATH,
      DAY_PATH,
    ]);
  });

  it("прохання про доступ відкривається формою й справді надсилається", async () => {
    render(<EntryPage />);

    await userEvent.click(screen.getByRole("button", { name: "Попросити доступ" }));
    await userEvent.type(screen.getByLabelText("Прохання про доступ"), "Хочу всередину");
    await userEvent.click(screen.getByRole("button", { name: "Відправити" }));

    expect(hooks.sendAccessRequest).toHaveBeenCalledWith("Хочу всередину");
    expect(await screen.findByText(/Звернення надіслано/)).toBeTruthy();
  });
});
