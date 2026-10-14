// @vitest-environment jsdom
/**
 * «Оголошення» — дошка як окремий екран.
 *
 * Тут ламається мовчки: досить перестати показувати причину помилки — і дошка
 * виглядає просто порожньою; досить загубити вхід до створення на порожньому
 * екрані — і людині нікуди натиснути; досить не передати до дошки те, що дав
 * сервер, — і власні чернетки зникають.
 *
 * **Композер відкривається адресою** (`?new=1`), тож «назад» закриває форму, а
 * не виводить зі сторінки. Це теж перевіряється: дотик «Створити оголошення»
 * показує композер, а його закриття вертає дошку.
 *
 * @module web-platform-dev/src/pages/AdsPage.dom.test
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import type { Ad } from "@wwwuabot/shared/ads";
import type { PublicAd } from "./ads-list";

const state = {
  items: [] as PublicAd[],
  loading: false,
  error: null as string | null,
  reload: vi.fn(),
  save: vi.fn(),
  remove: vi.fn(),
};

vi.mock("./useAds", () => ({ useAds: () => state }));
vi.mock("@wwwuabot/ui/nav", () => ({ useScreenChrome: () => {} }));
vi.mock("./create/AdCreateSheet", () => ({
  AdCreateSheet({ onClose }: { onClose: () => void }) {
    return (
      <div>
        <p>композер оголошення</p>
        <button onClick={onClose}>закрити композер</button>
      </div>
    );
  },
}));

const { AdsPage } = await import("./AdsPage");

const ad = (id: number, title: string): PublicAd => ({
  ad: {
    id,
    ownerId: 1,
    kind: "sell",
    title,
    body: "",
    price: "",
    place: "",
    isActive: true,
    createdAt: "2026-10-01 00:00:00",
    updatedAt: "2026-10-01 00:00:00",
  } satisfies Ad,
  mine: true,
});

beforeEach(() => {
  vi.clearAllMocks();
  state.items = [];
  state.loading = false;
  state.error = null;
});

const renderBoard = (): void => {
  render(
    <MemoryRouter>
      <AdsPage />
    </MemoryRouter>,
  );
};

describe("дошка оголошень", () => {
  it("порожня дошка каже, де створити, і дає кнопку", () => {
    renderBoard();

    expect(screen.getByText(/Тут поки нічого немає/)).toBeTruthy();
    expect(screen.getByRole("button", { name: /Створити оголошення/ })).toBeTruthy();
  });

  it("показує те, що дав список", () => {
    state.items = [ad(1, "Телевізор")];
    renderBoard();

    expect(screen.getByText("Телевізор")).toBeTruthy();
  });

  it("помилка називає причину й дає спробувати ще", () => {
    state.error = "Немає доступу";
    renderBoard();

    expect(screen.getByText("Немає доступу")).toBeTruthy();
    expect(screen.getByRole("button", { name: /Спробувати ще/ })).toBeTruthy();
  });

  it("завантаження не прикидається порожньою дошкою", () => {
    state.loading = true;
    renderBoard();

    expect(screen.getByText(/Завантаження/)).toBeTruthy();
  });
});

describe("створення за адресою", () => {
  it("дотик «Створити оголошення» відкриває композер", async () => {
    renderBoard();

    await userEvent.click(screen.getByRole("button", { name: /Створити оголошення/ }));

    expect(await screen.findByText("композер оголошення")).toBeTruthy();
  });

  it("закриття композера вертає дошку, а не виводить з неї", async () => {
    renderBoard();
    await userEvent.click(screen.getByRole("button", { name: /Створити оголошення/ }));
    await screen.findByText("композер оголошення");

    await userEvent.click(screen.getByRole("button", { name: "закрити композер" }));

    await waitFor(() => expect(screen.queryByText("композер оголошення")).toBeNull());
    expect(screen.getByText(/Тут поки нічого немає/)).toBeTruthy();
  });
});
